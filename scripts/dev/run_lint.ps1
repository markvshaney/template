# Run pylint for the Python AI components
# This script activates the virtual environment and runs pylint with various options

param (
    [switch]$Fix,
    [string]$Path = "python",
    [switch]$Verbose
)

# Activate the virtual environment
Write-Host "Activating Python virtual environment..." -ForegroundColor Green
. .venv/Scripts/Activate.ps1

# Check if the virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "Error: Virtual environment not activated. Please run setup_env.ps1 first." -ForegroundColor Red
    exit 1
}

# First run black to format code if fix is requested
if ($Fix) {
    Write-Host "Running black to format code..." -ForegroundColor Cyan
    Invoke-Expression "black $Path"
    
    Write-Host "Running isort to sort imports..." -ForegroundColor Cyan
    Invoke-Expression "isort $Path"
}

# Build the pylint command
$pylintCmd = "pylint"

# Add verbosity if requested
if ($Verbose) {
    $pylintCmd += " --verbose"
}

# Add the path to check
$pylintCmd += " $Path"

# Display the command
Write-Host "Running: $pylintCmd" -ForegroundColor Cyan

# Run pylint
Invoke-Expression $pylintCmd

# Get the exit code
$exitCode = $LASTEXITCODE

# Interpret the exit code
switch ($exitCode) {
    0 { 
        Write-Host "No errors or warnings found!" -ForegroundColor Green 
    }
    { $_ -band 1 } { 
        Write-Host "Fatal message issued (error preventing pylint from running)" -ForegroundColor Red 
    }
    { $_ -band 2 } { 
        Write-Host "Error message issued" -ForegroundColor Red 
    }
    { $_ -band 4 } { 
        Write-Host "Warning message issued" -ForegroundColor Yellow 
    }
    { $_ -band 8 } { 
        Write-Host "Refactor message issued" -ForegroundColor Cyan 
    }
    { $_ -band 16 } { 
        Write-Host "Convention message issued" -ForegroundColor Blue 
    }
    { $_ -band 32 } { 
        Write-Host "Usage error" -ForegroundColor Red 
    }
}

Write-Host "Lint check completed!" -ForegroundColor Green 