@echo off
cd /d "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"
echo [%date% %time%] Error sync starting >> .github\agent\error-sync.log 2>&1
python .github\agent\error-sync.py >> .github\agent\error-sync.log 2>&1
echo [%date% %time%] Done >> .github\agent\error-sync.log 2>&1
