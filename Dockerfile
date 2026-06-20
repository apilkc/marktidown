FROM python:3.11-slim

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY static/ static/

# Create temp uploads folder
RUN mkdir -p temp_uploads

# Expose port (default for Render/Railway/etc.)
EXPOSE 8000

# Start application using uvicorn binding to all network interfaces
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
