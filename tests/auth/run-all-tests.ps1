# Test Suite - Google Auth Endpoint
# Ejecuta pruebas con token inválido y válido

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Google Auth Endpoint Tests" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Token inválido
Write-Host "[TEST 1/2] Token Inválido" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "@S3gUr@L0kP@sSw0rD!2o25"
    "User-Agent" = "DivisandoApp/1.0"
}

$invalidBody = @{
    idToken = "invalid_token_for_testing"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/auth/google" -Method POST -Headers $headers -Body $invalidBody -ErrorAction Stop
    Write-Host "❌ FAIL: Debería rechazar token inválido" -ForegroundColor Red
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS: Token inválido rechazado correctamente" -ForegroundColor Green
        Write-Host "   Status: 401" -ForegroundColor Green
        Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAIL: Status code inesperado: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[TEST 2/2] Token Válido (Opcional)" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$runValidTest = Read-Host "¿Deseas probar con un token válido? (s/n)"

if ($runValidTest -eq "s" -or $runValidTest -eq "S") {
    Write-Host ""
    Write-Host "Obtén un idToken desde: https://developers.google.com/oauthplayground/" -ForegroundColor Cyan
    Write-Host "Scopes necesarios: userinfo.email, userinfo.profile" -ForegroundColor Cyan
    Write-Host ""
    
    $idToken = Read-Host "Ingresa el idToken válido"
    
    if (![string]::IsNullOrWhiteSpace($idToken)) {
        $validBody = @{
            idToken = $idToken
        } | ConvertTo-Json
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/auth/google" -Method POST -Headers $headers -Body $validBody -ErrorAction Stop
            Write-Host "✅ PASS: Token válido aceptado" -ForegroundColor Green
            Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
            $responseObj = $response.Content | ConvertFrom-Json
            Write-Host "   refreshToken: $($responseObj.refreshToken.Substring(0,30))..." -ForegroundColor Cyan
            Write-Host "   expiresAt: $($responseObj.expiresAt)" -ForegroundColor Cyan
        } catch {
            Write-Host "❌ FAIL: Token válido rechazado" -ForegroundColor Red
            Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
            Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  SKIP: No se proporcionó token" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  SKIP: Test de token válido omitido" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Tests Completados" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
