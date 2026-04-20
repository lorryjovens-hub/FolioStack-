@echo off
REM Build script for UploadWasm Rust/WebAssembly module (Windows)

echo ============================================
echo Building UploadWasm
echo ============================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Build WASM module
echo [1/3] Building WASM module...
cd wasm\upload-wasm
wasm-pack build --target web --out-dir ..\..\public\wasm

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] WASM build complete!
echo.

REM Verify output
echo [3/3] Verifying output files...
if exist "..\..\public\wasm\upload_wasm.js" (
    echo [OK] upload_wasm.js found
) else (
    echo [ERROR] upload_wasm.js not found
    exit /b 1
)

if exist "..\..\public\wasm\upload_wasm_bg.wasm" (
    echo [OK] upload_wasm_bg.wasm found
) else (
    echo [ERROR] upload_wasm_bg.wasm not found
    exit /b 1
)

echo.
echo ============================================
echo Build Successful!
echo ============================================
echo.
echo Output directory: public\wasm\
echo.
echo Files created:
dir /b "..\..\public\wasm\"
echo.
pause