import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API settings
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')

# CORS settings
origin_local = os.getenv('CORS_ORIGIN_LOCAL', 'http://localhost:3000')
origin_prod = os.getenv('CORS_ORIGIN_PROD', 'https://insdaguirre.github.io')
CORS_ORIGINS = [origin_local, origin_prod]

# App settings
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
PORT = int(os.getenv('PORT', 8000))
HOST = os.getenv('HOST', '0.0.0.0')
WORKERS = int(os.getenv('WORKERS', 6)) 