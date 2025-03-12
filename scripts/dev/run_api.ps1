# Run the FastAPI server for the Python AI components
# This script activates the virtual environment and starts the FastAPI server

# Activate the virtual environment
Write-Host "Activating Python virtual environment..." -ForegroundColor Green
. .venv/Scripts/Activate.ps1

# Check if the virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "Error: Virtual environment not activated. Please run setup_env.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if the API file exists
if (-not (Test-Path "python/api/main.py")) {
    Write-Host "Error: API file not found. Please make sure python/api/main.py exists." -ForegroundColor Red
    exit 1
}

# Run the FastAPI server
Write-Host "Starting FastAPI server..." -ForegroundColor Green
Write-Host "API will be available at http://localhost:8000" -ForegroundColor Cyan
Write-Host "API documentation will be available at http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow

# Start the server with hot reload for development
cd python
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 