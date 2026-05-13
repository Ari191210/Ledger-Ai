@echo off
cd /d "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"
python .github\agent\run.py >> .github\agent\agent.log 2>&1
