"""
RoadSOS — Main Application Entry Point
Run: python main.py
"""

import uvicorn
from backend.config import PORT

if __name__ == "__main__":
    print(f"🚨 Starting RoadSOS Emergency Decision Intelligence Server on http://127.0.0.1:{PORT}")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=PORT, reload=True)
