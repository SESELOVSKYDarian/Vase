export type PrinterAdapter = {
  send(payload: Buffer): Promise<void>;
};

export type PrinterConnection =
  | { type: "NETWORK"; host: string; port?: number; timeoutMs?: number }
  | { type: "WINDOWS_SPOOLER"; printerName: string; timeoutMs?: number };

