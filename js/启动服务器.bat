@echo off
chcp 65001 > nul
echo ========================================
echo   原神 UGC 文件转换器 - Web版本
echo ========================================
echo.
echo 正在启动本地服务器...
echo.
echo 服务器启动后，浏览器会自动打开
echo 如果没有自动打开，请手动访问：
echo http://localhost:8000
echo.
echo 按 Ctrl+C 可以停止服务器
echo ========================================
echo.

cd /d "%~dp0"

:: 尝试使用 Python
where python >nul 2>nul
if %errorlevel% == 0 (
    echo 使用 Python 启动服务器...
    start http://localhost:8000
    python -m http.server 8000
    goto :end
)

:: 尝试使用 Node.js
where node >nul 2>nul
if %errorlevel% == 0 (
    echo 使用 Node.js 启动服务器...
    start http://localhost:8000
    npx http-server -p 8000
    goto :end
)

:: 如果都没有，直接打开HTML文件
echo.
echo 未检测到 Python 或 Node.js
echo 将直接在浏览器中打开文件...
echo.
start index.html
goto :end

:end
pause
