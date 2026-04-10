$body = @{"username" = "testuser"; "password" = "test123456"} | ConvertTo-Json -Compress
$headers = @{"Content-Type" = "application/json"}

Write-Host "=== Testing Login API ==="
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Headers $headers -Body $body -TimeoutSec 10
    Write-Host "Login Success:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Login Error Status:" $_.Exception.Response.StatusCode
    Write-Host "Login Error Message:" $_.Exception.Message
}

Write-Host "`n=== Testing Register API (new user) ==="
$newUser = @{"username" = "newtestuser123"; "email" = "newtest@example.com"; "password" = "test123456"} | ConvertTo-Json -Compress
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Headers $headers -Body $newUser -TimeoutSec 10
    Write-Host "Register Success:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Register Error Status:" $_.Exception.Response.StatusCode
    Write-Host "Register Error Message:" $_.Exception.Message
}

Write-Host "`n=== Testing Register API (duplicate user) ==="
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Headers $headers -Body $body -TimeoutSec 10
    Write-Host "Register (should fail for duplicate):"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Register Error Status:" $_.Exception.Response.StatusCode
    Write-Host "Register Error Message:" $_.Exception.Message
}