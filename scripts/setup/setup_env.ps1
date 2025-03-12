# Python Environment Setup Script for Windows 11 with NVIDIA 4070 Ti Super
# This script sets up a Python virtual environment optimized for PyTorch development

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Green
    python -m venv .venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
. .venv/Scripts/Activate.ps1

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Green
pip install --upgrade pip

# Install PyTorch with CUDA support for NVIDIA 4070 Ti Super
Write-Host "Installing PyTorch with CUDA support for NVIDIA 4070 Ti Super..." -ForegroundColor Green
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify CUDA is available
Write-Host "Verifying CUDA availability..." -ForegroundColor Green
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"

# Install Hugging Face libraries
Write-Host "Installing Hugging Face libraries..." -ForegroundColor Green
pip install transformers==4.35.0 datasets==2.14.5 accelerate==0.23.0 peft==0.5.0 bitsandbytes==0.41.1 sentencepiece==0.1.99

# Install ONNX and optimization tools
Write-Host "Installing ONNX and optimization tools..." -ForegroundColor Green
pip install onnx==1.14.1 onnxruntime-gpu==1.16.0 optimum==1.12.0

# Install FastAPI and related packages
Write-Host "Installing FastAPI and related packages..." -ForegroundColor Green
pip install fastapi==0.104.0 uvicorn==0.23.2 pydantic==2.4.2 python-multipart==0.0.6

# Install vector database clients
Write-Host "Installing vector database clients..." -ForegroundColor Green
pip install pinecone-client==2.2.4 faiss-gpu==1.7.2 psycopg2-binary==2.9.9

# Install testing and development tools
Write-Host "Installing testing and development tools..." -ForegroundColor Green
pip install pytest==7.4.0 pytest-cov==4.1.0 pytest-benchmark==4.0.0 pytest-mock==3.11.1

# Install code quality tools
Write-Host "Installing code quality tools..." -ForegroundColor Green
pip install black==23.10.0 pylint==2.17.0 mypy==1.5.0 pre-commit==3.5.0 isort==5.12.0

# Create Python directories if they don't exist
Write-Host "Creating project directory structure..." -ForegroundColor Green
$directories = @(
    "python/api",
    "python/models",
    "python/embeddings",
    "python/training",
    "python/optimization",
    "python/utils",
    "python/tests/unit/models",
    "python/tests/unit/embeddings",
    "python/tests/unit/training",
    "python/tests/unit/optimization",
    "python/tests/integration",
    "python/tests/performance"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Gray
    }
}

# Create initial configuration files
Write-Host "Creating configuration files..." -ForegroundColor Green

# Create pytest.ini
@"
[pytest]
testpaths = python/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    gpu: marks tests that require GPU
"@ | Out-File -FilePath pytest.ini -Encoding utf8

# Create .coveragerc
@"
[run]
source = python
omit = python/tests/*
"@ | Out-File -FilePath .coveragerc -Encoding utf8

# Create pyproject.toml for Black and isort configuration
@"
[tool.black]
line-length = 100
target-version = ['py39']
include = '\.pyx?$'
exclude = '''
/(
    \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | _build
  | buck-out
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
line_length = 100

[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true

[[tool.mypy.overrides]]
module = "torch.*"
ignore_missing_imports = true
"@ | Out-File -FilePath pyproject.toml -Encoding utf8

# Create .pylintrc
@"
[MASTER]
load-plugins=

[MESSAGES CONTROL]
disable=C0111,R0903,C0103

[FORMAT]
max-line-length=100

[DESIGN]
max-args=6
max-attributes=12
"@ | Out-File -FilePath .pylintrc -Encoding utf8

# Create initial conftest.py
@"
import pytest
import torch
import numpy as np
import random

@pytest.fixture(autouse=True)
def set_random_seed():
    """Set random seeds for reproducibility."""
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)
    np.random.seed(42)
    random.seed(42)

@pytest.fixture
def device():
    """Provide a PyTorch device."""
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")

@pytest.fixture
def tensor_close():
    """Fixture for comparing tensors with tolerance."""
    def _tensor_close(a, b, rtol=1e-5, atol=1e-8):
        return torch.allclose(a, b, rtol=rtol, atol=atol)
    return _tensor_close
"@ | Out-File -FilePath python/tests/conftest.py -Encoding utf8

# Create a sample model test file
@"
import pytest
import torch

def test_gpu_availability():
    """Test that GPU is available."""
    assert torch.cuda.is_available(), "CUDA is not available"
    
    # Print GPU info for verification
    device_count = torch.cuda.device_count()
    device_name = torch.cuda.get_device_name(0)
    print(f"Found {device_count} CUDA device(s). Using: {device_name}")
    
    # Simple tensor operation on GPU
    x = torch.rand(5, 3).cuda()
    y = torch.rand(5, 3).cuda()
    z = x + y
    assert z.device.type == "cuda"

@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available")
def test_gpu_memory():
    """Test GPU memory allocation and cleanup."""
    # Record initial memory
    torch.cuda.empty_cache()
    initial_memory = torch.cuda.memory_allocated()
    
    # Allocate a large tensor
    x = torch.rand(1000, 1000, device="cuda")
    
    # Verify memory increased
    assert torch.cuda.memory_allocated() > initial_memory
    
    # Clean up
    del x
    torch.cuda.empty_cache()
    
    # Verify memory is released (with small overhead allowance)
    final_memory = torch.cuda.memory_allocated()
    assert final_memory <= initial_memory + 10**6  # Allow small overhead
"@ | Out-File -FilePath python/tests/unit/models/test_gpu.py -Encoding utf8

# Create a sample FastAPI app
@"
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import time

app = FastAPI(title="PyTorch API", description="API for PyTorch model inference")

class GenerationRequest(BaseModel):
    prompt: str
    max_length: int = 100
    temperature: float = 0.7

class GenerationResponse(BaseModel):
    text: str
    tokens_generated: int
    generation_time: float

@app.get("/")
async def root():
    """Root endpoint that returns system information."""
    cuda_available = torch.cuda.is_available()
    device_info = {
        "cuda_available": cuda_available,
        "device_count": torch.cuda.device_count() if cuda_available else 0,
        "device_name": torch.cuda.get_device_name(0) if cuda_available else "None",
        "pytorch_version": torch.__version__
    }
    return {"status": "ok", "device_info": device_info}

@app.post("/generate", response_model=GenerationResponse)
async def generate_text(request: GenerationRequest):
    """
    Generate text based on the provided prompt.
    
    This is a placeholder implementation. In a real application,
    you would load a model and generate text with it.
    """
    try:
        # Simulate model inference
        start_time = time.time()
        
        # In a real implementation, you would use a model like:
        # output = model.generate(request.prompt, max_length=request.max_length, temperature=request.temperature)
        
        # For now, just echo the prompt with some additions
        output = f"Generated response to: {request.prompt}"
        time.sleep(0.5)  # Simulate processing time
        
        generation_time = time.time() - start_time
        
        return GenerationResponse(
            text=output,
            tokens_generated=len(output.split()),
            generation_time=generation_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"@ | Out-File -FilePath python/api/main.py -Encoding utf8

# Create a README for the Python part
@"
# Python AI Components

This directory contains the Python components for AI functionality, including:

- PyTorch models and inference
- Embedding generation
- Model optimization
- Training pipelines
- FastAPI server for model serving

## Getting Started

1. Run the setup script to create a virtual environment and install dependencies:
   ```
   .\setup_env.ps1
   ```

2. Activate the virtual environment:
   ```
   .\.venv\Scripts\Activate.ps1
   ```

3. Run the FastAPI server:
   ```
   cd python
   uvicorn api.main:app --reload
   ```

4. Access the API documentation at http://localhost:8000/docs

## Testing

Run tests with pytest:
```
pytest python/tests
```

For GPU-specific tests:
```
pytest python/tests -m gpu
```

For performance benchmarks:
```
pytest python/tests/performance --benchmark-only
```

## Code Quality

Format code with Black:
```
black python/
```

Check code with pylint:
```
pylint python/
```

Check types with mypy:
```
mypy python/
```
"@ | Out-File -FilePath python/README.md -Encoding utf8

# Create a simple start script
@"
# Start script for development
# This script starts both the Next.js app and the Python API server

Write-Host "Starting development environment..." -ForegroundColor Green

# Start Python API server in a new window
Start-Process powershell -ArgumentList "-Command cd $PWD; .\.venv\Scripts\Activate.ps1; cd python; uvicorn api.main:app --reload"

# Start Next.js app
Write-Host "Starting Next.js app..." -ForegroundColor Green
npm run dev
"@ | Out-File -FilePath start-dev.ps1 -Encoding utf8

# Make the script executable
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host "To activate the environment, run: .\.venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "To start the development environment, run: .\start-dev.ps1" -ForegroundColor Yellow
Write-Host "To run tests, run: pytest python/tests" -ForegroundColor Yellow

# Run a quick test to verify PyTorch with CUDA
Write-Host "Testing PyTorch CUDA support..." -ForegroundColor Green
python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}'); print(f'GPU device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')" 