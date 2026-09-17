# export-keycloak-realm.ps1
# A executer dans : C:\Users\Chedi Salhi\Desktop\Brocaramilou PFE (Keycloak doit tourner)
#
# Exporte la config du realm "brocaramilou" (realm settings, clients, roles,
# groupes) vers keycloak/realm-export.json. Docker Compose importe ensuite ce
# fichier automatiquement au demarrage (voir docker-compose.yml, --import-realm).
#
# Objectif : si le volume Keycloak est perdu (comme le 19/07/2026 lors d'un
# depannage Docker/WSL2), un simple "docker compose up" recree le realm, les
# clients et les roles tout seul, sans dependre du volume ni d'une manip
# manuelle dans la console admin.
#
# Ne contient PAS les comptes utilisateurs ni leurs mots de passe (l'API
# partial-export ne les exporte jamais). En cas de perte du realm :
#   1. docker compose up -d          (recree realm/clients/roles automatiquement)
#   2. .\recreate-keycloak-users.ps1  (recree les 5 comptes + relink Postgres)
#
# ATTENTION : le fichier genere contient le client secret en clair. Il est
# volontairement exclu du depot (.gitignore) tant qu'il n'a pas ete passe en
# revue avec le reste des secrets du projet.

$KeycloakUrl = "http://127.0.0.1:8080"
$Realm = "brocaramilou"
$AdminUser = "admin"
$AdminPassword = "admin"

Write-Host "Recuperation du token admin..."
$tokenResponse = Invoke-RestMethod -Method Post `
    -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        client_id  = "admin-cli"
        username   = $AdminUser
        password   = $AdminPassword
        grant_type = "password"
    }
$adminToken = $tokenResponse.access_token
$headers = @{ Authorization = "Bearer $adminToken" }

Write-Host "Export du realm '$Realm'..."
$export = Invoke-RestMethod -Method Post `
    -Uri "$KeycloakUrl/admin/realms/$Realm/partial-export?exportClients=true&exportGroupsAndRoles=true" `
    -Headers $headers

# L'export masque les secrets clients ("**********") : sans ca, un realm
# reimporte aurait un secret "backend" different de celui dans les .env, et
# l'auth resterait cassee meme apres import automatique. On va chercher la
# vraie valeur et on la reinjecte avant d'ecrire le fichier.
Write-Host "Recuperation du secret reel du client 'backend'..."
$backendClient = Invoke-RestMethod -Method Get `
    -Uri "$KeycloakUrl/admin/realms/$Realm/clients?clientId=backend" `
    -Headers $headers
$backendClientId = $backendClient[0].id
$secretResponse = Invoke-RestMethod -Method Get `
    -Uri "$KeycloakUrl/admin/realms/$Realm/clients/$backendClientId/client-secret" `
    -Headers $headers
($export.clients | Where-Object { $_.clientId -eq "backend" }).secret = $secretResponse.value

$outDir = Join-Path $PSScriptRoot "keycloak"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outPath = Join-Path $outDir "realm-export.json"
$export | ConvertTo-Json -Depth 100 | Out-File -FilePath $outPath -Encoding utf8

Write-Host "`nRealm exporte vers $outPath"
Write-Host "Pour tester l'import automatique :"
Write-Host "  docker compose down -v"
Write-Host "  docker compose up -d"
Write-Host "  (puis .\recreate-keycloak-users.ps1 pour les comptes)"
