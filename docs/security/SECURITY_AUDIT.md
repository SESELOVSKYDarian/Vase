# Vase Security Audit

Fecha: 2026-03-31
Referencia principal: OWASP ASVS como baseline de verificación, complementado con prácticas OWASP para CSRF, SSRF, XSS, uploads y gestión de secretos.

## 1. Threat Model

### Activos críticos
- Sesiones de usuarios y privilegios de plataforma.
- Aislamiento fuerte entre tenants.
- API keys y secretos de webhooks.
- Datos comerciales, tickets, conocimiento de IA y presupuestos.
- Integraciones externas y canales conectados.
- Archivos subidos y futuros assets privados.

### Actores de amenaza
- Usuario autenticado intentando acceder a datos de otro tenant.
- Atacante externo abusando de formularios, endpoints o credenciales filtradas.
- Integración externa comprometida usando API keys o webhooks.
- Actor interno con permisos excesivos o sesión robada.
- Proveedor externo o scraping malicioso intentando explotar SSRF.

### Superficies de ataque
- Login, reset, registro y sesiones.
- Server actions y route handlers protegidos.
- Endpoints REST multi-tenant.
- Configuración de webhooks e integraciones.
- Uploads y futuras rutas de storage.
- Scraping y fetch externos en VaseLabs.
- Panel admin y soporte.

## 2. Matriz de riesgos

| Riesgo | Impacto | Prioridad | Mitigación accionable |
|---|---|---|---|
| Acceso cruzado entre tenants | Crítico | P0 | Enforce central de tenant activo y autorización por membership en backend |
| CSRF en endpoints mutativos | Alto | P0 | Validación de origen confiable + comparación estricta con host/canonical origin |
| SSRF vía scraping o webhooks | Crítico | P0 | Rechazar hosts privados, localhost, credenciales embebidas y HTTP inseguro |
| Malware o archivo camuflado | Alto | P0 | Validar extensión, MIME, firma binaria y escaneo configurable |
| Abuso de login o acciones sensibles | Alto | P0 | Rate limiting persistido por scope/actor/IP |
| API keys filtradas o sobreprivilegiadas | Alto | P1 | Hash en DB, scopes mínimos, rotación, expiración, auditoría |
| Webhooks no firmados o replay | Alto | P1 | HMAC SHA-256 con timestamp y tolerancia temporal |
| Escalada a admin con sesión stale | Alto | P1 | Revalidar rol desde DB en callbacks JWT y exigir email verificado en roles privilegiados |
| XSS persistente | Alto | P1 | Sanitización server-side y CSP más dura |
| Secretos vencidos o inmóviles | Medio | P1 | Política de rotación y registro operativo |
| Falta de trazabilidad de eventos de seguridad | Medio | P1 | Security events sobre `AuditLog` |
| SQL injection | Medio | P2 | Prisma parametrizado + evitar SQL raw salvo wrappers auditados |

## 3. Hardening Checklist

### Identidad y sesiones
- `Done`: contraseñas nuevas endurecidas a 12+ caracteres con mayúscula, minúscula, número y símbolo.
- `Done`: revalidación de `platformRole`, `locale` y `emailVerified` desde DB en JWT callback.
- `Done`: `useSecureCookies` activado en producción.
- `Done`: roles privilegiados (`admin`, `support`) requieren email verificado.
- `Pending`: invalidación global de sesiones activas cuando se suspenda un usuario.
- `Pending`: MFA para `SUPER_ADMIN` y `SUPPORT`.

### Autorización y tenants
- `Done`: autorización por rol y tenant siempre en servidor.
- `Done`: corte centralizado para tenants suspendidos en guard de membership.
- `Pending`: bloqueo fino por usuario persistente.

### Red, headers y navegador
- `Done`: CSP reforzada, HSTS, COOP, CORP, frame denial y `nosniff`.
- `Done`: `Cache-Control: no-store` para paneles y APIs sensibles.
- `Pending`: CSP con nonce/hash para eliminar `unsafe-inline`.

### Input handling
- `Done`: validación Zod server-side.
- `Done`: sanitización de texto y builder document.
- `Done`: validación segura de URL externas para scraping y webhooks.
- `Pending`: validación semántica por dominio para datos comerciales reales.

### Uploads y storage
- `Done`: validación por extensión, MIME y firma binaria.
- `Done`: escaneo de malware configurable (`off`, `report_only`, `required`).
- `Done`: generación de `storageKey` seguro.
- `Pending`: storage privado real con KMS, cifrado y bucket policies.

### Integraciones y webhooks
- `Done`: API keys con hash, scopes, rate limit y auditoría.
- `Done`: firma HMAC reusable para webhooks con timestamp.
- `Done`: validación de destinos webhook para evitar SSRF.
- `Pending`: dispatcher real con reintentos, DLQ y replay protection persistente.

### Observabilidad y seguridad operacional
- `Done`: `security events` persistidos sobre auditoría.
- `Pending`: alertas automáticas sobre eventos críticos.
- `Pending`: dashboard de seguridad y correlación de eventos.

## 4. Cambios implementados en esta iteración

### Código
- Orígenes confiables centralizados y CSRF más estricto.
- Enforcements de tenant suspendido.
- Guards reforzados para `SUPER_ADMIN` y `SUPPORT`.
- CSP y headers de seguridad ampliados.
- Revalidación continua de privilegios de sesión.
- Hardening de uploads con firma binaria y escaneo configurable.
- Hardening SSRF para scraping y URLs de webhooks.
- Security events para rechazos importantes.
- Firma y verificación HMAC reusable para webhooks.

### Referencias de implementación
- `src/lib/security/csrf.ts`
- `src/lib/security/origin.ts`
- `src/lib/security/external-requests.ts`
- `src/lib/security/upload.ts`
- `src/lib/integrations/webhooks.ts`
- `src/server/services/security-events.ts`
- `src/lib/auth/guards.ts`
- `src/auth.ts`
- `src/app/(platform)/app/owner/labs/actions.ts`
- `src/app/(platform)/app/owner/integrations/api/actions.ts`
- `src/app/api/v1/integrations/[tenantSlug]/[resource]/route.ts`
- `src/app/api/v1/tenants/[tenantSlug]/projects/route.ts`

## 5. Ejemplos de código

### CSRF y trusted origins
```ts
assertSameOrigin(request);
```

### URL externa segura
```ts
const safeUrl = assertSafeExternalUrl(parsed.data.sourceUrl);
```

### Firma HMAC de webhook
```ts
const headers = buildWebhookHeaders({
  secret,
  body: JSON.stringify(payload),
  event: "orders.created",
  requestId,
});
```

### Verificación de firma de webhook
```ts
const isValid = verifyWebhookSignature({
  secret,
  body,
  timestamp,
  signatureHeader,
});
```

### Upload seguro con escaneo
```ts
const metadata = await validateUpload(file);
```

## 6. Siguientes pasos prioritarios

1. Conectar `UPLOAD_SCAN_MODE=required` a un servicio real de scanning o ClamAV.
2. Mover assets y archivos a storage privado con cifrado, firmas de acceso temporales y políticas por tenant.
3. Implementar dispatcher real de webhooks con firma, replay guard y observabilidad.
4. Añadir MFA y bloqueo fino por usuario para paneles privilegiados.
5. Incorporar tests de integración de seguridad sobre routes y server actions.
