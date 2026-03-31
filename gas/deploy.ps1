# gym GAS deploy script
# Usage: cd C:\dev\apps\gym\gas; .\deploy.ps1
# Usage with message: .\deploy.ps1 -m "변경 내용 설명"

param(
    [Alias("m")]
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$DeploymentId = "AKfycby9cBU92KAnTveGQWtALcbTmpExMKvSbtkvyC6vdWZttt8kEIEmxaTuTHan474rbzA3"

Write-Host "`n[1/2] clasp push..." -ForegroundColor Cyan
clasp push
if ($LASTEXITCODE -ne 0) {
    Write-Host "clasp push failed. Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "clasp push OK" -ForegroundColor Green

if (-not $Message) {
    $Message = "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "`n[2/2] clasp deploy -i $DeploymentId..." -ForegroundColor Cyan
clasp deploy -i $DeploymentId -d $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "clasp deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host "`nDeploy complete: $Message" -ForegroundColor Green
