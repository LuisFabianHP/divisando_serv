# Test Google Auth Endpoint with VALID token
# 
# Para obtener un token válido:
# 1. Ir a: https://developers.google.com/oauthplayground/
# 2. En "Step 1": Seleccionar "Google OAuth2 API v2" > "https://www.googleapis.com/auth/userinfo.email"
# 3. Click "Authorize APIs"
# 4. Iniciar sesión con Google
# 5. En "Step 2": Click "Exchange authorization code for tokens"
# 6. Copiar el "id_token" (NO el access_token)
# 7. Pegarlo en la variable $idToken de abajo

Write-Host "=== INSTRUCCIONES ===" -ForegroundColor Cyan
Write-Host "1. Obtén un idToken válido desde Google OAuth Playground" -ForegroundColor Yellow
Write-Host "2. URL: https://developers.google.com/oauthplayground/" -ForegroundColor Yellow
Write-Host "3. Pega el token cuando se solicite" -ForegroundColor Yellow
Write-Host ""

$idToken = Read-Host "Ingresa el idToken válido de Google"

if ([string]::IsNullOrWhiteSpace($idToken)) {
    Write-Host "❌ No se proporcionó un token. Saliendo..." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "@S3gUr@L0kP@sSw0rD!2o25"
    "User-Agent" = "DivisandoApp/1.0"
}

$body = @{
    idToken = $idToken
} | ConvertTo-Json

Write-Host "`nTesting with VALID token..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/auth/google" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ Response:" -ForegroundColor Green
    $responseObj = $response.Content | ConvertFrom-Json
    Write-Host "   - refreshToken: $($responseObj.refreshToken.Substring(0,20))..." -ForegroundColor Cyan
    Write-Host "   - expiresAt: $($responseObj.expiresAt)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "❌ Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
