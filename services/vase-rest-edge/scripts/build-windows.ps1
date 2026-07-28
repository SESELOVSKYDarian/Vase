param(
  [Parameter(Mandatory = $true)][string]$NodeExePath,
  [Parameter(Mandatory = $true)][string]$NodeSha256,
  [Parameter(Mandatory = $true)][string]$ProductVersion,
  [Parameter(Mandatory = $true)][string]$SigningThumbprint
)

$ErrorActionPreference = "Stop"
$serviceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$payloadDir = Join-Path $serviceRoot "dist\windows-payload"
$outputDir = Join-Path $serviceRoot "dist\installer"
$resolvedNode = (Resolve-Path $NodeExePath).Path
if ((Get-FileHash -LiteralPath $resolvedNode -Algorithm SHA256).Hash -ne $NodeSha256.ToUpperInvariant()) {
  throw "NODE_RUNTIME_HASH_MISMATCH"
}
if (Test-Path -LiteralPath $payloadDir) {
  Remove-Item -LiteralPath $payloadDir -Recurse -Force
}
New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Copy-Item -LiteralPath $resolvedNode -Destination (Join-Path $payloadDir "node.exe")
Copy-Item -LiteralPath (Join-Path $serviceRoot "package.json") -Destination $payloadDir
Copy-Item -LiteralPath (Join-Path $serviceRoot "src") -Destination $payloadDir -Recurse

Push-Location $payloadDir
try {
  npm install --omit=dev --ignore-scripts --no-audit
} finally {
  Pop-Location
}

$msiPath = Join-Path $outputDir "VaseRestEdge-$ProductVersion-x64.msi"
wix build (Join-Path $serviceRoot "installer\Product.wxs") `
  -arch x64 `
  -ext WixToolset.Util.wixext `
  -ext WixToolset.Firewall.wixext `
  -d "PayloadDir=$payloadDir" `
  -d "ProductVersion=$ProductVersion" `
  -o $msiPath
if ($LASTEXITCODE -ne 0) { throw "WIX_BUILD_FAILED" }

$certificate = Get-ChildItem "Cert:\LocalMachine\My\$SigningThumbprint" -ErrorAction Stop
Set-AuthenticodeSignature -FilePath $msiPath -Certificate $certificate -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com" | Out-Null
$signature = Get-AuthenticodeSignature -FilePath $msiPath
if ($signature.Status -ne "Valid") { throw "MSI_SIGNATURE_INVALID: $($signature.Status)" }
Write-Output $msiPath

