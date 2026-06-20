import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from markitdown import MarkItDown

app = FastAPI(
    title="MarkItDown Converter",
    description="A simple web application to convert various file formats to Markdown."
)

# Ensure temp directory exists
TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# Initialize MarkItDown
markitdown_client = MarkItDown()

@app.post("/api/convert")
async def convert_file(file: UploadFile = File(...)):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    # Generate unique filename in temp directory to prevent collisions
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    
    try:
        # Save the uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run conversion
        result = markitdown_client.convert(temp_path)
        
        return {
            "success": True,
            "filename": filename,
            "content": result.text_content,
            "size": os.path.getsize(temp_path)
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "filename": filename
            }
        )
    finally:
        # Always clean up temporary file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

# Serve Frontend static files
# Place after API endpoints so they aren't masked
os.makedirs("static", exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
