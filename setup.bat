@echo off

REM Sherara MVP Setup Script for Windows

echo Setting up Sherara MVP...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js v14 or higher.
    exit /b 1
)

REM Display versions
echo Node.js version:
node -v
echo npm version:
npm -v

REM Install dependencies
echo Installing dependencies...
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit .env file and add your OpenAI API key
)

REM Create necessary directories if they don't exist
if not exist logs mkdir logs
if not exist temp mkdir temp

echo.
echo Setup complete!
echo.
echo To start the application:
echo   1. Edit .env file and add your OpenAI API key
echo   2. Run: npm start
echo   3. Open: http://localhost:3000
echo.
echo For development mode with auto-reload:
echo   Run: npm run dev

pause
