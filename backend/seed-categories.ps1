# Script one-shot pour créer les catégories du catalogue.
# Usage : dans le dossier backend, lancer  powershell -ExecutionPolicy Bypass -File seed-categories.ps1

$env:ADMIN_TOKEN = (curl.exe -s -X POST "http://localhost:8080/realms/brocaramilou/protocol/openid-connect/token" `
  -d "client_id=backend" -d "client_secret=IVbHTTPUdHdwNAVPcmzuaRQ66ypB7evC" `
  -d "grant_type=password" -d "username=testadmin" -d "password=test1234" | ConvertFrom-Json).access_token

$categories = @(
  "Restauration",
  "Salons de thé & Cafés",
  "Pâtisserie & Boulangerie",
  "Emballages alimentaires",
  "Mariages, Fêtes & Soutenances",
  "Cadeaux & Idées originales"
)

$tempFile = Join-Path $env:TEMP "categorie.json"

foreach ($nom in $categories) {
  @{ nom = $nom } | ConvertTo-Json | Out-File -Encoding utf8 $tempFile
  curl.exe -s -X POST "http://localhost:3001/categories" `
    -H "Authorization: Bearer $env:ADMIN_TOKEN" `
    -H "Content-Type: application/json" `
    -d "@$tempFile"
  Write-Host ""
}
