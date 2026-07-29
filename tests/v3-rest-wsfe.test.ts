import { describe, expect, it } from "vitest";
import { createWsfeClient } from "../apps/vase-rest/app/lib/fiscal/wsfe-client";

describe("ARCA WSFEv1", () => {
  it("queries the last authorized voucher before issuing the next number", async () => {
    const requests: string[] = [];
    const client = createWsfeClient({
      endpoint: "https://wswhomo.afip.gob.ar/wsfev1/service.asmx",
      fetcher: async (_url, init) => {
        requests.push(String(init?.body));
        return new Response(`<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body><FECompUltimoAutorizadoResponse xmlns="http://ar.gov.afip.dif.FEV1/">
            <FECompUltimoAutorizadoResult><PtoVta>3</PtoVta><CbteTipo>6</CbteTipo><CbteNro>149</CbteNro></FECompUltimoAutorizadoResult>
          </FECompUltimoAutorizadoResponse></soap:Body></soap:Envelope>`);
      },
    });
    await expect(client.lastAuthorized({
      token: "token", sign: "sign", cuit: "30712345678",
      pointOfSale: 3, voucherType: 6,
    })).resolves.toBe(149);
    expect(requests[0]).toContain("<FECompUltimoAutorizado");
    expect(requests[0]).toContain("<Cuit>30712345678</Cuit>");
  });

  it("returns CAE only from an accepted FECAESolicitar response", async () => {
    const client = createWsfeClient({
      endpoint: "https://wswhomo.afip.gob.ar/wsfev1/service.asmx",
      fetcher: async () => new Response(`<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body><FECAESolicitarResponse xmlns="http://ar.gov.afip.dif.FEV1/">
          <FECAESolicitarResult><FeDetResp><FECAEDetResponse>
            <Concepto>1</Concepto><DocTipo>99</DocTipo><DocNro>0</DocNro>
            <CbteDesde>150</CbteDesde><CbteHasta>150</CbteHasta>
            <Resultado>A</Resultado><CAE>74123456789012</CAE><CAEFchVto>20260807</CAEFchVto>
          </FECAEDetResponse></FeDetResp></FECAESolicitarResult>
        </FECAESolicitarResponse></soap:Body></soap:Envelope>`),
    });
    await expect(client.authorize({
      auth: { token: "token", sign: "sign", cuit: "30712345678" },
      pointOfSale: 3,
      voucherType: 6,
      voucherNumber: 150,
      concept: 1,
      documentType: 99,
      documentNumber: "0",
      date: "20260728",
      total: "1210.00",
      net: "1000.00",
      vat: "210.00",
      exempt: "0.00",
      untaxed: "0.00",
      currency: "PES",
      currencyRate: "1.000000",
      vatLines: [{ id: 5, base: "1000.00", amount: "210.00" }],
    })).resolves.toMatchObject({
      result: "A",
      cae: "74123456789012",
      caeExpiresAt: "20260807",
      voucherNumber: 150,
    });
  });

  it("recovers an authorized voucher with FECompConsultar after an ambiguous timeout", async () => {
    const client = createWsfeClient({
      endpoint: "https://wswhomo.afip.gob.ar/wsfev1/service.asmx",
      fetcher: async () => new Response(`<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
        <FECompConsultarResponse xmlns="http://ar.gov.afip.dif.FEV1/"><FECompConsultarResult><ResultGet>
          <CbteDesde>150</CbteDesde><Resultado>A</Resultado><CodAutorizacion>74123456789012</CodAutorizacion><FchVto>20260807</FchVto>
        </ResultGet></FECompConsultarResult></FECompConsultarResponse>
      </soap:Body></soap:Envelope>`),
    });
    await expect(client.consult({
      auth: { token: "token", sign: "sign", cuit: "30712345678" },
      pointOfSale: 3, voucherType: 6, voucherNumber: 150,
    })).resolves.toMatchObject({
      result: "A", voucherNumber: 150, cae: "74123456789012",
    });
  });
});
