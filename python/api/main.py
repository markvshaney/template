"""
FastAPI server for the AI components.

This module provides a REST API for the AI components, including the embedding model.
"""

import os
import sys
from typing import Dict, List, Optional, Union

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our models
from models.embedding import EmbeddingModel

# Create the FastAPI app
app = FastAPI(
    title="AI API",
    description="API for AI components including embedding generation",
    version="0.1.0",
)

# Initialize the embedding model
# Use a small model for faster loading
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
device = "cuda" if torch.cuda.is_available() else "cpu"
embedding_model = EmbeddingModel(model_name=MODEL_NAME, device=device)


# Define the request and response models
class TextInput(BaseModel):
    """Input model for text to be embedded."""
    
    texts: Union[str, List[str]] = Field(
        ..., description="Text or list of texts to embed"
    )
    normalize: bool = Field(
        True, description="Whether to normalize the embeddings"
    )


class EmbeddingResponse(BaseModel):
    """Response model for embeddings."""
    
    embeddings: List[List[float]] = Field(
        ..., description="List of embeddings"
    )
    model: str = Field(
        ..., description="Model used for embedding"
    )
    dimensions: int = Field(
        ..., description="Dimensions of the embeddings"
    )


class SimilarityInput(BaseModel):
    """Input model for similarity calculation."""
    
    text1: str = Field(
        ..., description="First text for similarity comparison"
    )
    text2: str = Field(
        ..., description="Second text for similarity comparison"
    )


class SimilarityResponse(BaseModel):
    """Response model for similarity calculation."""
    
    similarity: float = Field(
        ..., description="Similarity score between 0 and 1"
    )
    model: str = Field(
        ..., description="Model used for embedding"
    )


class StatusResponse(BaseModel):
    """Response model for API status."""
    
    status: str = Field(
        ..., description="API status"
    )
    model: str = Field(
        ..., description="Model loaded"
    )
    device: str = Field(
        ..., description="Device being used"
    )
    cuda_available: bool = Field(
        ..., description="Whether CUDA is available"
    )


@app.get("/", response_model=StatusResponse)
async def get_status() -> Dict:
    """Get the API status."""
    return {
        "status": "running",
        "model": MODEL_NAME,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
    }


@app.post("/embed", response_model=EmbeddingResponse)
async def create_embedding(input_data: TextInput) -> Dict:
    """Create embeddings for the input text(s)."""
    try:
        # Handle both single text and list of texts
        texts = input_data.texts if isinstance(input_data.texts, list) else [input_data.texts]
        
        # Generate embeddings
        embeddings = embedding_model.encode(texts, normalize=input_data.normalize)
        
        # Convert to Python list for JSON serialization
        embeddings_list = embeddings.tolist()
        
        return {
            "embeddings": embeddings_list,
            "model": MODEL_NAME,
            "dimensions": len(embeddings_list[0]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/similarity", response_model=SimilarityResponse)
async def calculate_similarity(input_data: SimilarityInput) -> Dict:
    """Calculate similarity between two texts."""
    try:
        # Generate embeddings for both texts
        embedding1 = embedding_model.encode(input_data.text1, normalize=True)
        embedding2 = embedding_model.encode(input_data.text2, normalize=True)
        
        # Calculate similarity
        similarity = embedding_model.similarity(embedding1, embedding2)
        
        return {
            "similarity": float(similarity),
            "model": MODEL_NAME,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 