"""
Tests for the embedding model.

This module contains tests for the EmbeddingModel class.
"""

import pytest
import torch
from transformers import AutoModel, AutoTokenizer

from python.models.embedding import EmbeddingModel


@pytest.fixture
def embedding_model():
    """Create a test embedding model."""
    # Use a small model for testing
    model = EmbeddingModel(model_name="sentence-transformers/all-MiniLM-L6-v2")
    yield model
    # Clean up
    del model
    torch.cuda.empty_cache()


@pytest.fixture
def sample_texts():
    """Provide sample texts for testing."""
    return [
        "This is a sample sentence for testing.",
        "Another example sentence to encode.",
        "A third sentence to make a batch.",
    ]


class TestEmbeddingModel:
    """Test suite for the EmbeddingModel class."""

    def test_initialization(self):
        """Test that the model initializes correctly."""
        model = EmbeddingModel()
        assert model.model_name == "sentence-transformers/all-MiniLM-L6-v2"
        assert model.max_length == 512
        assert model.device.type in ["cuda", "cpu"]
        assert isinstance(model.model, AutoModel)
        assert isinstance(model.tokenizer, AutoTokenizer)

    def test_initialization_with_invalid_model(self):
        """Test that initialization with invalid model raises an error."""
        with pytest.raises(ValueError):
            EmbeddingModel(model_name="")

    def test_encode_single_text(self, embedding_model):
        """Test encoding a single text string."""
        text = "This is a test sentence."
        embedding = embedding_model.encode(text)
        
        # Check shape and properties
        assert isinstance(embedding, torch.Tensor)
        assert embedding.shape == (1, embedding_model.embedding_dim)
        assert embedding.device.type == embedding_model.device.type
        
        # Check normalization
        assert torch.allclose(torch.norm(embedding, p=2, dim=1), torch.tensor([1.0], device=embedding.device))

    def test_encode_multiple_texts(self, embedding_model, sample_texts):
        """Test encoding multiple texts."""
        embeddings = embedding_model.encode(sample_texts)
        
        # Check shape and properties
        assert isinstance(embeddings, torch.Tensor)
        assert embeddings.shape == (len(sample_texts), embedding_model.embedding_dim)
        
        # Check normalization
        norms = torch.norm(embeddings, p=2, dim=1)
        assert torch.allclose(norms, torch.ones_like(norms))

    def test_encode_empty_input(self, embedding_model):
        """Test that encoding empty input raises an error."""
        with pytest.raises(ValueError, match="Input texts cannot be empty"):
            embedding_model.encode("")
        
        with pytest.raises(ValueError, match="Input texts cannot be empty"):
            embedding_model.encode([])

    def test_similarity(self, embedding_model):
        """Test similarity calculation between embeddings."""
        text1 = "This is a sentence about artificial intelligence."
        text2 = "AI is transforming the technology landscape."
        text3 = "The weather is nice today."
        
        embedding1 = embedding_model.encode(text1)
        embedding2 = embedding_model.encode(text2)
        embedding3 = embedding_model.encode(text3)
        
        # Similar texts should have higher similarity
        sim_1_2 = embedding_model.similarity(embedding1, embedding2)
        sim_1_3 = embedding_model.similarity(embedding1, embedding3)
        
        assert 0 <= sim_1_2 <= 1
        assert 0 <= sim_1_3 <= 1
        assert sim_1_2 > sim_1_3  # AI-related texts should be more similar

    def test_similarity_with_mismatched_shapes(self, embedding_model):
        """Test that similarity with mismatched shapes raises an error."""
        embedding1 = torch.randn(1, embedding_model.embedding_dim)
        embedding2 = torch.randn(2, embedding_model.embedding_dim)
        
        with pytest.raises(ValueError, match="Embeddings must have the same shape"):
            embedding_model.similarity(embedding1, embedding2)

    def test_batch_encode(self, embedding_model, sample_texts):
        """Test batch encoding with different batch sizes."""
        # Encode all at once
        all_embeddings = embedding_model.encode(sample_texts)
        
        # Encode in batches of 2
        batch_embeddings = embedding_model.batch_encode(sample_texts, batch_size=2)
        
        # Results should be the same
        assert torch.allclose(all_embeddings, batch_embeddings)

    @pytest.mark.parametrize("batch_size", [0, -1])
    def test_batch_encode_invalid_batch_size(self, embedding_model, sample_texts, batch_size):
        """Test that batch encoding with invalid batch size raises an error."""
        with pytest.raises(ValueError, match="Batch size must be positive"):
            embedding_model.batch_encode(sample_texts, batch_size=batch_size)

    @pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA not available")
    def test_gpu_usage(self):
        """Test that the model uses GPU when available."""
        model = EmbeddingModel(device="cuda")
        assert model.device.type == "cuda"
        assert next(model.model.parameters()).device.type == "cuda"
        
        # Test encoding
        text = "This is a test sentence."
        embedding = model.encode(text)
        assert embedding.device.type == "cuda"

    @pytest.mark.benchmark
    def test_encoding_performance(self, benchmark, embedding_model):
        """Benchmark the encoding performance."""
        text = "This is a test sentence for benchmarking encoding performance."
        
        # Use pytest-benchmark to measure performance
        result = benchmark(embedding_model.encode, text)
        
        # Verify result
        assert isinstance(result, torch.Tensor)
        assert result.shape == (1, embedding_model.embedding_dim)

    def test_mean_pooling(self, embedding_model):
        """Test the mean pooling function."""
        # Create dummy inputs
        batch_size = 2
        seq_length = 4
        hidden_size = embedding_model.embedding_dim
        
        # Create dummy model output and attention mask
        last_hidden_state = torch.randn(batch_size, seq_length, hidden_size)
        attention_mask = torch.ones(batch_size, seq_length)
        
        # Set some tokens to be masked (0)
        attention_mask[0, 3] = 0
        attention_mask[1, 2:] = 0
        
        # Create a dummy model output
        class DummyModelOutput:
            def __init__(self, last_hidden_state):
                self.last_hidden_state = last_hidden_state
        
        model_output = DummyModelOutput(last_hidden_state)
        
        # Call mean pooling
        pooled = embedding_model._mean_pooling(model_output, attention_mask)
        
        # Check shape
        assert pooled.shape == (batch_size, hidden_size)
        
        # Manual calculation for verification
        expected_0 = last_hidden_state[0, :3].mean(dim=0)  # Average first 3 tokens for first example
        expected_1 = last_hidden_state[1, :2].mean(dim=0)  # Average first 2 tokens for second example
        
        # Check results
        assert torch.allclose(pooled[0], expected_0)
        assert torch.allclose(pooled[1], expected_1) 