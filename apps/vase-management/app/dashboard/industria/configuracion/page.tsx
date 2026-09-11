"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  CheckCircle2,
  FileKey2,
  ImagePlus,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
  UserPlus,
  Pencil,
  Power,
  Shield,
  XCircle,
  Eye,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { buildSettingsPayload, formatSettingsFieldErrors, type CompanySettingsForm } from "@/lib/company-settings";
import { ARCA_DOCUMENT_TYPES, ARCA_IVA_TYPES, ARCA_VOUCHER_TYPES, requiresAssociatedVoucher } from "@/modules/arca/vouchers";

type Settings = CompanySettingsForm & Record<string, any>;
function readPem(file: File, set: (value: string) => void) {
  const reader = new FileReader();
  reader.onload = () => set(String(reader.result ?? ""));
  reader.readAsText(file);
}

function ArcaPanel({
  form,
  set,
  save,
  status,
  reloadSettings,
  onStatus,
}: {
  form: Settings;
  set: (key: string, value: any) => void;
  save: (overrides?: Settings) => Promise<void>;
  status: string;
  reloadSettings: () => Promise<void>;
  onStatus: (message: string) => void;
}) {
  const certRef = useRef<HTMLInputElement>(null),
    keyRef = useRef<HTMLInputElement>(null),
    pkcs12Ref = useRef<HTMLInputElement>(null);
  const [arca, setArca] = useState<any>(null),
    [running, setRunning] = useState(""),
    [result, setResult] = useState<any>(null),
    [confirm, setConfirm] = useState<"certificate" | "key" | null>(null),
    [credentialMethod, setCredentialMethod] = useState<"MANUAL" | "PKCS12">("MANUAL"),
    [pkcs12File, setPkcs12File] = useState<File | null>(null),
    [pkcs12Password, setPkcs12Password] = useState(""),
    [pkcs12Status, setPkcs12Status] = useState(""),
    [testInvoiceOpen, setTestInvoiceOpen] = useState(false),
    [clearOpen, setClearOpen] = useState(false),
    [clearConfirmation, setClearConfirmation] = useState(""),
    [clearError, setClearError] = useState(""),
    [arcaParameters, setArcaParameters] = useState<any>({ data: ARCA_VOUCHER_TYPES, documents: ARCA_DOCUMENT_TYPES, ivaTypes: ARCA_IVA_TYPES, source: "FALLBACK" }),
    [testInvoice, setTestInvoice] = useState({
      voucherType: "FACTURA_A",
      clienteDocTipo: "CUIT",
      clienteDocCode: 80,
      clienteDocNumero: "",
      importeNeto: "",
      importeIva: "",
      importeTributos: "0",
      ivaId: 5,
      fecha: new Date().toISOString().slice(0, 10),
      associatedVoucherType: "FACTURA_A",
      associatedPuntoVenta: "",
      associatedNumero: "",
    });
  const refresh = () =>
    fetch("/api/industria/arca/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setArca(p?.data ?? null));
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (form.arcaCredentialSource === "PKCS12") setCredentialMethod("PKCS12");
  }, [form.arcaCredentialSource]);
  useEffect(() => {
    if (!testInvoiceOpen) return;
    fetch("/api/industria/arca/parameters/voucher-types")
      .then((response) => response.json())
      .then((payload) => payload?.data && setArcaParameters(payload))
      .catch(() => undefined);
  }, [testInvoiceOpen]);
  async function test(action: string) {
    setRunning(action);
    setResult(null);
    const response = await fetch(`/api/industria/arca/test/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puntoVenta: form.arcaPuntoVenta,
        voucherType: testInvoice.voucherType,
      }),
    });
    const payload = await response.json().catch(() => null);
    setResult({
      ok: response.ok,
      action,
      ...(response.ok
        ? payload.data
        : { error: payload?.error ?? "No se pudo completar la prueba." }),
    });
    setRunning("");
    refresh();
  }
  async function removeSecret(type: "certificate" | "key") {
    setConfirm(null);
    await save({
      [type === "certificate"
        ? "deleteArcaCertificate"
        : "deleteArcaPrivateKey"]: true,
    });
    await reloadSettings();
    refresh();
  }
  async function clearArcaConfiguration() {
    setClearError("");
    setRunning("clear");
    const response = await fetch("/api/industria/arca/configuration", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: clearConfirmation }) });
    const payload = await response.json().catch(() => null);
    setRunning("");
    if (!response.ok) return setClearError(payload?.error ?? "No se pudo borrar la configuración ARCA.");
    setClearOpen(false);
    setClearConfirmation("");
    await reloadSettings();
    refresh();
    onStatus(payload?.data?.message ?? "Configuración ARCA eliminada.");
  }
  async function submitTestInvoice() {
    setRunning("invoice");
    const net = Number(testInvoice.importeNeto),
      iva = Number(testInvoice.importeIva),
      tributos = Number(testInvoice.importeTributos || 0);
    const response = await fetch("/api/industria/arca/test/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...testInvoice,
        puntoVenta: form.arcaPuntoVenta,
        importeNeto: net,
        importeIva: iva,
        importeTributos: tributos,
        importeTotal: net + iva + tributos,
        moneda: "PES",
        cotizacionMoneda: 1,
        conceptos: "PRODUCTOS",
        associatedVoucher: requiresAssociatedVoucher(testInvoice.voucherType as any)
          ? { voucherType: testInvoice.associatedVoucherType, puntoVenta: Number(testInvoice.associatedPuntoVenta), numero: Number(testInvoice.associatedNumero) }
          : undefined,
      }),
    });
    const payload = await response.json().catch(() => null);
    setResult({
      ok: response.ok,
      action: "invoice",
      ...(response.ok
        ? payload.data
        : { error: payload?.error ?? "No se pudo emitir la prueba." }),
    });
    setRunning("");
    if (response.ok) setTestInvoiceOpen(false);
    refresh();
  }
  async function importPkcs12() {
    if (!pkcs12File) return setPkcs12Status("Seleccioná un archivo .pfx o .p12.");
    setRunning("pkcs12");
    setPkcs12Status("");
    const body = new FormData();
    body.set("file", pkcs12File);
    body.set("password", pkcs12Password);
    const response = await fetch("/api/industria/arca/credentials/import-pkcs12", { method: "POST", body });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      const certificate = payload.certificate;
      set("arcaCertificateConfigured", true);
      set("arcaPrivateKeyConfigured", true);
      set("arcaCredentialSource", "PKCS12");
      set("arcaCertificateSubject", certificate.subject);
      set("arcaCertificateIssuer", certificate.issuer);
      set("arcaCertificateSerial", certificate.serial);
      set("arcaCertificateValidFrom", certificate.validFrom);
      set("arcaCertificateValidTo", certificate.validTo);
      setPkcs12File(null);
      setPkcs12Password("");
      if (pkcs12Ref.current) pkcs12Ref.current.value = "";
      setPkcs12Status(payload.compatibilityUsed ? "Credenciales importadas correctamente. Certificado y clave privada verificados en modo de compatibilidad." : "Credenciales importadas correctamente. Certificado y clave privada verificados.");
      await reloadSettings();
      refresh();
    } else setPkcs12Status(payload?.error ?? "No se pudieron importar las credenciales.");
    setRunning("");
  }
  const certificateConfigured = Boolean(form.arcaCertificateConfigured),
    keyConfigured = Boolean(form.arcaPrivateKeyConfigured);
  return (
    <div className="grid max-w-5xl gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-vase-green" />
              <div>
                <p className="font-semibold">Conexión ARCA / AFIP</p>
                <p className="text-sm text-muted-foreground">
                  Configurá y verificá la integración fiscal en homologación.
                </p>
              </div>
            </div>
            <Badge
              variant={
                arca?.lastConnection?.status === "VERIFICADA"
                  ? "success"
                  : arca?.lastConnection?.status === "ERROR"
                    ? "danger"
                    : "warning"
              }
            >
              {arca?.lastConnection?.status === "VERIFICADA"
                ? "Conexión verificada"
                : arca?.lastConnection?.status === "ERROR"
                  ? "Error de conexión"
                  : certificateConfigured && keyConfigured
                    ? "Configurado"
                    : "No configurado"}
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Ambiente</Label>
              <Select
                value={form.arcaEnvironment ?? "HOMOLOGACION"}
                onChange={(e) => set("arcaEnvironment", e.target.value)}
              >
                <option value="HOMOLOGACION">Homologación (pruebas)</option>
                <option value="PRODUCCION">Producción — bloqueada</option>
              </Select>
              {form.arcaEnvironment === "PRODUCCION" && (
                <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  Producción emite comprobantes fiscales reales. Esta función
                  está bloqueada actualmente por Vase.
                </p>
              )}
            </div>
            <div>
              <Label>CUIT emisor ARCA</Label>
              <Input
                value={form.arcaCuit ?? ""}
                onChange={(e) => set("arcaCuit", e.target.value)}
                placeholder="20-12345678-9"
              />
            </div>
            <div>
              <Label>Punto de venta ARCA</Label>
              <Input
                type="number"
                value={form.arcaPuntoVenta ?? ""}
                onChange={(e) =>
                  set(
                    "arcaPuntoVenta",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>
            <div>
              <Label>Punto de venta por defecto</Label>
              <Input
                type="number"
                value={form.puntoVentaDefault ?? 1}
                onChange={(e) =>
                  set("puntoVentaDefault", Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="mt-6">
            <Label>Método de credenciales</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setCredentialMethod("MANUAL")} className={`min-h-16 rounded-xl border p-3 text-left transition-colors ${credentialMethod === "MANUAL" ? "border-vase-green bg-vase-green-soft" : "hover:bg-secondary"}`}>
                <span className="block text-sm font-semibold">Certificado + clave privada</span>
                <span className="mt-1 block text-xs text-muted-foreground">.crt/.pem + .key/.pem</span>
              </button>
              <button type="button" onClick={() => setCredentialMethod("PKCS12")} className={`min-h-16 rounded-xl border p-3 text-left transition-colors ${credentialMethod === "PKCS12" ? "border-vase-green bg-vase-green-soft" : "hover:bg-secondary"}`}>
                <span className="block text-sm font-semibold">Importar archivo PFX / P12</span>
                <span className="mt-1 block text-xs text-muted-foreground">Archivo PKCS#12 con contraseña opcional</span>
              </button>
            </div>
          </div>
          {credentialMethod === "MANUAL" ? <>
          <Credential
            title="Certificado X.509"
            configured={certificateConfigured}
            metadata={
              form.arcaCertificateSubject
                ? {
                    subject: form.arcaCertificateSubject,
                    issuer: form.arcaCertificateIssuer,
                    validFrom: form.arcaCertificateValidFrom,
                    validTo: form.arcaCertificateValidTo,
                  }
                : null
            }
            textarea={form.arcaCertificate ?? ""}
            placeholder="-----BEGIN CERTIFICATE-----"
            onChange={(v: string) => set("arcaCertificate", v)}
            onFile={() => certRef.current?.click()}
            onRemove={() => setConfirm("certificate")}
            inputRef={certRef}
            accept=".crt,.cer,.pem"
            onInput={(f: File) => readPem(f, (v) => set("arcaCertificate", v))}
          />
          <Credential
            title="Clave privada"
            configured={keyConfigured}
            textarea={form.arcaPrivateKey ?? ""}
            placeholder="-----BEGIN PRIVATE KEY-----"
            onChange={(v: string) => set("arcaPrivateKey", v)}
            onFile={() => keyRef.current?.click()}
            onRemove={() => setConfirm("key")}
            inputRef={keyRef}
            accept=".key,.pem"
            onInput={(f: File) => readPem(f, (v) => set("arcaPrivateKey", v))}
          />
          </> : <div className="mt-5 rounded-xl border p-4">
            <div className="flex items-start gap-3"><FileKey2 className="mt-0.5 h-5 w-5 text-vase-green" /><div><p className="font-medium">Archivo PKCS#12</p><p className="mt-1 text-xs text-muted-foreground">El archivo se procesa sólo en el servidor y no se almacena.</p></div></div>
            <input ref={pkcs12Ref} className="sr-only" type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(event) => setPkcs12File(event.target.files?.[0] ?? null)} />
            <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => pkcs12Ref.current?.click()}><Upload className="h-4 w-4" /> Seleccionar archivo</Button>{pkcs12File && <span className="text-sm text-muted-foreground">{pkcs12File.name}</span>}</div>
            <div className="mt-4"><Label>Contraseña del archivo <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input type="password" autoComplete="new-password" value={pkcs12Password} onChange={(event) => setPkcs12Password(event.target.value)} placeholder="Dejala vacía si el archivo no posee contraseña" /><p className="mt-2 text-xs text-muted-foreground">Si tu archivo PFX/P12 no tiene contraseña, dejá el campo vacío.</p></div>
            <div className="mt-4 flex items-center gap-3"><Button type="button" disabled={!pkcs12File || running === "pkcs12"} onClick={importPkcs12}>{running === "pkcs12" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{running === "pkcs12" ? "Importando y validando…" : "Importar y validar"}</Button>{pkcs12Status && <span className={pkcs12Status.includes("correctamente") ? "text-sm text-vase-green" : "text-sm text-red-600"}>{pkcs12Status}</span>}</div>
          </div>}
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Las credenciales se cifran en el servidor y no vuelven al navegador.
            No pegues ni compartas estos datos fuera de esta pantalla.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              onClick={async () => {
                await save();
                refresh();
              }}
            >
              <Save className="h-4 w-4" /> Guardar configuración ARCA
            </Button>
            <Button type="button" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300" onClick={() => { setClearError(""); setClearOpen(true); }}>
              <Trash2 className="h-4 w-4" /> Borrar configuración ARCA
            </Button>
            {status && (
              <span className="text-sm text-muted-foreground">{status}</span>
            )}
          </div>
        </Card>
        <ArcaCredentialFiles onChanged={async () => { await reloadSettings(); refresh(); }} />
        <Card className="p-5">
          <h2 className="font-semibold">Pruebas de conexión ARCA</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Las pruebas de conexión no emiten comprobantes.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <TestButton
              label="Validar credenciales"
              action="credentials"
              running={running}
              onClick={test}
            />
            <TestButton
              label="Probar autenticación WSAA"
              action="wsaa"
              running={running}
              onClick={test}
            />
            <TestButton
              label="Probar conexión WSFEv1"
              action="wsfe"
              running={running}
              onClick={test}
            />
            <TestButton
              label="Consultar último autorizado"
              action="last-voucher"
              running={running}
              onClick={test}
            />
          </div>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => test("full")}
            disabled={Boolean(running)}
          >
            {running === "full" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}{" "}
            Ejecutar diagnóstico completo
          </Button>
          {form.arcaEnvironment === "HOMOLOGACION" && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-medium">Prueba de emisión en homologación</p>
              <p className="mt-1 text-xs">
                Solicita un CAE de prueba. No tiene validez fiscal productiva.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => setTestInvoiceOpen(true)}
              >
                Abrir prueba de emisión
              </Button>
            </div>
          )}
          {result && (
            <div
              className={`mt-4 rounded-xl border p-4 text-sm ${result.ok ? "border-vase-green/30 bg-vase-green-soft/40" : "border-red-200 bg-red-50 text-red-700"}`}
            >
              <b>{result.ok ? "Prueba completada" : "La prueba falló"}</b>
              <p className="mt-1">
                {result.error ?? `${result.durationMs ?? 0} ms`}
              </p>
              {result.lastVoucher && (
                <p className="mt-2">
                  Último comprobante:{" "}
                  {result.lastVoucher.ultimoNumeroAutorizado} · Punto de venta{" "}
                  {result.lastVoucher.puntoVenta}
                </p>
              )}
              {result.voucher && (
                <p className="mt-2 font-medium">Comprobante solicitado: {result.voucher.code} — {result.voucher.label}</p>
              )}
              {result.numeroComprobante && (
                <p className="mt-1">Autorizado/rechazado como N.º {result.numeroComprobante}{result.cae ? ` · CAE ${result.cae}` : ""}.</p>
              )}
              {result.errores?.length > 0 && <ul className="mt-2 list-disc pl-5">{result.errores.map((error: any) => <li key={`${error.codigo}-${error.mensaje}`}>{error.codigo}: {error.mensaje}</li>)}</ul>}
            </div>
          )}
        </Card>
      </div>
      <div className="space-y-5">
        <ArcaHealthCard />
        <Card className="p-5">
          <h2 className="font-semibold">Estado de conexión</h2>
          <p className="mt-3 text-sm">
            <span
              className={
                arca?.lastConnection?.status === "VERIFICADA"
                  ? "text-vase-green"
                  : "text-amber-600"
              }
            >
              ●
            </span>{" "}
            {arca?.lastConnection?.status === "VERIFICADA"
              ? "Conexión verificada"
              : "Pendiente de verificar"}
          </p>
          {arca?.lastConnection?.at && (
            <p className="mt-2 text-xs text-muted-foreground">
              Última prueba: {formatDate(arca.lastConnection.at)}
            </p>
          )}
          <div className="mt-4 space-y-2 text-xs">
            {["Certificado", "Clave privada", "CUIT", "Punto de venta"].map(
              (item, index) => (
                <p key={item} className="flex items-center gap-2">
                  {(
                    index === 0
                      ? certificateConfigured
                      : index === 1
                        ? keyConfigured
                        : index === 2
                          ? Boolean(form.arcaCuit)
                          : Boolean(form.arcaPuntoVenta)
                  ) ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-vase-green" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {item}
                </p>
              ),
            )}
            {arca?.credentialSource && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <FileKey2 className="h-3.5 w-3.5 text-vase-green" />
                Origen: {arca.credentialSource === "PKCS12" ? "PFX/P12" : "Certificado + clave privada"}
              </p>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Últimas pruebas</h2>
          <div className="mt-3 space-y-3">
            {arca?.tests?.length ? (
              arca.tests.map((test: any) => (
                <div
                  key={test.id}
                  className="border-b pb-3 text-xs last:border-0"
                >
                  <div className="flex justify-between gap-2">
                    <b>{test.testType}</b>
                    <span
                      className={
                        test.status === "EXITOSA"
                          ? "text-vase-green"
                          : "text-red-600"
                      }
                    >
                      {test.status}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {test.user?.name ?? "Sistema"} · {test.durationMs ?? "—"} ms
                  </p>
                  <p className="mt-1 text-muted-foreground">{test.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay pruebas.
              </p>
            )}
          </div>
        </Card>
      </div>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm === "certificate"
            ? "¿Eliminar certificado?"
            : "¿Eliminar clave privada?"
        }
        description="La conexión ARCA dejará de funcionar hasta cargar una nueva credencial."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={() => removeSecret(confirm!)}>Eliminar</Button>
          </>
        }
      />
      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="¿Borrar toda la configuración ARCA?" description="Se eliminarán CUIT emisor, punto de venta ARCA, certificado, clave privada, PFX/P12 y tickets de acceso. No se eliminarán facturas, CAE ni auditoría." footer={<><Button variant="outline" onClick={() => setClearOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={running === "clear" || clearConfirmation !== "BORRAR ARCA"} onClick={clearArcaConfiguration}>{running === "clear" ? "Borrando…" : "Borrar configuración"}</Button></>}><Label>Escribí BORRAR ARCA para confirmar</Label><Input value={clearConfirmation} onChange={(event) => setClearConfirmation(event.target.value)} />{clearError && <p role="alert" className="mt-3 text-sm text-red-600">{clearError}</p>}</Modal>
      <Modal
        open={testInvoiceOpen}
        onClose={() => setTestInvoiceOpen(false)}
        title="Prueba de emisión en homologación"
        description="HOMOLOGACIÓN — SIN VALIDEZ FISCAL PRODUCTIVA"
        footer={
          <>
            <Button variant="outline" onClick={() => setTestInvoiceOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={running === "invoice"}
              onClick={submitTestInvoice}
            >
              {running === "invoice"
                ? "Solicitando CAE…"
                : "Solicitar CAE de prueba"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Punto de venta</Label>
            <Input value={form.arcaPuntoVenta ?? ""} disabled />
          </div>
          <div>
            <Label>Tipo comprobante</Label>
            <Select value={testInvoice.voucherType} onChange={(e) => setTestInvoice({ ...testInvoice, voucherType: e.target.value })}>
              {["A", "B", "C", "M", "FCE MiPyME"].map((group) => (
                <optgroup key={group} label={group}>
                  {(arcaParameters.data ?? ARCA_VOUCHER_TYPES).filter((item: any) => item.group === group).map((item: any) => <option key={item.key} value={item.key} disabled={!item.testEnabled}>{item.code} — {item.label}{item.testEnabled ? "" : " · Requiere FCE"}</option>)}
                </optgroup>
              ))}
            </Select>
            {arcaParameters.source === "FALLBACK" && <p className="mt-1 text-xs text-amber-700">Parámetros de respaldo; ARCA no respondió en este momento.</p>}
          </div>
          <div>
            <Label>Documento receptor</Label>
            <Select
              value={String(testInvoice.clienteDocCode)}
              onChange={(e) => { const doc = (arcaParameters.documents ?? ARCA_DOCUMENT_TYPES).find((item: any) => String(item.code) === e.target.value); setTestInvoice({ ...testInvoice, clienteDocTipo: doc?.label ?? e.target.value, clienteDocCode: Number(e.target.value) }); }}
            >
              {(arcaParameters.documents ?? ARCA_DOCUMENT_TYPES).map((item: any) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>CUIT/DNI receptor</Label>
            <Input
              value={testInvoice.clienteDocNumero}
              onChange={(e) =>
                setTestInvoice({
                  ...testInvoice,
                  clienteDocNumero: e.target.value,
                })
              }
            />
          </div>
          <div>
            <Label>Importe neto</Label>
            <Input
              type="number"
              value={testInvoice.importeNeto}
              onChange={(e) =>
                setTestInvoice({ ...testInvoice, importeNeto: e.target.value })
              }
            />
          </div>
          <div>
            <Label>IVA</Label>
            <Input
              type="number"
              value={testInvoice.importeIva}
              onChange={(e) =>
                setTestInvoice({ ...testInvoice, importeIva: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Alícuota IVA</Label>
            <Select value={String(testInvoice.ivaId ?? 5)} onChange={(e) => setTestInvoice({ ...testInvoice, ivaId: Number(e.target.value) })}>
              {(arcaParameters.ivaTypes ?? ARCA_IVA_TYPES).map((item: any) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Tributos</Label>
            <Input
              type="number"
              value={testInvoice.importeTributos}
              onChange={(e) =>
                setTestInvoice({
                  ...testInvoice,
                  importeTributos: e.target.value,
                })
              }
            />
          </div>
          {requiresAssociatedVoucher(testInvoice.voucherType as any) && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="mb-3 text-sm font-medium">Comprobante asociado obligatorio</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={testInvoice.associatedVoucherType} onChange={(e) => setTestInvoice({ ...testInvoice, associatedVoucherType: e.target.value })}>{(arcaParameters.data ?? ARCA_VOUCHER_TYPES).filter((item: any) => item.testEnabled && item.operation === "FACTURA").map((item: any) => <option key={item.key} value={item.key}>{item.code} — {item.label}</option>)}</Select>
              <Input type="number" placeholder="Punto de venta" value={testInvoice.associatedPuntoVenta} onChange={(e) => setTestInvoice({ ...testInvoice, associatedPuntoVenta: e.target.value })} />
              <Input type="number" placeholder="Número" value={testInvoice.associatedNumero} onChange={(e) => setTestInvoice({ ...testInvoice, associatedNumero: e.target.value })} />
            </div>
          </div>}
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={testInvoice.fecha}
              onChange={(e) =>
                setTestInvoice({ ...testInvoice, fecha: e.target.value })
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
function Credential({
  title,
  configured,
  metadata,
  textarea,
  placeholder,
  onChange,
  onFile,
  onRemove,
  inputRef,
  accept,
  onInput,
}: any) {
  return (
    <div className="mt-5 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          {configured ? (
            <div className="mt-1 text-xs text-vase-green">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
              Configurado
              {metadata?.validTo && (
                <> · Vence: {formatDate(metadata.validTo)}</>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Sin configurar</p>
          )}
          {metadata?.subject && (
            <p className="mt-2 max-w-xl text-xs text-muted-foreground">
              Titular: {metadata.subject}
              <br />
              Emisor: {metadata.issuer}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onFile}>
            <Upload className="h-3.5 w-3.5" /> Reemplazar
          </Button>
          {configured && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemove}
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onInput(e.target.files[0])}
      />
      <textarea
        value={textarea}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-3 min-h-24 w-full rounded-lg border bg-background p-3 font-mono text-xs"
      />
    </div>
  );
}
function TestButton({ label, action, running, onClick }: any) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={Boolean(running)}
      onClick={() => onClick(action)}
    >
      {running === action && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

function ArcaCredentialFiles({ onChanged }: { onChanged: () => Promise<void> }) {
  const [files, setFiles] = useState<any[]>([]), [selected, setSelected] = useState<any>(null), [removing, setRemoving] = useState<any>(null), [confirmation, setConfirmation] = useState(""), [error, setError] = useState("");
  const refresh = () => fetch("/api/industria/arca/credentials").then((response) => response.ok ? response.json() : { data: [] }).then((payload) => setFiles(payload.data ?? []));
  useEffect(() => { refresh(); }, []);
  async function remove() { const response = await fetch(`/api/industria/arca/credentials/${removing.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) }); const body = await response.json().catch(() => null); if (!response.ok) return setError(body?.error ?? "No se pudo eliminar."); setRemoving(null); setConfirmation(""); await onChanged(); refresh(); }
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Archivos y credenciales ARCA</h2><p className="mt-1 text-sm text-muted-foreground">Metadatos seguros del archivo original. El contenido y la clave privada nunca se muestran.</p></div><Badge>{files.filter((file) => file.active).length ? "Credencial activa" : "Sin archivo activo"}</Badge></div><div className="mt-4 space-y-2">{files.map((file) => <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.originalFileName}</p><p className="mt-0.5 text-xs text-muted-foreground">{file.fileType} · {(file.fileSize / 1024).toFixed(1)} KB · {file.environment} · {file.active ? "Activo" : "Histórico"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(file)}><Eye className="h-3.5 w-3.5" /> Detalles</Button><Button size="sm" variant="outline" onClick={() => { setError(""); setRemoving(file); }}><Trash2 className="h-3.5 w-3.5" /> Eliminar</Button></div></div>)}{!files.length && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Todavía no hay archivos PFX/P12 administrados.</p>}</div><Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.originalFileName ?? "Credencial"} description="Información de seguridad del archivo; no se exponen secretos."><dl className="grid gap-3 text-sm sm:grid-cols-2">{[["Tipo", selected?.fileType], ["Ambiente", selected?.environment], ["Tamaño", selected ? `${(selected.fileSize / 1024).toFixed(1)} KB` : ""], ["Importado por", selected?.uploadedBy?.name], ["Titular", selected?.certificateSubject], ["Emisor", selected?.certificateIssuer], ["Serie", selected?.certificateSerial], ["Huella SHA-256", selected?.fingerprintSha256], ["Vigente desde", selected?.certificateValidFrom ? formatDate(selected.certificateValidFrom) : "—"], ["Vence", selected?.certificateValidTo ? formatDate(selected.certificateValidTo) : "—"]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-medium">{value || "—"}</dd></div>)}</dl></Modal><Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title={`¿Eliminar ${removing?.originalFileName ?? "archivo"}?`} description={removing?.active ? "Esta es la credencial activa. La conexión con ARCA quedará sin configurar y se invalidarán los tickets de acceso." : "Se eliminará el archivo cifrado histórico; no se modifican facturas ni CAE."} footer={<><Button variant="outline" onClick={() => setRemoving(null)}>Cancelar</Button><Button disabled={removing?.active && confirmation !== "ELIMINAR"} onClick={remove}>Eliminar archivo</Button></>}>{removing?.active && <div><Label>Escribí ELIMINAR para confirmar</Label><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>}{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</Modal></Card>;
}

function ArcaHealthCard() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => { fetch("/api/industria/arca/health").then((response) => response.ok ? response.json() : null).then((payload) => setHealth(payload?.data ?? null)); }, []);
  const bad = ["POSIBLE_CAIDA_ARCA", "CONFIGURACION_INVALIDA", "PROBLEMA_LOCAL"].includes(health?.status);
  return <Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Monitor ARCA</h2><p className="mt-1 text-sm text-muted-foreground">Chequeos no invasivos de WSAA y WSFEv1.</p></div><Badge variant={bad ? "danger" : health?.status === "OPERATIVO" ? "success" : "warning"}>{health?.status?.replaceAll("_", " ") ?? "SIN CONFIGURAR"}</Badge></div><div className="mt-4 space-y-2 text-sm"><p>WSAA <span className="float-right font-medium">{health?.checks?.[0]?.wsaaStatus ?? "—"}</span></p><p>WSFEv1 <span className="float-right font-medium">{health?.checks?.[0]?.wsfeStatus ?? "—"}</span></p>{health?.checkedAt && <p className="pt-2 text-xs text-muted-foreground">Última verificación: {formatDate(health.checkedAt)}</p>}{health?.incident && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Posible indisponibilidad desde {formatDate(health.incident.startedAt)}. No se atribuye el origen de forma concluyente.</p>}</div></Card>;
}

function UserManagement({ users, roles, onRefresh }: { users: any[]; roles: any[]; onRefresh: () => void }) {
  const empty = { name: "", email: "", password: "", roleIds: [] as string[], active: true };
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<any>(null), [removing, setRemoving] = useState<any>(null), [saving, setSaving] = useState(false), [error, setError] = useState(""), [draft, setDraft] = useState(empty);
  const close = () => { setOpen(false); setEditing(null); setError(""); setDraft(empty); };
  const edit = (user: any) => { setEditing(user); setDraft({ name: user.name, email: user.email, password: "", roleIds: user.userRoles.map((entry: any) => entry.role.id), active: user.active }); setOpen(true); };
  async function submit() { setSaving(true); setError(""); const response = await fetch("/api/industria/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...draft, id: editing.id, password: draft.password || undefined } : draft) }); const body = await response.json().catch(() => null); setSaving(false); if (!response.ok) return setError(body?.error ?? "No se pudo guardar el usuario."); close(); onRefresh(); }
  async function remove() { if (!removing) return; setSaving(true); setError(""); const response = await fetch(`/api/industria/users/${removing.id}`, { method: "DELETE" }); const body = await response.json().catch(() => null); setSaving(false); if (!response.ok) return setError(body?.error ?? "No se pudo procesar el usuario."); setRemoving(null); onRefresh(); }
  const toggleRole = (id: string) => setDraft({ ...draft, roleIds: draft.roleIds.includes(id) ? draft.roleIds.filter((roleId) => roleId !== id) : [...draft.roleIds, id] });
  return <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Usuarios</h2><p className="text-sm text-muted-foreground">Roles acumulativos y acceso inmediato.</p></div><Button onClick={() => { setEditing(null); setDraft(empty); setOpen(true); }}><UserPlus className="h-4 w-4" /> Nuevo usuario</Button></div><Card className="divide-y">{users.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{user.name}</p>{user.isSuperAdmin && <Badge variant="warning"><Shield className="h-3.5 w-3.5" /> Cuenta protegida</Badge>}</div><p className="text-xs text-muted-foreground">{user.email}</p><div className="mt-2 flex flex-wrap gap-1">{user.userRoles?.map((entry: any) => <Badge key={entry.role.id}>{entry.role.name}</Badge>)}</div></div><div className="flex items-center gap-2"><Badge variant={user.active ? "success" : "neutral"}>{user.active ? "Activo" : "Inactivo"}</Badge>{user.isSuperAdmin ? <span title="La cuenta administrativa principal está protegida." className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground"><Shield className="h-4 w-4" /></span> : <><Button size="icon" variant="outline" aria-label={`Editar ${user.name}`} onClick={() => edit(user)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label={`${user.active ? "Desactivar" : "Activar"} ${user.name}`} onClick={() => { setEditing(user); setDraft({ name: user.name, email: user.email, password: "", roleIds: user.userRoles.map((entry: any) => entry.role.id), active: !user.active }); setOpen(true); }}><Power className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label={`Eliminar ${user.name}`} onClick={() => { setError(""); setRemoving(user); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}</div></div>)}{!users.length && <p className="p-8 text-center text-sm text-muted-foreground">No hay usuarios configurados.</p>}</Card><Modal open={open} onClose={close} title={editing ? "Editar usuario" : "Nuevo usuario"} description={editing ? "Actualizá datos, roles, estado o restablecé la contraseña." : "Asigná uno o varios roles operativos."} footer={<><Button variant="outline" onClick={close}>Cancelar</Button><Button disabled={saving} onClick={submit}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear usuario"}</Button></>}><div className="grid gap-4"><div><Label>Nombre completo</Label><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div><div><Label>Email</Label><Input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></div><div><Label>{editing ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</Label><Input type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></div><fieldset><legend className="mb-2 text-sm font-medium">Roles</legend><div className="grid gap-2 sm:grid-cols-2">{roles.filter((role) => role.active).map((role) => <label key={role.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={draft.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />{role.name}</label>)}</div></fieldset><label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Usuario activo</label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}</div></Modal><Modal open={Boolean(removing)} onClose={() => setRemoving(null)} title="Eliminar usuario" description={removing ? `Se revisará la actividad de ${removing.name} antes de eliminarlo.` : ""} footer={<><Button variant="outline" onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="destructive" disabled={saving} onClick={remove}>{saving ? "Procesando…" : "Eliminar usuario"}</Button></>}><p className="text-sm text-muted-foreground">Si tiene historial, se desactivará para conservar auditoría y producción. Si posee OT pendientes, primero deberás reasignarlas desde Producción.</p>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</Modal></>;
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState("empresa"),
    [form, setForm] = useState<Settings>({
      arcaEnvironment: "HOMOLOGACION",
      puntoVentaDefault: 1,
    }),
    [status, setStatus] = useState(""),
    [users, setUsers] = useState<any[]>([]),
    [roles, setRoles] = useState<any[]>([]);
  const reloadSettings = useCallback(async () => {
    const response = await fetch("/api/industria/company-settings", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return;
    // Reemplazamos el snapshot completo: un null del servidor debe borrar el
    // valor anterior del formulario, no quedar oculto por un merge local.
    setForm({ arcaEnvironment: "HOMOLOGACION", puntoVentaDefault: 1, ...(payload?.data ?? {}) });
  }, []);
  useEffect(() => {
    reloadSettings();
    fetch("/api/industria/users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers);
    fetch("/api/industria/roles")
      .then((r) => (r.ok ? r.json() : []))
      .then((p) => setRoles(Array.isArray(p) ? p : []));
  }, [reloadSettings]);
  const set = (key: string, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save(overrides: Settings = {}) {
    setStatus("Guardando…");
    const response = await fetch("/api/industria/company-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSettingsPayload(form, overrides)),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setForm({
        arcaEnvironment: "HOMOLOGACION",
        puntoVentaDefault: 1,
        ...(payload.data ?? {}),
        arcaCertificate: "",
        arcaPrivateKey: "",
        deleteArcaCertificate: false,
        deleteArcaPrivateKey: false,
      });
      setStatus("Configuración guardada correctamente.");
    } else setStatus([payload?.error ?? "No se pudo guardar.", formatSettingsFieldErrors(payload?.fields)].filter(Boolean).join(" "));
  }
  function chooseLogo(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logoData", String(reader.result));
    reader.readAsDataURL(file);
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Empresa, ARCA, usuarios, roles y permisos.
        </p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "empresa", label: "Empresa" },
          { value: "arca", label: "ARCA y facturación" },
          { value: "usuarios", label: "Usuarios" },
          { value: "roles", label: "Roles y permisos" },
        ]}
      />
      {tab === "empresa" && (
        <Card className="max-w-2xl p-5">
          <div className="flex items-center gap-3">
            <ImagePlus className="h-5 w-5 text-vase-green" />
            <div>
              <p className="font-semibold">Logo de la empresa</p>
              <p className="text-sm text-muted-foreground">
                Se utiliza en presupuestos, remitos y facturas.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4">
            {form.logoData ? (
              <img
                src={form.logoData}
                alt="Logo actual"
                className="h-20 w-32 object-contain"
              />
            ) : (
              <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                Sin logo
              </div>
            )}
            <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">
              Elegir imagen
              <input
                className="hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => chooseLogo(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Razón social</Label>
              <Input
                value={form.razonSocial ?? ""}
                onChange={(e) => set("razonSocial", e.target.value)}
              />
            </div>
            <div>
              <Label>CUIT de la empresa</Label>
              <Input
                value={form.cuit ?? ""}
                onChange={(e) => set("cuit", e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-5" onClick={save}>
            <Save className="h-4 w-4" /> Guardar empresa
          </Button>
          {status && (
            <p className="mt-3 text-sm text-muted-foreground">{status}</p>
          )}
        </Card>
      )}
      {tab === "arca" && (
        <ArcaPanel form={form} set={set} save={save} status={status} reloadSettings={reloadSettings} onStatus={setStatus} />
      )}{" "}
      {tab === "usuarios" && <UserManagement users={users} roles={roles} onRefresh={() => fetch("/api/industria/users").then((r) => r.ok ? r.json() : []).then(setUsers)} />}
      {tab === "roles" && (
        <Card className="divide-y">
          {roles.map((r) => (
            <div key={r.id} className="flex justify-between p-4">
              <span>
                <b>{r.name}</b>
                <small className="ml-2 text-muted-foreground">
                  {r.description}
                </small>
              </span>
              <Badge>{r.active ? "Activo" : "Inactivo"}</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
