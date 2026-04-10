@"
{"username":"testuser","email":"test@example.com","password":"test123456"}
"@ | Out-File -FilePath "$env:TEMP\register.json" -Encoding UTF8
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -ContentType "application/json" -Body (Get-Content "$env:TEMP\register.json" -Raw)