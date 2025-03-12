"""
Performance tests for the embedding model.

This module contains performance tests for the EmbeddingModel class.
"""

import os
import sys
from typing import List

import pytest
import torch

# Add the parent directory to the path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "models"))

# Import the EmbeddingModel
from embedding import EmbeddingModel


@pytest.fixture(scope="module")
def embedding_model() -> EmbeddingModel:
    """
    Create an embedding model for testing.
    
    Returns:
        EmbeddingModel: An instance of the EmbeddingModel class.
    """
    # Use a small model for faster testing
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return EmbeddingModel(model_name=model_name, device=device)


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
def large_sample_texts() -> List[str]:
    """
    Provide a larger set of sample texts for testing.
    
    Returns:
        List[str]: A list of sample texts.
    """
    base_texts = [
        "This is a sample text for testing embeddings.",
        "PyTorch is a machine learning framework.",
        "Natural language processing is fascinating.",
        "Embeddings are vector representations of text.",
        "Testing is important for software quality."
    ]
    # Repeat the base texts to create a larger dataset
    return base_texts * 20  # 100 texts


class TestEmbeddingPerformance:
    """Performance tests for the EmbeddingModel class."""
    
    def test_encode_performance(self, embedding_model: EmbeddingModel, sample_texts: List[str], benchmark) -> None:
        """
        Test the performance of the encode method.
        
        Args:
            embedding_model: The embedding model to test.
            sample_texts: Sample texts to encode.
            benchmark: The pytest-benchmark fixture.
        """
        # Benchmark the encode method
        benchmark(lambda: embedding_model.encode(sample_texts))
    
    def test_batch_encode_performance(self, embedding_model: EmbeddingModel, large_sample_texts: List[str], benchmark) -> None:
        """
        Test the performance of the batch_encode method.
        
        Args:
            embedding_model: The embedding model to test.
            large_sample_texts: A larger set of sample texts to encode.
            benchmark: The pytest-benchmark fixture.
        """
        # Benchmark the batch_encode method with different batch sizes
        def encode_with_batch_size_8():
            embedding_model.batch_encode(large_sample_texts, batch_size=8)
        
        def encode_with_batch_size_16():
            embedding_model.batch_encode(large_sample_texts, batch_size=16)
        
        def encode_with_batch_size_32():
            embedding_model.batch_encode(large_sample_texts, batch_size=32)
        
        # Run the benchmarks
        benchmark.pedantic(encode_with_batch_size_8, rounds=3, iterations=2)
        benchmark.pedantic(encode_with_batch_size_16, rounds=3, iterations=2)
        benchmark.pedantic(encode_with_batch_size_32, rounds=3, iterations=2)
    
    @pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available")
    def test_gpu_vs_cpu_performance(self, sample_texts: List[str], benchmark) -> None:
        """
        Compare the performance of GPU vs CPU for encoding.
        
        Args:
            sample_texts: Sample texts to encode.
            benchmark: The pytest-benchmark fixture.
        """
        # Create models on CPU and GPU
        model_name = "sentence-transformers/all-MiniLM-L6-v2"
        cpu_model = EmbeddingModel(model_name=model_name, device="cpu")
        
        # Only create GPU model if CUDA is available
        if torch.cuda.is_available():
            gpu_model = EmbeddingModel(model_name=model_name, device="cuda")
            
            # Benchmark CPU encoding
            benchmark.pedantic(
                lambda: cpu_model.encode(sample_texts),
                name="CPU Encoding",
                rounds=3,
                iterations=2
            )
            
            # Benchmark GPU encoding
            benchmark.pedantic(
                lambda: gpu_model.encode(sample_texts),
                name="GPU Encoding",
                rounds=3,
                iterations=2
            )
    
    def test_similarity_performance(self, embedding_model: EmbeddingModel, sample_texts: List[str], benchmark) -> None:
        """
        Test the performance of the similarity method.
        
        Args:
            embedding_model: The embedding model to test.
            sample_texts: Sample texts to encode.
            benchmark: The pytest-benchmark fixture.
        """
        # Generate embeddings for the sample texts
        embeddings = embedding_model.encode(sample_texts)
        
        # Benchmark the similarity calculation
        def calculate_similarities():
            for i in range(len(embeddings)):
                for j in range(i + 1, len(embeddings)):
                    embedding_model.similarity(embeddings[i:i+1], embeddings[j:j+1])
        
        benchmark(calculate_similarities) 