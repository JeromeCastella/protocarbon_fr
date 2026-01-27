"""
Tests unitaires pour l'authentification
"""
import pytest
import sys
sys.path.insert(0, '/app/backend')

from services.auth import hash_password, verify_password, create_access_token
from jose import jwt
from config import JWT_SECRET, JWT_ALGORITHM


class TestPasswordHashing:
    """Tests for password hashing functions"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "testpassword123"
        hashed = hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 20
        assert hashed.startswith("$2b$")  # bcrypt prefix
    
    def test_verify_password_correct(self):
        """Test verifying correct password"""
        password = "testpassword123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) == True
    
    def test_verify_password_incorrect(self):
        """Test verifying incorrect password"""
        password = "testpassword123"
        hashed = hash_password(password)
        
        assert verify_password("wrongpassword", hashed) == False
    
    def test_different_hashes_same_password(self):
        """Test that same password produces different hashes (salt)"""
        password = "testpassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2
        assert verify_password(password, hash1) == True
        assert verify_password(password, hash2) == True


class TestJWTToken:
    """Tests for JWT token functions"""
    
    def test_create_access_token(self):
        """Test creating access token"""
        data = {"sub": "user_id_123"}
        token = create_access_token(data)
        
        assert token is not None
        assert len(token) > 50
    
    def test_token_contains_data(self):
        """Test that token contains the original data"""
        data = {"sub": "user_id_123", "role": "admin"}
        token = create_access_token(data)
        
        # Decode token
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        assert decoded["sub"] == "user_id_123"
        assert decoded["role"] == "admin"
        assert "exp" in decoded  # Expiration should be added
    
    def test_token_has_expiration(self):
        """Test that token has expiration"""
        import time
        
        data = {"sub": "user_id_123"}
        token = create_access_token(data)
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Expiration should be in the future
        assert decoded["exp"] > time.time()
