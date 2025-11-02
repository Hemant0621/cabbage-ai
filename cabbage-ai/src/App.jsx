import React, { useState, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000/predict';

function Nav({ page, setPage }){
  return (
    <nav className="w-full flex items-center justify-between py-4 px-6 md:px-12 ">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-md bg-[#D84040] flex items-center justify-center text-white font-bold">CA</div>
        <h1 className="text-xl font-semibold text-white">cauliflowerAI</h1>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={()=>setPage('home')} className={`px-3 py-2 rounded cursor-pointer ${page==='home' ? 'bg-[#8E1616] text-white' : 'text-white hover:bg-[#f5dcdc] hover:text-[#D84040]'}`}>Home</button>
        <button onClick={()=>setPage('learn')} className={`px-3 py-2 rounded cursor-pointer ${page==='learn' ? 'bg-[#8E1616] text-white' : 'text-white hover:bg-[#f5dcdc] hover:text-[#D84040]'}`}>Learn</button>
        <button onClick={()=>setPage('about')} className={`px-3 py-2 rounded cursor-pointer ${page==='about' ? 'bg-[#8E1616] text-white' : 'text-white hover:bg-[#f5dcdc] hover:text-[#D84040]'}`}>About</button>
      </div>
    </nav>
  )
}

function UploadBox({ onFileSelected, uploading, previewUrl }){
  const fileInputRef = useRef();
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(files){
    const f = files?.[0];
    if(!f) return;
    if(!f.type.startsWith('image/')) return alert('Please upload an image file');
    onFileSelected(f);
  }

  return (
    <div className="w-full mx-auto">
      <div
        onDragOver={(e)=>{ e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e)=>{ e.preventDefault(); setIsDragOver(false); }}
        onDrop={(e)=>{ e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={()=>fileInputRef.current.click()}
        className={`relative rounded-xl cursor-pointer p-8 flex items-center justify-center transition-shadow ${isDragOver ? 'shadow-2xl' : 'shadow'} bg-white`}
        style={{ minHeight: 340 }}
      >
        {!previewUrl ? (
          <div  className="text-center">
            <div className="mx-auto w-64 h-64 rounded-full border-4 border-dashed border-[#D84040] flex items-center justify-center mb-6">
              <img src="/drag.png" alt="upload" className="h-24 w-24 text-[#1D1616]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#1D1616]">Drop your image here</h2>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>handleFiles(e.target.files)} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src={previewUrl} alt="preview" className="max-h-[300px] object-contain rounded-md shadow" />
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="text-center">
              <div className="loader mb-3" />
              <p className="text-[#1D1616] font-medium">Processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultCard({ result }){
  if(!result) return null;

  // Support single object or array
  const predictions = Array.isArray(result.predictions) ? result.predictions : (result.predictions ? [result.predictions] : []);

  return (
    <div className=" mx-auto mt-6 p-6 bg-white rounded-xl shadow">
      <h3 className="text-lg font-semibold text-[#1D1616]">Analysis</h3>
      {predictions.length===0 && (<p className="mt-3 text-sm text-gray-600">No predictions found in response.</p>)}

      {predictions.map((p, idx)=> (
        <div key={idx} className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-md font-semibold text-[#8E1616]">{p.label || p.disease || 'Unknown'}</div>
              <div className="text-xs text-gray-500">Confidence: {typeof p.confidence==='number' ? (p.confidence*100).toFixed(2)+'%' : p.confidence}</div>
            </div>
            <div className="text-sm text-gray-600">{p.severity ? `Severity: ${p.severity}` : ''}</div>
          </div>

          {p.description && <p className="mt-3 text-sm text-gray-700">{p.description}</p>}

          {p.pesticides && p.pesticides.length>0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-[#1D1616]">Suggested pesticides / treatments</div>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                {p.pesticides.map((d,i)=> <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {p.tips && (
            <div className="mt-3 text-sm text-gray-700">{p.tips}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function App(){
  const [page, setPage] = useState('home');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  function handleFileSelected(f){
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function handleUpload(){
    if(!file) return alert('Select an image first');
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try{
      const res = await axios.post(BACKEND_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      // We try to parse the response into a common shape
      const parsed = parsePrediction(res.data);
      setResult(parsed);
    }catch(err){
      console.error(err);
      alert('Upload/prediction failed. Check console for details and ensure backend CORS is enabled.');
    }finally{
      setUploading(false);
    }
  }

  function parsePrediction(data){
    // If backend returns an object like { label, confidence, description }
    if(!data) return null;
    if(data.label && data.confidence) return { predictions: [data] };
    // If already shaped
    if(Array.isArray(data.predictions) || data.predictions) return data;
    // If backend returns { prediction: {...} }
    if(data.prediction) return { predictions: [data.prediction] };
    // Otherwise attempt to coerce
    if(Array.isArray(data)) return { predictions: data };
    return { predictions: [{ label: JSON.stringify(data).slice(0,120) }] };
  }

  return (
    <div className="min-h-screen bg-[#1D1616] text-[#1D1616]">
      <Nav page={page} setPage={setPage} />

      <main className="py-10 border-2">
        {page==='home' && (
          <section>
            <div className="w-full mx-auto px-32">
              <h2 className="text-3xl font-bold text-white mb-4">Diagnose cauliflower health — upload a photo</h2>
              <p className="text-white mb-6">Quickly upload a picture of a cauliflower leaf or the full plant. Our model will analyze and provide likely issues and suggested treatments.</p>

              <UploadBox onFileSelected={handleFileSelected} uploading={uploading} previewUrl={previewUrl} />

              <div className=" mx-auto mt-6 flex gap-3">
                <button className="px-4 py-2 rounded bg-[#D84040] text-white font-medium cursor-pointer" onClick={handleUpload} disabled={uploading}>Upload & Predict</button>
                <button className="px-4 py-2 rounded border border-[#D84040] text-[#D84040] bg-white cursor-pointer" onClick={()=>{ setFile(null); setPreviewUrl(null); setResult(null); }}>Reset</button>
                <div className="ml-auto text-sm text-gray-500 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#1D1616]" />
                </div>
              </div>

              <ResultCard result={result} />

            </div>
          </section>
        )}

        {page==='about' && (
          <section className="mx-32  bg-white p-8 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-[#1D1616]">About cauliflowerAI</h2>
            <p className="mt-3 text-gray-700">cauliflowerAI uses a trained computer-vision model (e.g. YOLO / classification ensemble) to detect visual symptoms on cauliflower plants. The backend receives an image, runs inference, and returns likely labels with confidence scores and recommended treatments. This frontend is a lightweight React + Tailwind interface to make the workflow simple for farmers and agronomists.</p>

            <h3 className="mt-6 font-semibold text-[#8E1616]">How it works</h3>
            <ul className="list-disc list-inside mt-2 text-gray-700">
              <li>Upload image of plant/leaf</li>
              <li>Image is sent to backend via multipart/form-data</li>
              <li>Backend runs model and returns predictions</li>
              <li>Frontend parses and displays disease details, confidence and treatments</li>
            </ul>

            <h3 className="mt-6 font-semibold text-[#8E1616]">Integration tips</h3>
          </section>
        )}

        {page==='learn' && (
          <section className="mx-32 bg-white p-8 rounded-xl shadow">
            <h2 className="text-2xl font-bold text-[#1D1616]">Learn: Grow healthier cauliflowers</h2>
            <ol className="list-decimal list-inside mt-3 text-gray-700">
              <li>Choose disease-resistant varieties and certified seeds.</li>
              <li>Maintain good field sanitation: remove infected debris and crop rotation.</li>
              <li>Ensure proper spacing & drainage; water in the morning to reduce leaf wetness duration.</li>
              <li>Balanced fertilization: avoid excessive nitrogen which increases susceptibility.</li>
              <li>Scout regularly and use integrated pest management (IPM) approaches before resorting to chemicals.</li>
            </ol>

            <div className="mt-6 text-sm text-gray-600">This section can be expanded later with region-specific protocols, links to pesticide datasheets, and step-by-step video guides.</div>
          </section>
        )}

      </main>

      <footer className=" absolute bottom-3 left-[45%] text-center text-sm text-white">Powered by cauliflowerAI </footer>

      {/* small loader CSS */}
      <style>{`.loader{width:36px;height:36px;border-radius:50%;border:4px solid rgba(0,0,0,0.08);border-top-color:#8E1616;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
