# Corrige le texte des 6 catégories existantes (accents/encodage) sans changer
# leurs IDs (donc sans casser les produits déjà liés).
# Usage : dans le dossier backend, lancer  powershell -ExecutionPolicy Bypass -File fix-categories.ps1

$env:ADMIN_TOKEN = (curl.exe -s -X POST "http://localhost:8080/realms/brocaramilou/protocol/openid-connect/token" `
  -d "client_id=backend" -d "client_secret=IVbHTTPUdHdwNAVPcmzuaRQ66ypB7evC" `
  -d "grant_type=password" -d "username=testadmin" -d "password=test1234" | ConvertFrom-Json).access_token

# Ordre exact voulu (même ordre que la création initiale).
$nomsCorrects = @(
  "Restauration",
  "Salons de thé & Cafés",
  "Pâtisserie & Boulangerie",
  "Emballages alimentaires",
  "Mariages, Fêtes & Soutenances",
  "Cadeaux & Idées originales"
)

$existantes = curl.exe -s "http://localhost:3001/categories" | ConvertFrom-Json
$existantesTriees = $existantes | Sort-Object idCategorie

$tempFile = Join-Path $env:TEMP "categorie-fix.json"

for ($i = 0; $i -lt $existantesTriees.Count -and $i -lt $nomsCorrects.Count; $i++) {
  $id = $existantesTriees[$i].idCategorie
  $nom = $nomsCorrects[$i]

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  $json = @{ nom = $nom } | ConvertTo-Json
  [System.IO.File]::WriteAllText($tempFile, $json, $utf8NoBom)

  Write-Host "PATCH categorie $id -> $nom"
  curl.exe -s -X PATCH "http://localhost:3001/categories/$id" `
    -H "Authorization: Bearer $env:ADMIN_TOKEN" `
    -H "Content-Type: application/json" `
    -d "@$tempFile"
  Write-Host ""
}
