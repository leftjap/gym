# gym GAS deploy script
# Usage: cd C:\dev\apps\gym\gas; .\deploy.ps1
# Usage with message: .\deploy.ps1 -m "변경 내용 설명"

param(
    [Alias("m")]
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$DeploymentId = "AKfycby9cBU92KAnTveGQWtALcbTmpExMKvSbtkvyC6vdWZttt8kEIEmxaTuTHan474rbzA3"
$GasUrl = "https://script.google.com/macros/s/$DeploymentId/exec"

Write-Host "`n[1/3] clasp push..." -ForegroundColor Cyan
clasp push
if ($LASTEXITCODE -ne 0) {
    Write-Host "clasp push failed. Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "clasp push OK" -ForegroundColor Green

if (-not $Message) {
    $Message = "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "`n[2/3] clasp deploy -i $DeploymentId..." -ForegroundColor Cyan
clasp deploy -i $DeploymentId -d $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "clasp deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host "clasp deploy OK" -ForegroundColor Green

Write-Host "`n[3/3] Smoke test (GET $GasUrl)..." -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri $GasUrl -Method GET -TimeoutSec 15 -UseBasicParsing
    $json = $resp.Content | ConvertFrom-Json
    if ($json.status -eq "ok") {
        Write-Host "Smoke test OK: $($json.message)" -ForegroundColor Green
    } else {
        Write-Host "Smoke test FAILED: unexpected status '$($json.status)'" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Smoke test FAILED: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeploy complete: $Message" -ForegroundColor Green
