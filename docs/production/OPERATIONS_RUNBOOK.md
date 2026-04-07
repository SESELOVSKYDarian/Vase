# Vase Operations Runbook

## Entornos
- `dev`: desarrollo local, datos descartables, `UPLOAD_SCAN_MODE=off|report_only`.
- `staging`: réplica funcional previa a producción, base y secretos propios.
- `prod`: tráfico real, observabilidad completa, backups verificados y cambios controlados.

## Deploy seguro
1. Ejecutar CI completo.
2. Aplicar `prisma migrate deploy` sobre staging.
3. Ejecutar smoke de health y e2e.
4. Aprobar release.
5. Aplicar migraciones en prod.
6. Desplegar app.
7. Verificar `/api/health/live`, `/api/health/ready` y `/api/ops/metrics`.

## Migraciones seguras
- Expand/contract para cambios destructivos.
- Evitar renames destructivos en un solo paso.
- Medir tiempo y locks sobre staging antes de prod.
- Tomar backup antes de migraciones críticas.

## Backups
- PostgreSQL: snapshot diario + point-in-time recovery.
- Retención recomendada:
  - diarios: 14 días
  - semanales: 8 semanas
  - mensuales: 12 meses
- Restauración ensayada al menos una vez por trimestre.

## Rollback
- App: redeploy de imagen/tag previo.
- DB:
  - preferir roll-forward correctivo cuando la migración ya alteró datos
  - rollback directo solo si la migración fue explícitamente reversible
- Configuración: versionar secretos y variables por entorno.

## Monitoreo
- Health checks:
  - `/api/health/live`
  - `/api/health/ready`
- Métricas operativas:
  - `/api/ops/metrics` con `MONITORING_TOKEN`
- Logs estructurados:
  - eventos de auditoría
  - eventos de seguridad
  - probes de salud

## Alertas recomendadas
- Readiness `503` por más de 3 minutos.
- Error rate > 2% en APIs críticas.
- Tickets abiertos por encima del umbral operativo.
- Aumento abrupto de eventos `security.*`.
- DB latency o saturation por encima de SLO.

## SLO inicial sugerido
- Disponibilidad pública: 99.9%
- APIs críticas: p95 < 400ms
- Admin panel: p95 < 800ms
- Ready probe recovery < 5 minutos
