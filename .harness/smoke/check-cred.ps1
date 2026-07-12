$targets = @("git:https://github.com", "gh:github.com:fsalamoni", "gh:github.com")
foreach ($t in $targets) {
    Write-Host "=== $t ==="
    $r = cmdkey /list 2>$null | Select-String -SimpleMatch $t
    if ($r) { Write-Host "EXISTS" } else { Write-Host "missing" }
}

Write-Host "`n=== try git credential fill ==="
$cred = 'protocol=https`nhost=github.com`n'
$cred | & git credential fill 2>$null
