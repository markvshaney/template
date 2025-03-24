# Contributing to the Project

Thank you for your interest in contributing to our project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Contributing to the Project](#contributing-to-the-project)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
  - [Development Workflow](#development-workflow)
  - [Pull Request Process](#pull-request-process)
  - [Coding Standards](#coding-standards)
    - [Python](#python)
    - [TypeScript/JavaScript](#typescriptjavascript)
  - [Testing Guidelines](#testing-guidelines)
  - [Documentation](#documentation)
  - [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/REPOSITORY-NAME.git
   cd REPOSITORY-NAME
   ```
3. **Set up the development environment**:

   ```bash
   # For Windows
   .\scripts\setup\setup_env.ps1

   # For Unix/Linux/macOS
   ./scripts/setup/setup_env.sh
   ```

4. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

Please follow the workflow outlined in [.cursorrules/workflow.md](../.cursorrules/workflow.md) for step-by-step guidance on the development process.

For Git-specific workflows, refer to [docs/git_info/Git_Protocol.md](docs/git_info/Git_Protocol.md).

## Pull Request Process

1. **Update your fork** with the latest changes from the main repository
2. **Run tests** to ensure your changes don't break existing functionality
3. **Update documentation** if necessary
4. **Submit a pull request** with a clear description of the changes
5. **Address review feedback** promptly

See [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) for the expected format of pull requests.

## Coding Standards

### Python

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use type hints for all function parameters and return values
- Document functions and classes with docstrings
- Maximum line length of 100 characters
- Use double quotes for strings
- Run `pylint` and `mypy` before submitting code

For more details, see [.cursorrules/python_code_quality.md](.cursorrules/python_code_quality.md).

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the project's ESLint and Prettier configurations
- Use double quotes for strings
- Prefer template literals for string concatenation
- Use 2-space indentation
- Use async/await over Promise chains

For more details, see [.cursorrules/typescript.md](.cursorrules/typescript.md).

## Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for at least 80% test coverage for new code
- Follow the test organization structure in `python/tests/`
- Use pytest for Python tests
- Use Jest for TypeScript/JavaScript tests

For more details, see [.cursorrules/testing.md](.cursorrules/testing.md) and [.cursorrules/python_testing.md](.cursorrules/python_testing.md).

## Documentation

- Update documentation for all user-facing changes
- Document all public APIs
- Keep README.md up to date
- Add examples for complex functionality
- Document architecture decisions in `docs/architecture/`

## Issue Reporting

- Use the issue templates provided in `.github/ISSUE_TEMPLATE/`
- Provide clear steps to reproduce bugs
- Include relevant environment information
- Suggest solutions if possible

Thank you for contributing to our project!
