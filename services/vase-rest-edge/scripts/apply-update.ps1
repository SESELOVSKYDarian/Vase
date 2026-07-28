param(
  [Parameter(Mandatory = $true)][string]$MsiPath,
  [Parameter(Mandatory = $true)][string]$LogPath
)

$ErrorActionPreference = "Stop"
$resolvedMsi = (Resolve-Path -LiteralPath $MsiPath).Path
$resolvedLogParent = Split-Path -Parent $LogPath
if (-not (Test-Path -LiteralPath $resolvedLogParent)) {
  New-Item -ItemType Directory -Path $resolvedLogParent -Force | Out-Null
}

$signature = Get-AuthenticodeSignature -LiteralPath $resolvedMsi
if ($signature.Status -ne "Valid") {
  throw "EDGE_UPDATE_AUTHENTICODE_INVALID: $($signature.Status)"
}

$process = Start-Process -FilePath "msiexec.exe" `
  -ArgumentList @("/i", "`"$resolvedMsi`"", "/qn", "/norestart", "/l*v", "`"$LogPath`"") `
  -Wait `
  -PassThru `
  -WindowStyle Hidden

if ($process.ExitCode -notin @(0, 3010, 1641)) {
  throw "EDGE_UPDATE_MSI_FAILED: $($process.ExitCode)"
}
