@echo off
REM Ledger Idea Engine — reads ANTHROPIC_API_KEY from .env.local automatically

cd /d "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"

REM Read API key via PowerShell (reliable in all environments including Task Scheduler)
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Get-Content .env.local | Select-String \"ANTHROPIC_API_KEY\").Line.Split(\"=\",2)[1].Trim()"') do set ANTHROPIC_API_KEY=%%a

if "%ANTHROPIC_API_KEY%"=="" (
    echo [%date% %time%] ERROR: ANTHROPIC_API_KEY not found in .env.local >> .github\agent\idea-gen.log
    exit /b 1
)

echo [%date% %time%] Starting Ledger Idea Engine >> .github\agent\idea-gen.log
python .github\agent\idea-gen.py >> .github\agent\idea-gen.log 2>&1
echo [%date% %time%] Done (exit %errorlevel%) >> .github\agent\idea-gen.log
