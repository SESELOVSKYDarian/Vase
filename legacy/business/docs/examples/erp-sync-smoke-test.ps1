$baseUrl = "https://proyecto-teflon.onrender.com"
$tenantId = "636736e2-e135-44cd-ac5c-5d4ccb839a73"
$token = "erp-sync-local-001"

$headers = @{
  "x-api-key"   = $token
  "x-tenant-id" = $tenantId
  "Content-Type" = "application/json"
}

$ping = Invoke-RestMethod `
  -Method Get `
  -Uri "$baseUrl/api/v1/integrations/ping" `
  -Headers $headers

$payload = @{
  source_system = "gestion-prueba"
  items = @(
    @{
      external_id = "ERP-TEST-1001"
      sku = "ERP-TEST-1001"
      name = "Producto prueba integracion"
      price_retail = 18990
      price_wholesale = 16990
      stock = 12
      is_active = $true
      brand = "Marca Sync"
      description = "Producto enviado desde prueba del sistema de gestion."
      category = "Sanitarios"
    }
  )
} | ConvertTo-Json -Depth 10

$sync = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/api/v1/integrations/products/sync" `
  -Headers $headers `
  -Body $payload

"PING"
$ping | ConvertTo-Json -Depth 10

"SYNC"
$sync | ConvertTo-Json -Depth 10
