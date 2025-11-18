@echo off
echo Cleaning and reinstalling dependencies...
echo.

REM Stop any running dev server first (Ctrl+C if running)

echo Step 1: Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo Done.
echo.

echo Step 2: Removing package-lock.json...
if exist package-lock.json del /f package-lock.json
echo Done.
echo.

echo Step 3: Installing dependencies with Next.js 13.5.6...
call npm install
echo.

echo Step 4: Verifying Next.js version...
call npm list next
echo.

echo All done! Now run: npm run dev
pause
