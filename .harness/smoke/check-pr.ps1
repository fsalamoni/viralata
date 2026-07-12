try {
    $r = Invoke-WebRequest -Uri "https://api.github.com/repos/fsalamoni/viralata/pulls?head=fsalamoni:wt/e79e15ca&state=all" -Headers @{"Accept"="application/vnd.github+json"} -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Host $r.Content
} catch {
    Write-Host "ERR: $($_.Exception.Message)"
}
