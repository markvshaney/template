"""
Pytest configuration file.

This module contains fixtures and configuration for pytest.
"""

import os
import random
from typing import Dict, List

import numpy as np
import pytest
import torch


@pytest.fixture(scope="session", autouse=True)
def set_random_seed() -> None:
    """
    Set random seeds for reproducibility.
    
    This fixture sets random seeds for Python's random module, NumPy, and PyTorch
    to ensure reproducible test results.
    """
    seed = 42
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    
    # Make PyTorch operations deterministic
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


@pytest.fixture(scope="session")
def device() -> str:
    """
    Determine the device to use for tests.
    
    Returns:
        str: The device to use for tests (cuda or cpu).
    """
    return "cuda" if torch.cuda.is_available() else "cpu"


@pytest.fixture
def sample_texts() -> List[str]:
    """
    Provide sample texts for testing.
    
    Returns:
        List[str]: A list of sample texts.
    """
    return [
        "This is a sample text for testing embeddings.",
        "PyTorch is a machine learning framework.",
        "Natural language processing is fascinating.",
        "Embeddings are vector representations of text.",
        "Testing is important for software quality."
    ]


@pytest.fixture
def sample_embeddings(device: str) -> torch.Tensor:
    """
    Provide sample embeddings for testing.
    
    Args:
        device: The device to use for the embeddings.
    
    Returns:
        torch.Tensor: A tensor of sample embeddings.
    """
    # Create 5 embeddings of dimension 10
    embeddings = torch.randn(5, 10, device=device)
    # Normalize the embeddings
    embeddings = embeddings / torch.norm(embeddings, dim=1, keepdim=True)
    return embeddings


@pytest.fixture
def sample_attention_mask() -> torch.Tensor:
    """
    Provide a sample attention mask for testing.
    
    Returns:
        torch.Tensor: A tensor representing an attention mask.
    """
    # Create a mask for 5 sequences of length 10
    # 1 means the token is not masked, 0 means it is masked
    mask = torch.ones(5, 10)
    # Mask some tokens in each sequence
    for i in range(5):
        # Mask a random number of tokens at the end
        mask_length = random.randint(1, 3)
        mask[i, -mask_length:] = 0
    return mask


@pytest.fixture
def gpu_only() -> None:
    """
    Skip tests if CUDA is not available.
    """
    if not torch.cuda.is_available():
        pytest.skip("Test requires GPU")


# Mark tests that require GPU
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "gpu: mark test as requiring GPU")


# Skip GPU tests if CUDA is not available
def pytest_runtest_setup(item):
    """Skip GPU tests if CUDA is not available."""
    if "gpu" in item.keywords and not torch.cuda.is_available():
        pytest.skip("Test requires GPU") 