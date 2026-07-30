import { afterEach, describe, expect, it, vi } from "vitest";
import { sendContactEmail } from "@/server/services/contact-email";

describe("Contact email delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_TO_EMAIL;
  });

  it("includes company and phone in the delivered inquiry", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.CONTACT_TO_EMAIL = "ventas@vase.ar";
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetcher);

    await sendContactEmail({
      fullName: "Alexis Vallejos",
      company: "Sanitarios El Teflon",
      email: "alexis@example.com",
      phone: "+54 9 223 449-6403",
      message: "Quiero conocer que solucion de Vase corresponde a mi empresa.",
    });

    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { text: string };

    expect(body.text).toContain("Empresa: Sanitarios El Teflon");
    expect(body.text).toContain("Telefono: +54 9 223 449-6403");
  });
});
