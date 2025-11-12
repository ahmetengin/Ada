"""Authentication utilities for password hashing and JWT token management."""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError


class PasswordHasher:
    """Password hashing utilities using bcrypt."""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt.

        Args:
            password: Plain text password

        Returns:
            Hashed password string
        """
        # Generate salt and hash password
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.

        Args:
            plain_password: Plain text password to verify
            hashed_password: Hashed password to check against

        Returns:
            True if password matches, False otherwise
        """
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8")
            )
        except Exception:
            return False


class JWTManager:
    """JWT token management utilities."""

    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        access_token_expire_minutes: int = 30,
    ):
        """
        Initialize JWT manager.

        Args:
            secret_key: Secret key for encoding/decoding tokens
            algorithm: JWT algorithm (default: HS256)
            access_token_expire_minutes: Token expiration time in minutes
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = access_token_expire_minutes

    def create_access_token(
        self,
        data: dict[str, Any],
        expires_delta: timedelta | None = None,
    ) -> str:
        """
        Create a JWT access token.

        Args:
            data: Data to encode in the token
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()

        # Set expiration time
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=self.access_token_expire_minutes
            )

        to_encode.update({"exp": expire})

        # Encode token
        encoded_jwt = jwt.encode(
            to_encode,
            self.secret_key,
            algorithm=self.algorithm
        )
        return encoded_jwt

    def decode_access_token(self, token: str) -> dict[str, Any] | None:
        """
        Decode and verify a JWT access token.

        Args:
            token: JWT token to decode

        Returns:
            Decoded token data or None if invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except InvalidTokenError:
            return None

    def create_user_token(
        self,
        user_id: str,
        tenant_id: str,
        email: str,
        role: str,
    ) -> str:
        """
        Create a token specifically for user authentication.

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID
            email: User email
            role: User role

        Returns:
            JWT token
        """
        data = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "email": email,
            "role": role,
        }
        return self.create_access_token(data)

    def verify_user_token(self, token: str) -> dict[str, Any] | None:
        """
        Verify and decode a user authentication token.

        Args:
            token: JWT token to verify

        Returns:
            Token payload with user data or None if invalid
        """
        payload = self.decode_access_token(token)
        if payload and "sub" in payload:
            return payload
        return None
