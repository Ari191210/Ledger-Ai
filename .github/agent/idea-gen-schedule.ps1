# Run this to schedule daily idea generation at 8 AM (no admin required)
# Ideas appear in: C:\Users\DELL\Documents\LedgerBrain\Ideas\Daily\

$taskName = "LedgerIdeaEngine"
$batPath  = "C:\Users\DELL\Downloads\design_handoff_ledger\ledger\.github\agent\idea-gen.bat"

# Use schtasks.exe — works without admin for current-user tasks
$result = schtasks /create /tn $taskName /tr "cmd.exe /c `"$batPath`"" /sc DAILY /st 08:00 /f 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Scheduled: $taskName runs daily at 8 AM."
    Write-Host "Ideas appear in: C:\Users\DELL\Documents\LedgerBrain\Ideas\Daily\"
    Write-Host "Inbox summary: C:\Users\DELL\Documents\LedgerBrain\Ideas\Inbox.md"
    Write-Host "Logs: .github\agent\idea-gen.log"
    Write-Host ""
    Write-Host "To run manually now: schtasks /run /tn $taskName"
    Write-Host "To remove task:      schtasks /delete /tn $taskName /f"
} else {
    Write-Host "Error: $result"
}
