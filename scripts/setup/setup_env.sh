#!/bin/bash
# Setup script for the Python environment
# This script creates a virtual environment and installs all required dependencies

# Set up colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Python environment...${NC}"

# Check if Python 3.10+ is installed
python_version=$(python3 --version 2>&1 | awk '{print $2}')
python_major=$(echo $python_version | cut -d. -f1)
python_minor=$(echo $python_version | cut -d. -f2)

if [ "$python_major" -lt 3 ] || ([ "$python_major" -eq 3 ] && [ "$python_minor" -lt 10 ]); then
    echo -e "${RED}Error: Python 3.10 or higher is required. Found Python $python_version${NC}"
    exit 1
fi

echo -e "${CYAN}Using Python $python_version${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "${CYAN}Creating virtual environment...${NC}"
    python3 -m venv .venv
else
    echo -e "${CYAN}Virtual environment already exists.${NC}"
fi

# Activate virtual environment
echo -e "${CYAN}Activating virtual environment...${NC}"
source .venv/bin/activate

# Upgrade pip
echo -e "${CYAN}Upgrading pip...${NC}"
pip install --upgrade pip

# Install PyTorch with CUDA support
echo -e "${CYAN}Installing PyTorch with CUDA support...${NC}"
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install dependencies from requirements.txt if it exists
if [ -f "requirements.txt" ]; then
    echo -e "${CYAN}Installing dependencies from requirements.txt...${NC}"
    pip install -r requirements.txt
else
    echo -e "${CYAN}Installing dependencies...${NC}"
    pip install transformers datasets accelerate fastapi uvicorn pytest pytest-cov pytest-benchmark black pylint
fi

# Create directory structure
echo -e "${CYAN}Creating directory structure...${NC}"
mkdir -p python/api
mkdir -p python/models
mkdir -p python/tests/unit
mkdir -p python/tests/integration
mkdir -p python/tests/performance

# Make scripts executable
echo -e "${CYAN}Making scripts executable...${NC}"
chmod +x scripts/*.sh

echo -e "${GREEN}Python environment setup complete!${NC}"
echo -e "${GREEN}To activate the environment, run: source .venv/bin/activate${NC}"
echo -e "${GREEN}To run the API server, run: ./scripts/run_api.sh${NC}"
echo -e "${GREEN}To run tests, run: ./scripts/run_tests.sh${NC}"
echo -e "${GREEN}To run linting, run: ./scripts/run_lint.sh${NC}" 