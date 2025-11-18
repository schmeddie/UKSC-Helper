@echo off
echo ====================================
echo UKSC Helper - Clean Reinstall
echo ====================================
echo.
echo This will remove node_modules and reinstall with Next.js 13.4.19
echo (compatible with Node.js 18.16.1)
echo.
pause

REM Stop any running dev server first (Ctrl+C if running)

echo.
echo [1/4] Removing .next build folder...
if exist .next rmdir /s /q .next
echo Done.
echo.

echo [2/4] Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo Done.
echo.

echo [3/4] Removing package-lock.json...
if exist package-lock.json del /f package-lock.json
echo Done.
echo.

echo [4/4] Installing dependencies with Next.js 13.4.19...
call npm install
echo.

echo ====================================
echo Verifying installation...
echo ====================================
call npm list next
echo.

echo ====================================
echo Installation complete!
echo ====================================
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Open http://localhost:3000
echo.
pause
