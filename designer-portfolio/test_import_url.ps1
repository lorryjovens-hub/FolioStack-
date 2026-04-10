$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXVpZCI6IjZjNzI4NDVjLWQwMGQtMTFlZi1hZGFmLWVhZjAtMjcwYzdmZjBhM2QxMiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQzOTk5NTk3fQ.RF6mXD6gR9KJ-LwgT5g6Q8GXVJyLqMmYSaPlD8qD3hk"

$body = @{"url" = "https://lorryjovens.netlify.app/"} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/works/import-url" -Method Post -Headers $headers -Body $body
    Write-Host "Success:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error:"
    $_.Exception.Response.StatusCode
    $_.Exception.Message
}