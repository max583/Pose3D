@echo off
echo ========================================
echo PoseFlow Editor - Installation
echo ========================================
echo.

echo [1/3] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

echo [2/3] Installing Python dependencies...
cd backend
call pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed!
    pause
    exit /b 1
)
cd ..
echo.

echo [3/3] Installation complete!
echo.
echo To run the application:
echo   npm run dev              - Start Vite dev server only
echo   npm run electron:dev     - Start full Electron app
echo   npm run backend          - Start Python backend only
echo.
pause
