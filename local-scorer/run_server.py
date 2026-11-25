import os
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8765,
        reload=True,
        reload_dirs=[BASE_DIR],
        reload_includes=["*.py", "*.json"],
        reload_excludes=[".venv", ".venv/*", ".tts-cache", ".tts-cache/*", "__pycache__", "__pycache__/*"],
    )
