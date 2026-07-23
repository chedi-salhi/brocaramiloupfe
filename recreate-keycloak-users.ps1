# recreate-keycloak-users.ps1
# A executer dans : C:\Users\Chedi Salhi\Desktop\Brocaramilou PFE
#
# Recree les 5 comptes du realm Keycloak "brocaramilou" (perdu le 19/07/2026 lors
# d'un docker compose down/up sans volume persistant), leur assigne le bon role,
# puis genere relink-users.sql pour reconnecter chaque compte a sa ligne Postgres
# existante (conserve commandes/favoris/produits lies a ces comptes).
#
# Mot de passe temporaire pour tous les comptes recrees : voir $DefaultPassword
# ci-dessous. Chacun peut le changer ensuite depuis son profil dans l'appli.

$KeycloakUrl = "http://127.0.0.1:8080"
$Realm = "brocaramilou"
$AdminUser = "admin"
$AdminPassword = "admin"
$DefaultPassword = "Changer123!"

$Users = @(
    @{ Email = "chadi5marat@gmail.com";  Prenom = "chedi"; Nom = "taryaki"; Role = "client"  },
    @{ Email = "mohemedhedi@gmail.com";  Prenom = "med";   Nom = "hedi";    Role = "livreur" },
    @{ Email = "salhi08fares@gmail.com"; Prenom = "fares"; Nom = "salhi";   Role = "client"  },
    @{ Email = "testadmin@example.com";  Prenom = "Test";  Nom = "Admin";   Role = "admin"   },
    @{ Email = "salhichedy2@gmail.com";  Prenom = "chedi"; Nom = "salhi";   Role = "client"  }
)

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

$sqlLines = @()

foreach ($u in $Users) {
    Write-Host "`n--- $($u.Email) ---"

    $body = @{
        username      = $u.Email
        email         = $u.Email
        firstName     = $u.Prenom
        lastName      = $u.Nom
        enabled       = $true
        emailVerified = $true
        credentials   = @(@{ type = "password"; value = $DefaultPassword; temporary = $false })
    } | ConvertTo-Json

    try {
        $createResponse = Invoke-WebRequest -Method Post `
            -Uri "$KeycloakUrl/admin/realms/$Realm/users" `
            -Headers $headers -ContentType "application/json" -Body $body
    } catch {
        Write-Host "Erreur creation $($u.Email) : $($_.Exception.Message)" -ForegroundColor Red
        continue
    }

    $location = $createResponse.Headers.Location
    if ($location -is [System.Array]) { $location = $location[0] }
    $newId = $location.Split("/")[-1]
    Write-Host "Cree avec id $newId"

    $roleRep = Invoke-RestMethod -Method Get `
        -Uri "$KeycloakUrl/admin/realms/$Realm/roles/$($u.Role)" `
        -Headers $headers

    $roleArray = @($roleRep)
    $roleBody = ConvertTo-Json -InputObject $roleArray

    Invoke-RestMethod -Method Post `
        -Uri "$KeycloakUrl/admin/realms/$Realm/users/$newId/role-mappings/realm" `
        -Headers $headers -ContentType "application/json" -Body $roleBody | Out-Null
    Write-Host "Role '$($u.Role)' assigne"

    $emailEscaped = $u.Email -replace "'", "''"
    $sqlLines += "UPDATE ""Utilisateur"" SET ""keycloakId"" = '$newId' WHERE email = '$emailEscaped';"
}

$sqlPath = Join-Path $PSScriptRoot "relink-users.sql"
# Out-File -Encoding utf8 ecrit un BOM en tete de fichier, que psql interprete
# comme un caractere invalide sur la premiere ligne ("syntax error at or near
# ï»¿UPDATE"). On ecrit nous-memes en UTF-8 sans BOM pour eviter ca.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($sqlPath, ($sqlLines -join "`n") + "`n", $utf8NoBom)

Write-Host "`nTermine. Fichier genere : $sqlPath"
Write-Host "Mot de passe temporaire pour tous les comptes : $DefaultPassword"
Write-Host "`nLance ensuite, dans le meme dossier :"
Write-Host '  psql "postgresql://brocaramilou:brocaramilou@127.0.0.1:5433/brocaramilou" -f relink-users.sql'
