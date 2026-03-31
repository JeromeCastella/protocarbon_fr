"""
Configuration centralisée pour les tests.
Les secrets de test sont lus depuis les variables d'environnement.
"""
import os

# Base URL for API tests
TEST_BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials - read from environment with test defaults
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'newtest@x.com')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'test123')

TEST_USER_EMAIL = os.environ.get('TEST_USER_EMAIL', 'newtest@x.com')
TEST_USER_PASSWORD = os.environ.get('TEST_USER_PASSWORD', 'test123')

# Generic test password for unit tests (hashing, etc.)
TEST_GENERIC_PASSWORD = os.environ.get('TEST_GENERIC_PASSWORD', 'testpassword123')
