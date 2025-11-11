"""Database clients for Redis, Qdrant, Neo4j, and FAISS."""

import os
from functools import lru_cache
from typing import Optional

import faiss
import numpy as np
from neo4j import AsyncGraphDatabase, AsyncDriver
from qdrant_client import AsyncQdrantClient
from redis.asyncio import Redis, ConnectionPool

from ada.config import get_settings

settings = get_settings()


# Redis Client
@lru_cache
def get_redis_pool() -> ConnectionPool:
    """Get Redis connection pool."""
    return ConnectionPool.from_url(
        str(settings.redis_url),
        max_connections=settings.redis_max_connections,
        decode_responses=True,
    )


async def get_redis() -> Redis:
    """Get Redis client."""
    pool = get_redis_pool()
    return Redis(connection_pool=pool)


# Qdrant Client
@lru_cache
def get_qdrant_client() -> AsyncQdrantClient:
    """Get Qdrant client for vector storage."""
    return AsyncQdrantClient(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
        api_key=settings.qdrant_api_key,
    )


# Neo4j Client
class Neo4jClient:
    """Neo4j graph database client."""

    def __init__(self) -> None:
        """Initialize Neo4j client."""
        self._driver: Optional[AsyncDriver] = None

    async def connect(self) -> None:
        """Connect to Neo4j."""
        if not self._driver:
            self._driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
            )

    async def close(self) -> None:
        """Close Neo4j connection."""
        if self._driver:
            await self._driver.close()
            self._driver = None

    @property
    def driver(self) -> AsyncDriver:
        """Get Neo4j driver."""
        if not self._driver:
            raise RuntimeError("Neo4j client not connected. Call connect() first.")
        return self._driver

    async def execute_query(self, query: str, parameters: Optional[dict] = None) -> list:
        """
        Execute a Cypher query.

        Args:
            query: Cypher query string
            parameters: Query parameters

        Returns:
            List of records
        """
        async with self.driver.session() as session:
            result = await session.run(query, parameters or {})
            return await result.data()


@lru_cache
def get_neo4j_client() -> Neo4jClient:
    """Get Neo4j client singleton."""
    return Neo4jClient()


# FAISS Index Manager
class FAISSIndexManager:
    """Manage FAISS indices for vector similarity search."""

    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize FAISS index manager.

        Args:
            base_path: Base directory for storing FAISS indices
        """
        self.base_path = base_path or settings.faiss_index_path
        os.makedirs(self.base_path, exist_ok=True)
        self._indices: dict[str, faiss.Index] = {}

    def create_index(
        self,
        name: str,
        dimension: int,
        index_type: str = "Flat",
    ) -> faiss.Index:
        """
        Create a new FAISS index.

        Args:
            name: Index name
            dimension: Vector dimension
            index_type: Type of index ('Flat', 'IVF', 'HNSW')

        Returns:
            FAISS index
        """
        if index_type == "Flat":
            index = faiss.IndexFlatL2(dimension)
        elif index_type == "IVF":
            quantizer = faiss.IndexFlatL2(dimension)
            index = faiss.IndexIVFFlat(quantizer, dimension, 100)
        elif index_type == "HNSW":
            index = faiss.IndexHNSWFlat(dimension, 32)
        else:
            raise ValueError(f"Unknown index type: {index_type}")

        self._indices[name] = index
        return index

    def get_index(self, name: str) -> Optional[faiss.Index]:
        """Get an existing index."""
        return self._indices.get(name)

    def add_vectors(
        self,
        name: str,
        vectors: np.ndarray,
    ) -> None:
        """
        Add vectors to an index.

        Args:
            name: Index name
            vectors: Numpy array of vectors
        """
        index = self.get_index(name)
        if not index:
            raise ValueError(f"Index {name} not found")

        index.add(vectors)

    def search(
        self,
        name: str,
        query_vector: np.ndarray,
        k: int = 10,
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Search for similar vectors.

        Args:
            name: Index name
            query_vector: Query vector
            k: Number of results

        Returns:
            Tuple of (distances, indices)
        """
        index = self.get_index(name)
        if not index:
            raise ValueError(f"Index {name} not found")

        return index.search(query_vector, k)

    def save_index(self, name: str) -> None:
        """Save index to disk."""
        index = self.get_index(name)
        if not index:
            raise ValueError(f"Index {name} not found")

        path = os.path.join(self.base_path, f"{name}.index")
        faiss.write_index(index, path)

    def load_index(self, name: str) -> faiss.Index:
        """Load index from disk."""
        path = os.path.join(self.base_path, f"{name}.index")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Index file not found: {path}")

        index = faiss.read_index(path)
        self._indices[name] = index
        return index


@lru_cache
def get_faiss_manager() -> FAISSIndexManager:
    """Get FAISS index manager singleton."""
    return FAISSIndexManager()


# Database initialization helper
async def init_all_databases() -> None:
    """Initialize all database connections."""
    # Initialize PostgreSQL
    from ada.database.session import init_db
    await init_db()

    # Connect to Neo4j
    neo4j = get_neo4j_client()
    await neo4j.connect()

    print("All databases initialized successfully!")


async def close_all_databases() -> None:
    """Close all database connections."""
    # Close Neo4j
    neo4j = get_neo4j_client()
    await neo4j.close()

    # Close Redis (connection pool is handled automatically)
    print("All database connections closed!")
