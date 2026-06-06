@echo off
REM Ledger Idea Engine — Python reads ANTHROPIC_API_KEY from .env.local directly.
REM No key extraction needed here; this just runs the script and logs the result.

cd /d "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"

echo [%date% %time%] Starting Ledger Idea Engine >> .github\agent\idea-gen.log
python .github\agent\idea-gen.py >> .github\agent\idea-gen.log 2>&1
echo [%date% %time%] Done (exit %errorlevel%) >> .github\agent\idea-gen.log
