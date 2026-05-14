# Run this ONCE to set up Windows Task Scheduler
# The agent will then run every day at 9 AM automatically

$taskName = "LedgerAgent"
$batPath  = "C:\Users\DELL\Downloads\design_handoff_ledger\ledger\.github\agent\run.bat"

$action   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batPath`""
$trigger  = New-ScheduledTaskTrigger -Daily -At "09:00AM"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force

Write-Host "Scheduled: $taskName runs daily at 9 AM."
Write-Host "Logs: .github\agent\agent.log"
