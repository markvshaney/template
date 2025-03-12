# Python Code Quality Guidelines

This document outlines the Python code quality standards and best practices for this project.

## Linting with Pylint

We use pylint as our primary Python linter to enforce code quality standards. Pylint helps identify coding errors, enforce coding standards, and detect potential bugs.

### Configuration

We maintain a `.pylintrc` file at the root of the project with our custom configuration:

```ini
[MASTER]
load-plugins=pylint_plugins.torch_checker

[MESSAGES CONTROL]
disable=C0111,R0903,C0103

[FORMAT]
max-line-length=100

[DESIGN]
max-args=6
max-attributes=12
```

### Custom Checkers

We've implemented custom pylint checkers for PyTorch-specific patterns:

```python
# pylint_plugins/torch_checker.py
from pylint.checkers import BaseChecker
from pylint.interfaces import IAstroidChecker

class TorchChecker(BaseChecker):
    __implements__ = IAstroidChecker
    
    name = 'torch'
    priority = -1
    msgs = {
        'W5001': (
            'Tensor operation outside of no_grad context in inference function',
            'torch-missing-no-grad',
            'Inference functions should use torch.no_grad() for efficiency'
        ),
        'W5002': (
            'GPU tensor not explicitly moved back to CPU before return',
            'torch-gpu-to-cpu',
            'Tensors should be moved to CPU before returning from API functions'
        ),
    }
    
    def visit_functiondef(self, node):
        # Implementation of checks
        pass
```

## Code Formatting with Black

We use Black for consistent code formatting:

```bash
black python/ --line-length 100
```

Black configuration is specified in `pyproject.toml`:

```toml
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
```

## Type Checking with MyPy

We use MyPy for static type checking:

```bash
mypy python/
```

MyPy configuration in `pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true

[[tool.mypy.overrides]]
module = "torch.*"
ignore_missing_imports = true
```

## Pre-commit Integration

We use pre-commit to run linters and formatters before each commit:

```yaml
# .pre-commit-config.yaml
repos:
-   repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
    -   id: isort
        args: ["--profile", "black", "--filter-files"]
-   repo: https://github.com/psf/black
    rev: 23.10.0
    hooks:
    -   id: black
        language_version: python3.9
-   repo: https://github.com/pycqa/pylint
    rev: v2.17.0
    hooks:
    -   id: pylint
        additional_dependencies: [pylint-plugins]
-   repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.5.0
    hooks:
    -   id: mypy
        additional_dependencies: [types-requests, types-PyYAML]
```

## Docstring Standards

We follow Google-style docstrings:

```python
def embed_text(text: str, model_name: str = "all-MiniLM-L6-v2") -> np.ndarray:
    """
    Generate embedding vector for input text.
    
    Args:
        text: Input text to embed
        model_name: Name of the embedding model to use
        
    Returns:
        numpy.ndarray: Embedding vector
        
    Raises:
        ValueError: If text is empty or model_name is not supported
    """
    # Implementation
```

## Import Organization

Imports should be organized in the following order:

1. Standard library imports
2. Related third-party imports
3. Local application/library specific imports

```python
# Standard library
import os
import sys
from typing import Dict, List, Optional

# Third-party
import numpy as np
import torch
import torch.nn as nn
from transformers import AutoModel

# Local
from .utils import setup_logger
from ..config import ModelConfig
```

## PyTorch-Specific Guidelines

### 1. Memory Management

Always use context managers for inference:

```python
# Good
with torch.no_grad():
    output = model(input_tensor)

# Bad
output = model(input_tensor)
```

Clean up GPU memory explicitly:

```python
def process_batch(model, data):
    with torch.no_grad():
        intermediate = torch.zeros(1000, 1000).cuda()
        result = model(data) + intermediate
        # Clean up
        del intermediate
        torch.cuda.empty_cache()
    return result
```

### 2. Device Management

Be explicit about device placement:

```python
# Good
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
input_tensor = input_tensor.to(device)

# Bad
if torch.cuda.is_available():
    model = model.cuda()
```

### 3. Error Handling

Provide informative error messages:

```python
# Good
if not torch.cuda.is_available() and device == "cuda":
    raise RuntimeError(
        "CUDA requested but not available. "
        "Please check your installation or use device='cpu'"
    )

# Bad
assert torch.cuda.is_available()
```

### 4. Type Annotations

Use proper type annotations for PyTorch objects:

```python
from typing import Dict, List, Tuple, Union
import torch
from torch import Tensor

def process_features(
    features: Tensor,
    weights: Optional[Dict[str, Tensor]] = None
) -> Tuple[Tensor, float]:
    """Process feature tensor with optional weights."""
    # Implementation
```

## CI Integration

Our CI pipeline runs pylint, black, mypy, and pytest:

```yaml
# .github/workflows/python-lint.yml
name: Python Linting

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements-dev.txt
    - name: Check formatting with black
      run: |
        black --check python/
    - name: Lint with pylint
      run: |
        pylint python/
    - name: Type check with mypy
      run: |
        mypy python/
```

## VS Code Integration

```json
// .vscode/settings.json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.linting.pylintArgs": [
    "--rcfile=.pylintrc"
  ],
  "python.formatting.provider": "black",
  "python.formatting.blackArgs": [
    "--line-length",
    "100"
  ],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "python.linting.mypyEnabled": true
}
```

## Best Practices

1. **Consistent Style**: Follow PEP 8 and project-specific style guidelines
2. **Descriptive Naming**: Use clear, descriptive names for variables, functions, and classes
3. **Function Length**: Keep functions focused and under 50 lines where possible
4. **Comments**: Add comments for complex logic, but prefer self-documenting code
5. **Error Handling**: Use specific exceptions and provide helpful error messages
6. **Testing**: Ensure all code has corresponding tests
7. **Documentation**: Document all public APIs with proper docstrings
8. **Type Hints**: Use type hints consistently throughout the codebase 