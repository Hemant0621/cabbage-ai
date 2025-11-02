import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = "https://cabbage-ai.onrender.com";

function Nav({ page, setPage }) {
  return (
    <nav className="w-full flex flex-wrap items-center justify-between py-4 px-4 sm:px-8 md:px-12 bg-[#1D1616]">
      <div className="flex items-center gap-3 mb-2 sm:mb-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#D84040] flex items-center justify-center text-white font-bold text-sm sm:text-base">
          CA
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-white">
          cauliflowerAI
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {["home", "learn", "about"].map((tab) => (
          <button
            key={tab}
            onClick={() => setPage(tab)}
            className={`px-3 py-2 rounded text-sm sm:text-base cursor-pointer transition-all duration-200 ${
              page === tab
                ? "bg-[#8E1616] text-white"
                : "text-white hover:bg-[#f5dcdc] hover:text-[#D84040]"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </nav>
  );
}

function UploadBox({ onFileSelected, uploading, previewUrl, progress }) {
  const fileInputRef = useRef();
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(files) {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/"))
      return alert("Please upload an image file");
    onFileSelected(f);
  }

  return (
    <div className="w-full mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current.click()}
        className={`relative rounded-xl cursor-pointer p-8 flex items-center justify-center transition-shadow ${
          isDragOver ? "shadow-2xl" : "shadow"
        } bg-white`}
        style={{ minHeight: 340 }}
      >
        {!previewUrl ? (
          <div className="text-center">
            <div className="mx-auto w-64 h-64 rounded-full border-4 border-dashed border-[#D84040] flex items-center justify-center mb-6">
              <img
                src="/drag.png"
                alt="upload"
                className="h-24 w-24 text-[#1D1616]"
              />
            </div>
            <h2 className="text-2xl font-semibold text-[#1D1616]">
              Drop your image here
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={previewUrl}
              alt="preview"
              className="w-full max-h-[300px] sm:max-h-[400px] object-contain rounded-md shadow"
            />
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="text-center w-64">
              <p className="text-[#1D1616] font-medium mb-3">Processing...</p>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {Math.round(progress)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  if (!result) return null;

  const predictions = Array.isArray(result.predictions)
    ? result.predictions
    : result.predictions
    ? [result.predictions]
    : [];

  return (
    <div className=" mx-auto mt-6 p-6 bg-white rounded-xl shadow">
      <h3 className="text-lg font-semibold text-[#1D1616]">Analysis</h3>
      {predictions.length === 0 && (
        <p className="mt-3 text-sm text-gray-600">
          No predictions found in response.
        </p>
      )}

      {predictions.map((p, idx) => (
        <div key={idx} className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-md font-semibold text-[#8E1616]">
                {p.label || "Unknown"}
              </div>
              <div className="text-xs text-gray-500">
                Confidence:{" "}
                {typeof p.confidence === "number"
                  ? (p.confidence * 100).toFixed(2) + "%"
                  : p.confidence}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);

  function handleFileSelected(f) {
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function handleUpload() {
    if (!file) return alert("Select an image first");
    setUploading(true);
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    let fakeProgress = 0;
    const progressTimer = setInterval(() => {
      fakeProgress += (100 - fakeProgress) * 0.007;
      if (fakeProgress >= 98) fakeProgress = 98; 
      setProgress(fakeProgress);
    }, 300);

    try {
      const res = await axios.post(`${BACKEND_URL}/predict`, formData,);

      clearInterval(progressTimer);
      setProgress(100);

      setTimeout(() => {
        const parsed = parsePrediction(res.data);
        setResult(parsed);
        setUploading(false);
      }, 500);
    } catch (err) {
      clearInterval(progressTimer);
      setProgress(100);
      console.error("Upload/prediction failed:", err);
      alert("Prediction failed. Check console for details.");
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1D1616] text-[#1D1616]">
      <Nav page={page} setPage={setPage} />

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
        <main className="py-10 border-2">
          {page === "home" && (
            <section>
              <div className="w-full mx-auto px-4 sm:px-8 md:px-16 lg:px-32">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                  Diagnose cauliflower health — upload a photo
                </h2>
                <p className="text-white mb-6">
                  Quickly upload a picture of a cauliflower leaf or the full
                  plant. Our model will analyze and provide likely issues and
                  suggested treatments.
                </p>

                <UploadBox
                  onFileSelected={handleFileSelected}
                  uploading={uploading}
                  previewUrl={previewUrl}
                  progress={progress}
                />

                <div className=" mx-auto mt-6 flex gap-3">
                  <button
                    className="px-4 py-2 rounded bg-[#D84040] text-white font-medium cursor-pointer"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    Upload & Predict
                  </button>
                  <button
                    className="px-4 py-2 rounded border border-[#D84040] text-[#D84040] bg-white cursor-pointer"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setResult(null);
                      setUploading(false);
                      setProgress(0);
                    }}
                  >
                    Reset
                  </button>
                </div>

                <ResultCard result={result} />
              </div>
            </section>
          )}
        </main>
      </div>
      <footer className="mt-12 py-6 text-center text-xs sm:text-sm text-white bg-[#1D1616]">
        Powered by cauliflowerAI
      </footer>
    </div>
  );
}
