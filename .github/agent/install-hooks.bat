@echo off
:: Installs LedgerBrain git hooks into .git/hooks/
:: Run once from the repo root after cloning

set REPO=C:\Users\DELL\Downloads\design_handoff_ledger\ledger
set SRC=%REPO%\.github\hooks\post-commit
set DST=%REPO%\.git\hooks\post-commit

copy /Y "%SRC%" "%DST%" >nul
echo [LedgerBrain] post-commit hook installed.
echo Every git commit will now auto-log a session note to LedgerBrain/Sessions/
