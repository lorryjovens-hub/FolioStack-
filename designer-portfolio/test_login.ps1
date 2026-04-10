$body = @{"username" = "testuser"; "password" = "test123456"} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -ContentType "application/json" -Body $body
    Write-Host "Login Success:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Login Error:"
    $_.Exception.Response.StatusCode
    $_.Exception.Message
}