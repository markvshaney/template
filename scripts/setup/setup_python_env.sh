#!/bin/bash
# Python Environment Setup Script
# This script sets up a Python virtual environment with all necessary dependencies

# Exit on error
set -e

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install PyTorch (CPU version by default)
echo "Installing PyTorch..."
pip install torch torchvision torchaudio

# For CUDA support, uncomment the appropriate line:
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 # CUDA 11.8
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 # CUDA 12.1

# Install Hugging Face libraries
echo "Installing Hugging Face libraries..."
pip install transformers datasets accelerate peft bitsandbytes sentencepiece protobuf

# Install ONNX and optimization tools
echo "Installing ONNX and optimization tools..."
pip install onnx onnxruntime optimum

# Install FastAPI and related packages
echo "Installing FastAPI and related packages..."
pip install fastapi uvicorn pydantic python-multipart

# Install vector database clients
echo "Installing vector database clients..."
pip install pinecone-client faiss-cpu psycopg2-binary

# Install testing and development tools
echo "Installing testing and development tools..."
pip install pytest pytest-cov pytest-benchmark pytest-mock black pylint mypy pre-commit

# Install any additional requirements if requirements.txt exists
if [ -f "requirements.txt" ]; then
  echo "Installing additional requirements from requirements.txt..."
  pip install -r requirements.txt
fi

# Create Python directories if they don't exist
mkdir -p python/api
mkdir -p python/models
mkdir -p python/embeddings
mkdir -p python/training
mkdir -p python/optimization
mkdir -p python/utils
mkdir -p python/tests/unit/models
mkdir -p python/tests/unit/embeddings
mkdir -p python/tests/unit/training
mkdir -p python/tests/unit/optimization
mkdir -p python/tests/integration
mkdir -p python/tests/performance

# Create initial configuration files
echo "Creating initial configuration files..."

# Create pytest.ini
cat > pytest.ini << EOF
[pytest]
testpaths = python/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    gpu: marks tests that require GPU
EOF

# Create .coveragerc
cat > .coveragerc << EOF
[run]
source = python
omit = python/tests/*
EOF

# Create initial conftest.py
cat > python/tests/conftest.py << EOF
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
EOF

# Create a Windows version of the script
cat > scripts/setup_python_env.ps1 << EOF
# Python Environment Setup Script for Windows
# This script sets up a Python virtual environment with all necessary dependencies

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
}

# Activate virtual environment
. .venv/Scripts/Activate.ps1

# Upgrade pip
pip install --upgrade pip

# Install PyTorch (CPU version by default)
Write-Host "Installing PyTorch..."
pip install torch torchvision torchaudio

# For CUDA support, uncomment the appropriate line:
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 # CUDA 11.8
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 # CUDA 12.1

# Install Hugging Face libraries
Write-Host "Installing Hugging Face libraries..."
pip install transformers datasets accelerate peft bitsandbytes sentencepiece protobuf

# Install ONNX and optimization tools
Write-Host "Installing ONNX and optimization tools..."
pip install onnx onnxruntime optimum

# Install FastAPI and related packages
Write-Host "Installing FastAPI and related packages..."
pip install fastapi uvicorn pydantic python-multipart

# Install vector database clients
Write-Host "Installing vector database clients..."
pip install pinecone-client faiss-cpu psycopg2-binary

# Install testing and development tools
Write-Host "Installing testing and development tools..."
pip install pytest pytest-cov pytest-benchmark pytest-mock black pylint mypy pre-commit

# Install any additional requirements if requirements.txt exists
if (Test-Path "requirements.txt") {
    Write-Host "Installing additional requirements from requirements.txt..."
    pip install -r requirements.txt
}

# Create Python directories if they don't exist
mkdir -Force python/api
mkdir -Force python/models
mkdir -Force python/embeddings
mkdir -Force python/training
mkdir -Force python/optimization
mkdir -Force python/utils
mkdir -Force python/tests/unit/models
mkdir -Force python/tests/unit/embeddings
mkdir -Force python/tests/unit/training
mkdir -Force python/tests/unit/optimization
mkdir -Force python/tests/integration
mkdir -Force python/tests/performance

# Create initial configuration files
Write-Host "Creating initial configuration files..."

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

Write-Host "Python environment setup complete!"
EOF

echo "Python environment setup complete!" 