"""
Integration tests for the FastAPI application.

This module contains tests for the FastAPI application endpoints.
"""

import os
import sys
from typing import Dict, Generator

import pytest
from fastapi.testclient import TestClient

# Add the API directory to the path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "api"))

# Import the FastAPI app
from main import app


@pytest.fixture
def client() -> Generator:
    """
    Create a test client for the FastAPI application.
    
    Returns:
        Generator: A test client for the FastAPI application.
    """
    with TestClient(app) as test_client:
        yield test_client


class TestAPI:
    """Tests for the FastAPI application."""
    
    def test_get_status(self, client: TestClient) -> None:
        """Test the status endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "model" in data
        assert "device" in data
        assert isinstance(data["cuda_available"], bool)
    
    def test_create_embedding_single_text(self, client: TestClient) -> None:
        """Test the embedding endpoint with a single text."""
        response = client.post(
            "/embed",
            json={"texts": "This is a test sentence.", "normalize": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 1
        assert len(data["embeddings"][0]) > 0
        assert data["dimensions"] == len(data["embeddings"][0])
    
    def test_create_embedding_multiple_texts(self, client: TestClient) -> None:
        """Test the embedding endpoint with multiple texts."""
        response = client.post(
            "/embed",
            json={
                "texts": [
                    "This is the first test sentence.",
                    "This is the second test sentence."
                ],
                "normalize": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 2
        assert len(data["embeddings"][0]) > 0
        assert data["dimensions"] == len(data["embeddings"][0])
    
    def test_create_embedding_empty_text(self, client: TestClient) -> None:
        """Test the embedding endpoint with an empty text."""
        response = client.post(
            "/embed",
            json={"texts": "", "normalize": True}
        )
        assert response.status_code == 500
        assert "detail" in response.json()
    
    def test_calculate_similarity(self, client: TestClient) -> None:
        """Test the similarity endpoint."""
        response = client.post(
            "/similarity",
            json={
                "text1": "This is a test sentence about artificial intelligence.",
                "text2": "AI is a fascinating field of computer science."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "similarity" in data
        assert 0 <= data["similarity"] <= 1
    
    def test_calculate_similarity_identical_texts(self, client: TestClient) -> None:
        """Test the similarity endpoint with identical texts."""
        text = "This is a test sentence."
        response = client.post(
            "/similarity",
            json={"text1": text, "text2": text}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["similarity"] > 0.99  # Should be very close to 1
    
    def test_calculate_similarity_different_texts(self, client: TestClient) -> None:
        """Test the similarity endpoint with very different texts."""
        response = client.post(
            "/similarity",
            json={
                "text1": "Artificial intelligence is a branch of computer science.",
                "text2": "The weather is nice today in San Francisco."
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Different topics should have lower similarity
        assert data["similarity"] < 0.8 