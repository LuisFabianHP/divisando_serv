# Test Google Auth Endpoint
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "@S3gUr@L0kP@sSw0rD!2o25"
    "User-Agent" = "DivisandoApp/1.0"
}

$body = @{
    idToken = "invalid_token_for_testing"
} | ConvertTo-Json

Write-Host "Testing with invalid token..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/auth/google" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
