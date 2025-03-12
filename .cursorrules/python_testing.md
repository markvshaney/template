# Python Testing Guidelines

This document outlines the Python testing standards and best practices for this project.

## Testing Framework

We use pytest for all Python tests, with a focus on:

- Unit tests for individual functions and classes
- Integration tests for model pipelines
- Performance tests for critical operations

## Test Organization

```
python/tests/
├── unit/                 # Unit tests
│   ├── models/           # Model tests
│   ├── training/         # Training tests
│   └── optimization/     # Optimization tests
├── integration/          # Integration tests
├── performance/          # Performance tests
└── conftest.py           # Shared fixtures
```

## Writing Tests

### Basic Test Structure

```python
def test_function_name():
    # Arrange
    input_data = "test input"
    
    # Act
    result = function_to_test(input_data)
    
    # Assert
    assert result == "expected output"
```

### Using Fixtures

```python
@pytest.fixture
def model():
    """Create a test model instance."""
    model = load_model("test-model")
    yield model
    # Clean up resources
    del model
    torch.cuda.empty_cache()

def test_with_fixture(model):
    """Test model generation with fixture."""
    result = model.generate("test input")
    assert len(result) > 0
```

### Parameterized Tests

```python
@pytest.mark.parametrize(
    "input_text,expected_length", 
    [
        ("Short prompt", 50),
        ("Longer detailed prompt with specific instructions", 200),
    ]
)
def test_generation_length(model, input_text, expected_length):
    """Test that generation respects expected output length."""
    result = model.generate(input_text)
    # Allow some flexibility in length
    assert len(result) >= expected_length * 0.8
    assert len(result) <= expected_length * 1.2
```

### Testing PyTorch Models

#### Tensor Comparison

```python
def test_embedding_dimensions(embedding_model):
    """Test that embeddings have the correct dimensions."""
    text = "This is a test sentence."
    embedding = embedding_model.encode(text)
    
    assert isinstance(embedding, torch.Tensor)
    assert embedding.shape == (768,)  # Expected dimension
    assert not torch.isnan(embedding).any()
```

#### GPU Testing

```python
@pytest.mark.parametrize("device", ["cpu", "cuda:0"])
def test_model_on_device(device):
    """Test model works on both CPU and GPU."""
    if device == "cuda:0" and not torch.cuda.is_available():
        pytest.skip("CUDA not available")
    
    model = MyModel().to(device)
    input_tensor = torch.randn(1, 10).to(device)
    output = model(input_tensor)
    assert output.device.type == device.split(":")[0]
```

#### Memory Management

```python
def test_memory_cleanup():
    """Test that memory is properly cleaned up after model use."""
    if not torch.cuda.is_available():
        pytest.skip("CUDA not available")
    
    # Record initial memory usage
    torch.cuda.empty_cache()
    initial_memory = torch.cuda.memory_allocated()
    
    # Use model
    model = LargeModel().cuda()
    output = model(torch.randn(1, 10).cuda())
    del output
    del model
    
    # Force garbage collection
    import gc
    gc.collect()
    torch.cuda.empty_cache()
    
    # Check memory returned to initial state
    final_memory = torch.cuda.memory_allocated()
    assert final_memory <= initial_memory + 10**6  # Allow small overhead
```

## Performance Testing

```python
def test_inference_performance(benchmark, model):
    """Benchmark model inference performance."""
    input_text = "Explain the concept of artificial intelligence."
    
    # Use pytest-benchmark to measure performance
    result = benchmark(model.generate, input_text)
    
    # Verify result quality
    assert len(result) > 50
    assert "artificial intelligence" in result.lower()
```

## Mocking External Services

```python
def test_api_with_mock(mocker):
    """Test API client with mocked responses."""
    # Mock the requests library
    mock_response = mocker.Mock()
    mock_response.json.return_value = {"result": "mocked data"}
    mock_response.status_code = 200
    
    mocker.patch("requests.post", return_value=mock_response)
    
    # Test the function that uses requests
    result = api_client.fetch_data("test query")
    assert result == "mocked data"
```

## Testing with Environment Variables

```python
def test_with_env_vars(monkeypatch):
    """Test behavior with different environment variables."""
    # Set environment variable for the test
    monkeypatch.setenv("MODEL_PRECISION", "fp16")
    
    # Function should use the environment variable
    model = load_model_with_env_config()
    assert model.precision == "fp16"
```

## Code Coverage

We use pytest-cov to track test coverage:

```bash
pytest --cov=python/src python/tests/
```

Coverage reports should be generated for CI/CD pipelines and can be viewed locally with:

```bash
pytest --cov=python/src --cov-report=html python/tests/
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests.

2. **Deterministic Tests**: Set random seeds for reproducibility:
   ```python
   @pytest.fixture(autouse=True)
   def set_random_seed():
       """Set random seeds for reproducibility."""
       torch.manual_seed(42)
       torch.cuda.manual_seed_all(42)
       numpy.random.seed(42)
       random.seed(42)
   ```

3. **Mock External Services**: Always mock external API calls and database operations.

4. **Test Edge Cases**: Include tests for error conditions and boundary values.

5. **Performance Awareness**: Be mindful of test execution time, especially for model loading.

6. **Clean Up Resources**: Always clean up GPU memory and file handles in test fixtures.

7. **CI Integration**: Ensure tests run in CI environment with appropriate GPU/CPU settings.

## Pre-commit Integration

We use pre-commit to run pytest on changed Python files:

```yaml
# .pre-commit-config.yaml
- repo: local
  hooks:
    - id: pytest-check
      name: pytest-check
      entry: pytest
      language: system
      pass_filenames: false
      always_run: true
      args: ["python/tests/"]
```

## VS Code Integration

```json
// .vscode/settings.json
{
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.nosetestsEnabled": false,
  "python.testing.pytestArgs": [
    "python/tests"
  ]
}
``` 