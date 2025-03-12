#!/bin/bash
# Run the FastAPI server for the Python AI components
# This script activates the virtual environment and runs the FastAPI server

# Activate the virtual environment
echo -e "\e[32mActivating Python virtual environment...\e[0m"
source .venv/bin/activate

# Check if the virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "\e[31mError: Virtual environment not activated. Please run setup_env.sh first.\e[0m"
    exit 1
fi

# Check if the API file exists
API_PATH="python/api/main.py"
if [ ! -f "$API_PATH" ]; then
    echo -e "\e[31mError: API file not found at $API_PATH\e[0m"
    exit 1
fi

# Start the FastAPI server
echo -e "\e[32mStarting FastAPI server...\e[0m"
echo -e "\e[32mAPI will be available at: http://localhost:8000\e[0m"
echo -e "\e[32mAPI documentation will be available at: http://localhost:8000/docs\e[0m"

# Run the server with hot reload for development
uvicorn python.api.main:app --host 0.0.0.0 --port 8000 --reload 