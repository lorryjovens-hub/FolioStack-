$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXVpZCI6IjZjNzI4NDVjLWQwMGQtNDBhMy05YmZiLWVhMmFjNDkxMTBiYiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc1NzQ4NjIwLCJleHAiOjE3NzYzNTM0MjB9.wgrTJFisj-ApPxSCtoOa9T5cTig79N__CEON5nSu4XI"

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
    Write-Host "Status Code:" $_.Exception.Response.StatusCode
    Write-Host "Message:" $_.Exception.Message
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body:" $responseBody
}