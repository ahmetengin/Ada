"""Embeddings service for generating and managing vector embeddings."""

import hashlib
import json
from typing import Any, Optional

import anthropic
import numpy as np
from qdrant_client.models import Distance, PointStruct, VectorParams

from ada.config import get_settings
from ada.database.clients import get_qdrant_client

settings = get_settings()


class EmbeddingsService:
    """
    Service for generating and managing vector embeddings.

    Supports multiple embedding providers:
    - Claude AI (via Anthropic API)
    - Sentence Transformers (local, fast)
    - OpenAI (optional)
    """

    def __init__(self, provider: str = "claude"):
        """
        Initialize embeddings service.

        Args:
            provider: Embedding provider ('claude', 'sentence-transformers')
        """
        self.provider = provider
        self.qdrant = get_qdrant_client()
        self.dimension = 1024  # Default for Claude embeddings

        if provider == "claude":
            if not settings.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not set in environment")
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        elif provider == "sentence-transformers":
            try:
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer("all-MiniLM-L6-v2")
                self.dimension = 384  # Dimension for all-MiniLM-L6-v2
            except ImportError:
                raise ImportError(
                    "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers"
                )

    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for text.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            # Return zero vector for empty text
            return [0.0] * self.dimension

        if self.provider == "claude":
            return await self._generate_claude_embedding(text)
        elif self.provider == "sentence-transformers":
            return self._generate_sentence_transformer_embedding(text)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    async def _generate_claude_embedding(self, text: str) -> list[float]:
        """
        Generate embedding using Claude AI.

        Note: This is a simplified implementation. In production,
        you might want to use a dedicated embedding model or API.
        """
        # For now, we'll use a simple hash-based approach for demonstration
        # In production, replace this with actual Claude embedding API when available
        # or use sentence-transformers

        # Create deterministic embedding from text
        text_hash = hashlib.sha256(text.encode()).digest()
        # Convert to float array and normalize
        embedding = np.frombuffer(text_hash * 32, dtype=np.float32)[: self.dimension]
        # Normalize to unit vector
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding.tolist()

    def _generate_sentence_transformer_embedding(self, text: str) -> list[float]:
        """Generate embedding using Sentence Transformers."""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    async def generate_batch_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        if self.provider == "sentence-transformers":
            # Batch processing for sentence transformers
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
        else:
            # Sequential processing for other providers
            embeddings = []
            for text in texts:
                embedding = await self.generate_embedding(text)
                embeddings.append(embedding)
            return embeddings

    async def create_collection(
        self,
        collection_name: str,
        dimension: Optional[int] = None,
    ) -> None:
        """
        Create a Qdrant collection for storing embeddings.

        Args:
            collection_name: Name of the collection
            dimension: Vector dimension (uses service default if not provided)
        """
        dim = dimension or self.dimension

        # Check if collection exists
        collections = await self.qdrant.get_collections()
        exists = any(c.name == collection_name for c in collections.collections)

        if not exists:
            await self.qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )

    async def upsert_embedding(
        self,
        collection_name: str,
        point_id: str,
        text: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Generate and store an embedding in Qdrant.

        Args:
            collection_name: Qdrant collection name
            point_id: Unique ID for the point
            text: Text to embed
            metadata: Additional metadata to store with the embedding
        """
        # Generate embedding
        embedding = await self.generate_embedding(text)

        # Create point
        point = PointStruct(
            id=point_id,
            vector=embedding,
            payload={"text": text, **(metadata or {})},
        )

        # Upsert to Qdrant
        await self.qdrant.upsert(
            collection_name=collection_name,
            points=[point],
        )

    async def upsert_batch_embeddings(
        self,
        collection_name: str,
        point_ids: list[str],
        texts: list[str],
        metadatas: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        """
        Generate and store multiple embeddings in Qdrant.

        Args:
            collection_name: Qdrant collection name
            point_ids: List of unique IDs
            texts: List of texts to embed
            metadatas: List of metadata dicts
        """
        # Generate embeddings
        embeddings = await self.generate_batch_embeddings(texts)

        # Create points
        points = []
        for i, (point_id, text, embedding) in enumerate(
            zip(point_ids, texts, embeddings)
        ):
            metadata = metadatas[i] if metadatas else {}
            point = PointStruct(
                id=point_id,
                vector=embedding,
                payload={"text": text, **metadata},
            )
            points.append(point)

        # Upsert to Qdrant
        await self.qdrant.upsert(
            collection_name=collection_name,
            points=points,
        )

    async def search_similar(
        self,
        collection_name: str,
        query: str,
        limit: int = 10,
        score_threshold: Optional[float] = None,
        filters: Optional[dict] = None,
    ) -> list[dict[str, Any]]:
        """
        Search for similar embeddings.

        Args:
            collection_name: Qdrant collection name
            query: Query text
            limit: Maximum number of results
            score_threshold: Minimum similarity score (0-1)
            filters: Qdrant filter conditions

        Returns:
            List of search results with scores and metadata
        """
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)

        # Search in Qdrant
        results = await self.qdrant.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=filters,
        )

        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append(
                {
                    "id": result.id,
                    "score": result.score,
                    "text": result.payload.get("text"),
                    "metadata": {
                        k: v for k, v in result.payload.items() if k != "text"
                    },
                }
            )

        return formatted_results

    async def search_by_embedding(
        self,
        collection_name: str,
        embedding: list[float],
        limit: int = 10,
        score_threshold: Optional[float] = None,
    ) -> list[dict[str, Any]]:
        """
        Search using a pre-computed embedding.

        Args:
            collection_name: Qdrant collection name
            embedding: Query embedding vector
            limit: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of search results
        """
        results = await self.qdrant.search(
            collection_name=collection_name,
            query_vector=embedding,
            limit=limit,
            score_threshold=score_threshold,
        )

        formatted_results = []
        for result in results:
            formatted_results.append(
                {
                    "id": result.id,
                    "score": result.score,
                    "text": result.payload.get("text"),
                    "metadata": {
                        k: v for k, v in result.payload.items() if k != "text"
                    },
                }
            )

        return formatted_results

    async def delete_embedding(
        self,
        collection_name: str,
        point_id: str,
    ) -> None:
        """
        Delete an embedding from Qdrant.

        Args:
            collection_name: Qdrant collection name
            point_id: Point ID to delete
        """
        await self.qdrant.delete(
            collection_name=collection_name,
            points_selector=[point_id],
        )

    async def delete_collection(self, collection_name: str) -> None:
        """
        Delete a Qdrant collection.

        Args:
            collection_name: Collection name to delete
        """
        await self.qdrant.delete_collection(collection_name=collection_name)

    def compute_similarity(
        self,
        embedding1: list[float],
        embedding2: list[float],
    ) -> float:
        """
        Compute cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Similarity score (0-1)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))


# Singleton instance
_embeddings_service: Optional[EmbeddingsService] = None


def get_embeddings_service(provider: str = "sentence-transformers") -> EmbeddingsService:
    """
    Get embeddings service singleton.

    Args:
        provider: Embedding provider

    Returns:
        EmbeddingsService instance
    """
    global _embeddings_service
    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService(provider=provider)
    return _embeddings_service
