import { createConnection } from "node:net";
import type { PrinterAdapter } from "./printer-adapter.js";

export class NetworkPrinter implements PrinterAdapter {
  constructor(private readonly input: {
    host: string;
    port?: number;
    timeoutMs?: number;
  }) {}

  async send(payload: Buffer) {
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({
        host: this.input.host,
        port: this.input.port ?? 9100,
      });
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("PRINTER_NETWORK_TIMEOUT"));
      }, this.input.timeoutMs ?? 5_000);
      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`PRINTER_NETWORK_ERROR:${error.message}`));
      });
      socket.once("connect", () => {
        socket.end(payload);
      });
      socket.once("close", (hadError) => {
        clearTimeout(timeout);
        if (!hadError) resolve();
      });
    });
  }
}

