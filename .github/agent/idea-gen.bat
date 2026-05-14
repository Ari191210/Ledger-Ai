@echo off
REM Ledger Idea Engine — reads ANTHROPIC_API_KEY from .env.local automatically

cd /d "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"

REM Read API key from .env.local
for /f "tokens=2 delims==" %%a in ('findstr "ANTHROPIC_API_KEY" .env.local') do set ANTHROPIC_API_KEY=%%a

echo [%date% %time%] Starting Ledger Idea Engine >> .github\agent\idea-gen.log 2>&1
python .github\agent\idea-gen.py >> .github\agent\idea-gen.log 2>&1
echo [%date% %time%] Done >> .github\agent\idea-gen.log 2>&1
