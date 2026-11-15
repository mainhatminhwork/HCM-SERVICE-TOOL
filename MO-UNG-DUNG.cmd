@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto bundled
node scripts\local.mjs
goto done
:bundled
if not exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" goto missing
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\local.mjs
goto done
:missing
echo Can cai Node.js 22.13 tro len. Xem HUONG-DAN.md.
:done
pause
