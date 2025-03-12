"""
Embedding model implementation using PyTorch.

This module provides a simple embedding model that can be used to generate
embeddings for text inputs using various transformer models.
"""

from typing import Dict, List, Optional, Union

import torch
from torch import Tensor
from transformers import AutoModel, AutoTokenizer


class EmbeddingModel:
    """
    Text embedding model using transformer models.

    This class provides methods to generate embeddings for text inputs
    using pre-trained transformer models from Hugging Face.
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        device: Optional[Union[str, torch.device]] = None,
        max_length: int = 512,
    ):
        """
        Initialize the embedding model.

        Args:
            model_name: Name of the pre-trained model to use
            device: Device to run the model on (cuda or cpu)
            max_length: Maximum sequence length for tokenization

        Raises:
            ValueError: If model_name is not a valid model name
            RuntimeError: If CUDA is requested but not available
        """
        if not model_name:
            raise ValueError("Model name cannot be empty")

        # Set device
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
            if self.device.type == "cuda" and not torch.cuda.is_available():
                raise RuntimeError(
                    "CUDA requested but not available. "
                    "Please check your installation or use device='cpu'"
                )

        # Load model and tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        self.max_length = max_length
        self.model_name = model_name
        self.embedding_dim = self.model.config.hidden_size

    def encode(self, texts: Union[str, List[str]], normalize: bool = True) -> Tensor:
        """
        Generate embeddings for the given texts.

        Args:
            texts: Single text or list of texts to encode
            normalize: Whether to normalize the embeddings to unit length

        Returns:
            Tensor: Embeddings for the input texts

        Raises:
            ValueError: If texts is empty
        """
        if not texts:
            raise ValueError("Input texts cannot be empty")

        # Convert single text to list
        if isinstance(texts, str):
            texts = [texts]

        # Tokenize
        encoded_input = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        ).to(self.device)

        # Generate embeddings
        with torch.no_grad():
            model_output = self.model(**encoded_input)
            # Use mean pooling to get sentence embeddings
            embeddings = self._mean_pooling(model_output, encoded_input["attention_mask"])

        # Normalize embeddings if requested
        if normalize:
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        return embeddings

    def _mean_pooling(self, model_output: Dict[str, Tensor], attention_mask: Tensor) -> Tensor:
        """
        Perform mean pooling on model outputs using attention mask.

        Args:
            model_output: Output from the transformer model
            attention_mask: Attention mask from tokenization

        Returns:
            Tensor: Pooled embeddings
        """
        token_embeddings = model_output.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
            input_mask_expanded.sum(1), min=1e-9
        )

    def similarity(self, embedding1: Tensor, embedding2: Tensor) -> float:
        """
        Calculate cosine similarity between two embeddings.

        Args:
            embedding1: First embedding
            embedding2: Second embedding

        Returns:
            float: Cosine similarity score

        Raises:
            ValueError: If embeddings have different dimensions
        """
        if embedding1.shape != embedding2.shape:
            raise ValueError(
                f"Embeddings must have the same shape. "
                f"Got {embedding1.shape} and {embedding2.shape}"
            )

        return torch.nn.functional.cosine_similarity(embedding1, embedding2, dim=1).item()

    def batch_encode(
        self, texts: List[str], batch_size: int = 32, normalize: bool = True
    ) -> Tensor:
        """
        Encode a large batch of texts in smaller batches.

        Args:
            texts: List of texts to encode
            batch_size: Size of each batch
            normalize: Whether to normalize the embeddings

        Returns:
            Tensor: Embeddings for all texts

        Raises:
            ValueError: If texts is empty or batch_size <= 0
        """
        if not texts:
            raise ValueError("Input texts cannot be empty")
        if batch_size <= 0:
            raise ValueError("Batch size must be positive")

        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_embeddings = self.encode(batch_texts, normalize=normalize)
            all_embeddings.append(batch_embeddings)

        return torch.cat(all_embeddings, dim=0)

    def __del__(self):
        """Clean up resources when the object is deleted."""
        # Clean up GPU memory if using CUDA
        if hasattr(self, "model") and self.device.type == "cuda":
            del self.model
            torch.cuda.empty_cache()


if __name__ == "__main__":
    # Example usage
    model = EmbeddingModel()
    texts = ["This is a sample sentence.", "Another example sentence."]
    embeddings = model.encode(texts)
    print(f"Model: {model.model_name}")
    print(f"Embedding dimension: {model.embedding_dim}")
    print(f"Generated embeddings shape: {embeddings.shape}") 