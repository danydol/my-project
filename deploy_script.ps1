# PowerShell Deployment Script
# Extract artifact to timestamped directory

$ZipPath = "\\10.11.56.10\temp\CD\artifact.zip"
$BaseExtractPath = "C:\inetpub\wwwroot\BikRofeGeneralServer\BikRofeGeneralServer"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$ExtractPath = Join-Path $BaseExtractPath "release_${timestamp}_active"

# Create the directory
New-Item -ItemType Directory -Path $ExtractPath -Force | Out-Null

# Extract the archive
Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force

Write-Host "Deployment completed successfully to: $ExtractPath" 