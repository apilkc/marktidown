#!/bin/bash
set -e

# Change directory to script's directory
cd "$(dirname "$0")"

echo "=== MarkItDown Web Application Launcher ==="

# Check for virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip and install dependencies
echo "Verifying / installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p temp_uploads
mkdir -p static

echo ""
echo "Starting MarkItDown Converter Web Application..."
echo "Open your browser at: http://127.0.0.1:8000"
echo "Press Ctrl+C to stop the server."
echo ""

# Run FastAPI app with Uvicorn
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
