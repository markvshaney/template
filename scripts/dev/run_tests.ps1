# Run pytest for the Python AI components
# This script activates the virtual environment and runs pytest with various options

param (
    [switch]$All,
    [switch]$Unit,
    [switch]$Integration,
    [switch]$Performance,
    [switch]$GPU,
    [switch]$Coverage,
    [switch]$Verbose,
    [string]$Filter
)

# Activate the virtual environment
Write-Host "Activating Python virtual environment..." -ForegroundColor Green
. .venv/Scripts/Activate.ps1

# Check if the virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "Error: Virtual environment not activated. Please run setup_env.ps1 first." -ForegroundColor Red
    exit 1
}

# Build the pytest command
$pytestCmd = "pytest"

# Add verbosity if requested
if ($Verbose) {
    $pytestCmd += " -v"
}

# Add coverage if requested
if ($Coverage) {
    $pytestCmd += " --cov=python --cov-report=term --cov-report=html"
}

# Determine which tests to run
if ($Unit) {
    $pytestCmd += " python/tests/unit"
}
elseif ($Integration) {
    $pytestCmd += " python/tests/integration"
}
elseif ($Performance) {
    $pytestCmd += " python/tests/performance"
}
elseif ($GPU) {
    $pytestCmd += " -m gpu"
}
elseif ($Filter) {
    $pytestCmd += " $Filter"
}
elseif ($All -or (-not $Unit -and -not $Integration -and -not $Performance -and -not $GPU -and -not $Filter)) {
    $pytestCmd += " python/tests"
}

# Display the command
Write-Host "Running: $pytestCmd" -ForegroundColor Cyan

# Run the tests
Invoke-Expression $pytestCmd

# If coverage was generated, show the path to the HTML report
if ($Coverage) {
    Write-Host "Coverage HTML report generated at: $(Get-Location)/htmlcov/index.html" -ForegroundColor Green
}

Write-Host "Tests completed!" -ForegroundColor Green 