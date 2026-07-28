import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PrinterAdapter } from "./printer-adapter.js";

const execute = promisify(execFile);

const rawPrintScript = String.raw`
param([string]$PrinterName, [string]$PayloadBase64)
$source = @'
using System;
using System.Runtime.InteropServices;
public static class VaseRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO { [MarshalAs(UnmanagedType.LPWStr)] public string pDocName = "Vase Rest"; [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile = null; [MarshalAs(UnmanagedType.LPWStr)] public string pDataType = "RAW"; }
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)] public static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int StartDocPrinter(IntPtr handle, int level, [In] DOCINFO info);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr handle, byte[] bytes, int count, out int written);
  public static void Send(string printer, byte[] bytes) {
    IntPtr handle;
    if (!OpenPrinter(printer, out handle, IntPtr.Zero)) throw new System.ComponentModel.Win32Exception();
    try {
      if (StartDocPrinter(handle, 1, new DOCINFO()) == 0) throw new System.ComponentModel.Win32Exception();
      try {
        if (!StartPagePrinter(handle)) throw new System.ComponentModel.Win32Exception();
        try { int written; if (!WritePrinter(handle, bytes, bytes.Length, out written) || written != bytes.Length) throw new System.ComponentModel.Win32Exception(); }
        finally { EndPagePrinter(handle); }
      } finally { EndDocPrinter(handle); }
    } finally { ClosePrinter(handle); }
  }
}
'@
Add-Type -TypeDefinition $source
[VaseRawPrinter]::Send($PrinterName, [Convert]::FromBase64String($PayloadBase64))
`;

export class WindowsSpoolerPrinter implements PrinterAdapter {
  constructor(private readonly input: {
    printerName: string;
    timeoutMs?: number;
  }) {}

  async send(payload: Buffer) {
    if (process.platform !== "win32") throw new Error("PRINTER_WINDOWS_REQUIRED");
    try {
      await execute("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        rawPrintScript,
        "-PrinterName",
        this.input.printerName,
        "-PayloadBase64",
        payload.toString("base64"),
      ], {
        timeout: this.input.timeoutMs ?? 10_000,
        windowsHide: true,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "UNKNOWN";
      throw new Error(`PRINTER_WINDOWS_SPOOLER_ERROR:${message}`);
    }
  }
}

