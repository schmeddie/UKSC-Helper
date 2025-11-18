@echo off
echo ====================================
echo QUICK FIX - Tailwind CSS Rebuild
echo ====================================
echo.
echo This will rebuild the CSS and restart the dev server
echo.

echo [1/2] Removing .next build folder...
if exist .next rmdir /s /q .next
echo Done.
echo.

echo [2/2] Starting dev server (CSS will compile automatically)...
echo.
echo ====================================
echo Server starting...
echo ====================================
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop the server
echo.

npm run dev
