# AI-Enhanced Project Template

A comprehensive project template for AI-enhanced applications, integrating PyTorch, pytest, and pylint for robust development.

## Project Overview

This template provides a structured foundation for building AI-enhanced applications with a focus on:

- PyTorch-based model development and optimization
- FastAPI for serving AI models
- Comprehensive testing with pytest
- Code quality enforcement with pylint
- Seamless integration between Python AI components and JavaScript/TypeScript frontend

## Installation Instructions

### Prerequisites

- Python 3.10+
- Node.js 16+
- NVIDIA GPU with CUDA support (recommended)

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd <project-directory>
```

2. **Set up the Python environment**

```bash
# On Windows
.\scripts\setup\setup_env.ps1

# On Linux/macOS
./scripts/setup/setup_env.sh
```

This script will:

- Create a Python virtual environment
- Install all required dependencies
- Set up the project structure
- Configure testing and linting tools

3. **Verify the setup**

```bash
# Activate the virtual environment
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate     # Linux/macOS

# Verify PyTorch with CUDA
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

## Usage

### Running the FastAPI Server

```bash
# On Windows
.\scripts\dev\run_api.ps1

# On Linux/macOS
./scripts/dev/run_api.sh
```

The API will be available at http://localhost:8000 with documentation at http://localhost:8000/docs.

### Running Tests

```bash
# On Windows
.\scripts\dev\run_tests.ps1 -Unit      # Run unit tests
.\scripts\dev\run_tests.ps1 -Integration  # Run integration tests
.\scripts\dev\run_tests.ps1 -Performance  # Run performance tests
.\scripts\dev\run_tests.ps1 -Coverage  # Run tests with coverage
.\scripts\dev\run_tests.ps1 -All       # Run all tests

# On Linux/macOS
./scripts/dev/run_tests.sh --unit
./scripts/dev/run_tests.sh --integration
./scripts/dev/run_tests.sh --performance
./scripts/dev/run_tests.sh --coverage
./scripts/dev/run_tests.sh --all
```

### Running Linting

```bash
# On Windows
.\scripts\dev\run_lint.ps1            # Run pylint
.\scripts\dev\run_lint.ps1 -Fix       # Run black and isort to fix formatting

# On Linux/macOS
./scripts/dev/run_lint.sh
./scripts/dev/run_lint.sh --fix
```

## Project Structure

```
├── .config/                # Configuration files
├── .cursorrules/           # Project guidelines and standards
├── .github/                # GitHub templates and workflows
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── workflows/          # GitHub Actions workflows
├── .venv/                  # Python virtual environment
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── architecture/       # Architecture documentation
│   ├── checklist_step_summaries/ # Implementation summaries
│   └── git_info/           # Git workflow documentation
├── python/                 # Python AI components
│   ├── api/                # FastAPI server
│   ├── core/               # Core functionality
│   ├── config/             # Configuration management
│   ├── db/                 # Database interactions
│   ├── models/             # PyTorch models
│   ├── services/           # Service layer components
│   ├── utils/              # Utility functions
│   └── tests/              # Tests for Python components
│       ├── unit/           # Unit tests
│       ├── integration/    # Integration tests
│       ├── e2e/            # End-to-end tests
│       └── fixtures/       # Test fixtures
├── scripts/                # Utility scripts
│   ├── ci/                 # CI/CD scripts
│   ├── dev/                # Development scripts
│   └── setup/              # Setup scripts
├── .coveragerc             # Coverage configuration
├── .editorconfig           # Editor configuration
├── .env.example            # Environment variables template
├── .env.test               # Test environment variables
├── .pylintrc               # Pylint configuration
├── CHANGELOG.md            # Version changelog
├── CODE_OF_CONDUCT.md      # Code of conduct
├── CONTRIBUTING.md         # Contributing guidelines
├── pyproject.toml          # Black and isort configuration
├── pytest.ini              # Pytest configuration
└── requirements.txt        # Python dependencies
```

## Documentation

- **Architecture**: See [docs/architecture/overview.md](docs/architecture/overview.md) for system architecture
- **API**: See [docs/api/overview.md](docs/api/overview.md) for API documentation
- **Workflow**: See [docs/workflow.md](docs/workflow.md) for development workflow
- **Git Protocol**: See [docs/git_info/Git_Protocol.md](docs/git_info/Git_Protocol.md) for Git workflow

## Testing with pytest

This project uses pytest for comprehensive testing of Python components:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete workflows
- **Performance Tests**: Benchmark performance using pytest-benchmark
- **GPU Tests**: Tests that specifically require GPU acceleration

Key pytest features used:

- Fixtures for test setup and teardown
- Parameterized tests for testing multiple scenarios
- Markers for categorizing tests
- Coverage reporting for measuring test coverage

## Code Quality with pylint

Code quality is enforced using pylint with custom configuration:

- Consistent code style and formatting
- Type checking and validation
- Error detection and prevention
- Documentation requirements

Additional tools:

- **Black**: Automatic code formatting
- **isort**: Import sorting and organization
- **mypy**: Static type checking

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## Code of Conduct

Please see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our code of conduct.

## License

[MIT License](LICENSE)
