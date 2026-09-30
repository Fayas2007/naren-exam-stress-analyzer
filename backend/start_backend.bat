@echo off
setlocal

:: Check if Rscript is in PATH
where Rscript >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set RSCRIPT_PATH=Rscript
    goto RUN
)

:: Check known R installation paths
if exist "C:\Users\Fayas\R\R-4.6.1\app\bin\x64\Rscript.exe" (
    set RSCRIPT_PATH="C:\Users\Fayas\R\R-4.6.1\app\bin\x64\Rscript.exe"
    goto RUN
)

if exist "C:\Program Files\R\R-4.6.1\bin\x64\Rscript.exe" (
    set RSCRIPT_PATH="C:\Program Files\R\R-4.6.1\bin\x64\Rscript.exe"
    goto RUN
)

if exist "C:\Program Files\R\R-4.4.2\bin\x64\Rscript.exe" (
    set RSCRIPT_PATH="C:\Program Files\R\R-4.4.2\bin\x64\Rscript.exe"
    goto RUN
)

echo [ERROR] Rscript.exe not found in PATH or standard installation directories.
echo Please ensure R is installed.
pause
exit /b 1

:RUN
echo ===================================================
echo   Launching Exam Stress Analyzer R Plumber API
echo ===================================================
echo Using R executable: %RSCRIPT_PATH%
cd /d "%~dp0"
%RSCRIPT_PATH% run_server.R
pause
