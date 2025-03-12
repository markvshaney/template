#!/bin/bash
# Run pytest for the Python AI components
# This script activates the virtual environment and runs pytest with various options

# Default values
ALL=false
UNIT=false
INTEGRATION=false
PERFORMANCE=false
GPU=false
COVERAGE=false
VERBOSE=false
FILTER=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      ALL=true
      shift
      ;;
    --unit)
      UNIT=true
      shift
      ;;
    --integration)
      INTEGRATION=true
      shift
      ;;
    --performance)
      PERFORMANCE=true
      shift
      ;;
    --gpu)
      GPU=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --filter=*)
      FILTER="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--all] [--unit] [--integration] [--performance] [--gpu] [--coverage] [--verbose] [--filter=PATTERN]"
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

# Build the pytest command
PYTEST_CMD="pytest"

# Add verbosity if requested
if [ "$VERBOSE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
fi

# Add coverage if requested
if [ "$COVERAGE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=python --cov-report=term --cov-report=html"
fi

# Determine which tests to run
if [ "$UNIT" = true ]; then
    PYTEST_CMD="$PYTEST_CMD python/tests/unit"
elif [ "$INTEGRATION" = true ]; then
    PYTEST_CMD="$PYTEST_CMD python/tests/integration"
elif [ "$PERFORMANCE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD python/tests/performance"
elif [ "$GPU" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -m gpu"
elif [ -n "$FILTER" ]; then
    PYTEST_CMD="$PYTEST_CMD $FILTER"
elif [ "$ALL" = true ] || [ "$UNIT" = false ] && [ "$INTEGRATION" = false ] && [ "$PERFORMANCE" = false ] && [ "$GPU" = false ] && [ -z "$FILTER" ]; then
    PYTEST_CMD="$PYTEST_CMD python/tests"
fi

# Display the command
echo -e "\e[36mRunning: $PYTEST_CMD\e[0m"

# Run the tests
eval $PYTEST_CMD

# If coverage was generated, show the path to the HTML report
if [ "$COVERAGE" = true ]; then
    echo -e "\e[32mCoverage HTML report generated at: $(pwd)/htmlcov/index.html\e[0m"
fi

echo -e "\e[32mTests completed!\e[0m" 