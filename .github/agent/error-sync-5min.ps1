# Updates the LedgerErrorSync task to run every 5 minutes instead of hourly.
# Run this once (no admin required).

$taskName = "LedgerErrorSync"
$batPath  = "C:\Users\DELL\Downloads\design_handoff_ledger\ledger\.github\agent\error-sync.bat"

# Delete old task if exists
schtasks /delete /tn $taskName /f 2>$null

# Re-register with 5-minute repeat
# /sc MINUTE /mo 5 = every 5 minutes
$result = schtasks /create /tn $taskName /tr "cmd.exe /c `"$batPath`"" /sc MINUTE /mo 5 /f 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Updated: $taskName now runs every 5 minutes."
    Write-Host "Errors appear in: C:\Users\DELL\Documents\LedgerBrain\Bugs\"
    Write-Host "Logs: .github\agent\error-sync.log"
    Write-Host ""
    Write-Host "To run manually: schtasks /run /tn $taskName"
} else {
    Write-Host "Error: $result"
}
