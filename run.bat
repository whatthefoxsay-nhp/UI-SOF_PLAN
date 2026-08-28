@echo off
REM Script để chạy hai lệnh npm song song
REM Kiểm tra và kill process trên port 3000 nếu có
set port=3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port%"') do (
    set pid=%%a
    goto :check_process
)
echo Port %port% is free
goto :start_processes

:check_process
for /f "tokens=*" %%b in ('tasklist /FI "PID eq %pid%" /FO CSV ^| findstr "node.exe"') do (
    echo Killing node.exe process on port %port% (PID: %pid%)
    taskkill /PID %pid% /F
    goto :start_processes
)
echo Process on port %port% is not node.exe, not killing
goto :start_processes

:start_processes
REM Chạy npm run electron-test trong background
start /b cmd /c "npm run electron-test"

REM Chạy npm start trong background (không mở browser nhờ .env.local)
start /b cmd /c "npm start"

REM Chờ Electron app tắt (monitor process electron.exe)
echo Waiting for Electron app to close...
:wait_loop
tasklist /FI "IMAGENAME eq electron.exe" 2>NUL | find /I "electron.exe" >nul
if %errorlevel%==0 (
    timeout /t 1 /nobreak >nul
    goto :wait_loop
)

REM Khi Electron tắt, stop tất cả
echo Electron app closed, stopping all processes and killing port...

REM Kill port 3000 nếu còn
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port%"') do (
    set pid=%%a
    for /f "tokens=*" %%b in ('tasklist /FI "PID eq %pid%" /FO CSV ^| findstr "node.exe"') do (
        echo Killing remaining node.exe on port %port% (PID: %pid%)
        taskkill /PID %pid% /F
    )
)

echo All processes stopped and port cleared.
exit /b 0