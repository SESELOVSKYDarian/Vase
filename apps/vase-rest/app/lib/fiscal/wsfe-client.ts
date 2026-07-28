import { XMLParser } from "fast-xml-parser";
import type {
  ArcaAuthorizationResult,
  ArcaCredentials,
  ArcaObservation,
} from "./arca-types";

function xml(value: string | number) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[character]!);
}

function envelope(body: string) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${body}</soap:Body></soap:Envelope>`;
}

function auth(value: ArcaCredentials) {
  return `<Auth><Token>${xml(value.token)}</Token><Sign>${xml(value.sign)}</Sign><Cuit>${xml(value.cuit)}</Cuit></Auth>`;
}

function observations(value: unknown): ArcaObservation[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((item: any) => ({
    code: Number(item.Code ?? item.Code),
    message: String(item.Msg ?? ""),
  }));
}

export function createWsfeClient(input: {
  endpoint: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;
  async function call(operation: string, body: string) {
    let response: Response;
    try {
      response = await fetcher(input.endpoint, {
        method: "POST",
        headers: {
          "content-type": "text/xml; charset=utf-8",
          SOAPAction: `"http://ar.gov.afip.dif.FEV1/${operation}"`,
        },
        body: envelope(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new Error("REST_ARCA_RESPONSE_AMBIGUOUS");
    }
    const text = await response.text();
    if (!response.ok) throw new Error(`REST_ARCA_HTTP_ERROR:${response.status}`);
    const parsed = new XMLParser({ removeNSPrefix: true }).parse(text);
    const soapBody = parsed.Envelope?.Body;
    if (soapBody?.Fault) throw new Error("REST_ARCA_SOAP_FAULT");
    return soapBody;
  }
  return {
    async lastAuthorized(params: {
      token: string;
      sign: string;
      cuit: string;
      pointOfSale: number;
      voucherType: number;
    }) {
      const body = await call(
        "FECompUltimoAutorizado",
        `<FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">${auth(params)}<PtoVta>${params.pointOfSale}</PtoVta><CbteTipo>${params.voucherType}</CbteTipo></FECompUltimoAutorizado>`,
      );
      const result = body.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;
      if (result?.Errors?.Err) throw new Error("REST_ARCA_LAST_NUMBER_REJECTED");
      const number = Number(result?.CbteNro);
      if (!Number.isInteger(number) || number < 0) throw new Error("REST_ARCA_RESPONSE_INVALID");
      return number;
    },
    async authorize(params: {
      auth: ArcaCredentials;
      pointOfSale: number;
      voucherType: number;
      voucherNumber: number;
      concept: number;
      documentType: number;
      documentNumber: string;
      date: string;
      total: string;
      net: string;
      vat: string;
      exempt: string;
      untaxed: string;
      currency: string;
      currencyRate: string;
      vatLines: Array<{ id: number; base: string; amount: string }>;
    }): Promise<ArcaAuthorizationResult> {
      const detail = `<FECAEDetRequest><Concepto>${params.concept}</Concepto><DocTipo>${params.documentType}</DocTipo><DocNro>${xml(params.documentNumber)}</DocNro><CbteDesde>${params.voucherNumber}</CbteDesde><CbteHasta>${params.voucherNumber}</CbteHasta><CbteFch>${params.date}</CbteFch><ImpTotal>${params.total}</ImpTotal><ImpTotConc>${params.untaxed}</ImpTotConc><ImpNeto>${params.net}</ImpNeto><ImpOpEx>${params.exempt}</ImpOpEx><ImpTrib>0.00</ImpTrib><ImpIVA>${params.vat}</ImpIVA><MonId>${xml(params.currency)}</MonId><MonCotiz>${params.currencyRate}</MonCotiz>${params.vatLines.length ? `<Iva>${params.vatLines.map((line) => `<AlicIva><Id>${line.id}</Id><BaseImp>${line.base}</BaseImp><Importe>${line.amount}</Importe></AlicIva>`).join("")}</Iva>` : ""}</FECAEDetRequest>`;
      const body = await call(
        "FECAESolicitar",
        `<FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">${auth(params.auth)}<FeCAEReq><FeCabReq><CantReg>1</CantReg><PtoVta>${params.pointOfSale}</PtoVta><CbteTipo>${params.voucherType}</CbteTipo></FeCabReq><FeDetReq>${detail}</FeDetReq></FeCAEReq></FECAESolicitar>`,
      );
      const result = body.FECAESolicitarResponse?.FECAESolicitarResult;
      const response = result?.FeDetResp?.FECAEDetResponse;
      if (!response) throw new Error("REST_ARCA_RESPONSE_INVALID");
      const authorized = String(response.Resultado) === "A";
      return {
        result: authorized ? "A" : "R",
        voucherNumber: Number(response.CbteDesde),
        ...(authorized && response.CAE ? {
          cae: String(response.CAE),
          caeExpiresAt: String(response.CAEFchVto),
        } : {}),
        observations: [
          ...observations(response.Observaciones?.Obs),
          ...observations(result.Errors?.Err),
        ],
      };
    },
    async consult(params: {
      auth: ArcaCredentials;
      pointOfSale: number;
      voucherType: number;
      voucherNumber: number;
    }): Promise<ArcaAuthorizationResult | null> {
      const body = await call(
        "FECompConsultar",
        `<FECompConsultar xmlns="http://ar.gov.afip.dif.FEV1/">${auth(params.auth)}<FeCompConsReq><CbteTipo>${params.voucherType}</CbteTipo><CbteNro>${params.voucherNumber}</CbteNro><PtoVta>${params.pointOfSale}</PtoVta></FeCompConsReq></FECompConsultar>`,
      );
      const result = body.FECompConsultarResponse?.FECompConsultarResult;
      const response = result?.ResultGet;
      if (!response) {
        if (result?.Errors?.Err) return null;
        throw new Error("REST_ARCA_RESPONSE_INVALID");
      }
      const authorized = String(response.Resultado) === "A" &&
        Boolean(response.CodAutorizacion);
      return {
        result: authorized ? "A" : "R",
        voucherNumber: Number(response.CbteDesde ?? params.voucherNumber),
        ...(authorized ? {
          cae: String(response.CodAutorizacion),
          caeExpiresAt: String(response.FchVto),
        } : {}),
        observations: observations(response.Observaciones?.Obs),
      };
    },
  };
}
