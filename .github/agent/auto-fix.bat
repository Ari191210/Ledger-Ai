@echo off
cd /d "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"
echo [%date% %time%] Auto-fix agent starting >> .github\agent\auto-fix.log 2>&1
python .github\agent\auto-fix-agent.py >> .github\agent\auto-fix.log 2>&1
echo [%date% %time%] Done >> .github\agent\auto-fix.log 2>&1
