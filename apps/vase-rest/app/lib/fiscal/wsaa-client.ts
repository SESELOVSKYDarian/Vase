import { XMLParser } from "fast-xml-parser";

function escapeXml(value: string | number) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[character]!);
}

export function buildLoginTicketRequest(input: {
  uniqueId: number;
  generatedAt: Date;
  expiresAt: Date;
  service: string;
}) {
  if (input.expiresAt <= input.generatedAt) throw new Error("REST_ARCA_TRA_WINDOW_INVALID");
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0"><header><uniqueId>${input.uniqueId}</uniqueId><generationTime>${input.generatedAt.toISOString()}</generationTime><expirationTime>${input.expiresAt.toISOString()}</expirationTime></header><service>${escapeXml(input.service)}</service></loginTicketRequest>`;
}

export function parseLoginCmsResponse(xml: string) {
  const parsed = new XMLParser({ removeNSPrefix: true }).parse(xml);
  const response = parsed.loginTicketResponse;
  const token = response?.credentials?.token;
  const sign = response?.credentials?.sign;
  const expiration = response?.header?.expirationTime;
  if (!token || !sign || !expiration) throw new Error("REST_ARCA_WSAA_RESPONSE_INVALID");
  const expiresAt = new Date(expiration);
  if (Number.isNaN(expiresAt.getTime())) throw new Error("REST_ARCA_WSAA_RESPONSE_INVALID");
  return { token: String(token), sign: String(sign), expiresAt };
}

export function createWsaaClient(input: {
  endpoint: string;
  signer(tra: string): Promise<string>;
  fetcher?: typeof fetch;
  now?: () => Date;
}) {
  return {
    async login(service: string) {
      const now = input.now?.() ?? new Date();
      const tra = buildLoginTicketRequest({
        uniqueId: Math.floor(now.getTime() / 1_000),
        generatedAt: new Date(now.getTime() - 5 * 60_000),
        expiresAt: new Date(now.getTime() + 5 * 60_000),
        service,
      });
      const cms = await input.signer(tra);
      let response: Response;
      try {
        response = await (input.fetcher ?? fetch)(input.endpoint, {
          method: "POST",
          headers: {
            "content-type": "text/xml; charset=utf-8",
            SOAPAction: '""',
          },
          body: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><loginCms xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov"><in0>${cms}</in0></loginCms></soapenv:Body></soapenv:Envelope>`,
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw new Error("REST_ARCA_WSAA_UNAVAILABLE");
      }
      const text = await response.text();
      if (!response.ok) throw new Error(`REST_ARCA_WSAA_HTTP_ERROR:${response.status}`);
      const parsed = new XMLParser({ removeNSPrefix: true }).parse(text);
      const ticket = parsed.Envelope?.Body?.loginCmsResponse?.loginCmsReturn;
      if (typeof ticket !== "string") throw new Error("REST_ARCA_WSAA_RESPONSE_INVALID");
      return parseLoginCmsResponse(ticket);
    },
  };
}
