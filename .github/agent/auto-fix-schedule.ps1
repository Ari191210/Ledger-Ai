# Registers the Ledger Auto-Fix Agent as a nightly Task Scheduler job (2 AM daily).
# Run this once. No admin required.

$taskName = "LedgerAutoFix"
$batPath  = "C:\Users\DELL\Downloads\design_handoff_ledger\ledger\.github\agent\auto-fix.bat"

$result = schtasks /create /tn $taskName /tr "cmd.exe /c `"$batPath`"" /sc DAILY /st 02:00 /f 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Scheduled: $taskName runs daily at 2 AM."
    Write-Host "Fixes appear in: C:\Users\DELL\Documents\LedgerBrain\Bugs\Analysis\"
    Write-Host "Logs: .github\agent\auto-fix.log"
    Write-Host ""
    Write-Host "To run manually now: schtasks /run /tn $taskName"
    Write-Host "To remove task:      schtasks /delete /tn $taskName /f"
} else {
    Write-Host "Error: $result"
}
