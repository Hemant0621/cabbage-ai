from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image
import io
import os


# Load model once at startup (important for speed!)
model = YOLO("best.pt")

app = FastAPI()


origins = [
    "*",
    "https://cabbage-ai.vercel.app",  
    "http://localhost:5173",         
    "http://localhost:3000"           
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)

