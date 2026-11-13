"use client";

import { useEffect, useRef, useState } from "react";

const SDK_URL = "https://sdk.mercadopago.com/js/v2";

type SecureField = { mount: (id: string) => SecureField; unmount: () => void };

export type MercadoPagoClient = {
  fields: {
    create: (type: "cardNumber" | "expirationDate" | "securityCode", options?: { placeholder?: string }) => SecureField;
    createCardToken: (data: Record<string, string>) => Promise<{ id: string }>;
  };
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoClient;
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk() {
  if (window.MercadoPago) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("MERCADOPAGO_SDK_FAILED"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** Carga el SDK y monta los campos seguros: el número y el código nunca pasan por Vase. */
export function useSecureFields(
  publicKey: string,
  fields: ReadonlyArray<{ type: "cardNumber" | "expirationDate" | "securityCode"; elementId: string; placeholder?: string }>,
  enabled: boolean,
) {
  const clientRef = useRef<MercadoPagoClient | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const signature = fields.map((field) => field.elementId).join("|");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const mounted: SecureField[] = [];

    loadSdk()
      .then(() => {
        if (cancelled || !window.MercadoPago) return;
        const client = new window.MercadoPago(publicKey, { locale: "es-AR" });
        clientRef.current = client;
        for (const field of fields) {
          mounted.push(client.fields.create(field.type, { placeholder: field.placeholder }).mount(field.elementId));
        }
        setReady(true);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      setReady(false);
      for (const field of mounted) field.unmount();
    };
    // `fields` se compara por los ids de sus elementos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, enabled, signature]);

  return { clientRef, ready, failed };
}
