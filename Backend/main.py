from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image
import io

# Load model once at startup (important for speed!)
model = YOLO("best.pt")

app = FastAPI()

# Allow CORS (so React frontend can call it)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Read image
        image = Image.open(io.BytesIO(await file.read()))

        # Run inference
        results = model.predict(image)

        # Extract predictions
        preds = []
        for r in results:
            for box in r.boxes:
                preds.append({
                    "class": int(box.cls[0]),
                    "label": model.names[int(box.cls[0])],
                    "confidence": float(box.conf[0]),
                })

        return JSONResponse(content={"predictions": preds})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)