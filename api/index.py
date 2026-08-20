"""
RoadSOS — Vercel Serverless Entry Point
Exports FastAPI app for zero-config Vercel deployment.
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
