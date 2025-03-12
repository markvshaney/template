#!/bin/bash
# Run pylint for the Python AI components
# This script activates the virtual environment and runs pylint with various options

# Default values
FIX=false
PATH_TO_CHECK="python"
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX=true
      shift
      ;;
    --path=*)
      PATH_TO_CHECK="${1#*=}"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--fix] [--path=PATH] [--verbose]"
      exit 1
      ;;
  esac
done

# Activate the virtual environment
echo -e "\e[32mActivating Python virtual environment...\e[0m"
source .venv/bin/activate

# Check if the virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "\e[31mError: Virtual environment not activated. Please run setup_env.sh first.\e[0m"
    exit 1
fi

# First run black to format code if fix is requested
if [ "$FIX" = true ]; then
    echo -e "\e[36mRunning black to format code...\e[0m"
    black $PATH_TO_CHECK
    
    echo -e "\e[36mRunning isort to sort imports...\e[0m"
    isort $PATH_TO_CHECK
fi

# Build the pylint command
PYLINT_CMD="pylint"

# Add verbosity if requested
if [ "$VERBOSE" = true ]; then
    PYLINT_CMD="$PYLINT_CMD --verbose"
fi

# Add the path to check
PYLINT_CMD="$PYLINT_CMD $PATH_TO_CHECK"

# Display the command
echo -e "\e[36mRunning: $PYLINT_CMD\e[0m"

# Run pylint
eval $PYLINT_CMD

# Get the exit code
EXIT_CODE=$?

# Interpret the exit code
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\e[32mNo errors or warnings found!\e[0m"
elif [ $(($EXIT_CODE & 1)) -ne 0 ]; then
    echo -e "\e[31mFatal message issued (error preventing pylint from running)\e[0m"
fi

if [ $(($EXIT_CODE & 2)) -ne 0 ]; then
    echo -e "\e[31mError message issued\e[0m"
fi

if [ $(($EXIT_CODE & 4)) -ne 0 ]; then
    echo -e "\e[33mWarning message issued\e[0m"
fi

if [ $(($EXIT_CODE & 8)) -ne 0 ]; then
    echo -e "\e[36mRefactor message issued\e[0m"
fi

if [ $(($EXIT_CODE & 16)) -ne 0 ]; then
    echo -e "\e[34mConvention message issued\e[0m"
fi

if [ $(($EXIT_CODE & 32)) -ne 0 ]; then
    echo -e "\e[31mUsage error\e[0m"
fi

echo -e "\e[32mLint check completed!\e[0m" 