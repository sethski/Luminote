import React, { useState, useRef } from "react";
import { ArrowLeft, UploadCloud, FileImage, CheckCircle, Copy, Edit2, Zap } from "lucide-react";
import { useNavigate } from "react-router";
import { useNotes } from "./NotesContext";

async function extractTextFromImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("https://www.imagetotext.info/api/imageToText", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`OCR API error: ${res.status}`);

  const json = await res.json();

  // API returns { text: "..." } or similar — handle common shapes
  const text =
    json?.text ??
    json?.result ??
    json?.data?.text ??
    (typeof json === "string" ? json : "");

  if (!text) throw new Error("No text extracted from image.");
  return text as string;
}

export function UploadImage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { addNote, updateNote } = useNotes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setImageFile(file);
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setExtractedText("");

    // Animate progress while waiting
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 300);

    try {
      const text = await extractTextFromImage(file);
      clearInterval(interval);
      setProgress(100);
      setExtractedText(text);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      setError(err?.message ?? "OCR failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
  };

  const handleInsertIntoNote = async () => {
    if (!extractedText) return;
    const noteId = await addNote();
    await updateNote(noteId, { title: "OCR Extraction", content: extractedText });
    navigate(`/home/editor/${noteId}`);
  };

  return (
    <div className="flex h-screen flex-col bg-[#F9FAFB] font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-xs text-gray-400 font-medium mb-0.5">Notes › OCR Conversion</div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Image-to-Text OCR</h1>
          </div>
        </div>
        <button
          onClick={handleInsertIntoNote}
          disabled={!extractedText}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            extractedText
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle size={18} />
          Insert into Note
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row gap-8 p-8 overflow-hidden">

        {/* Left: Dropzone / Image Preview */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
          {!image ? (
            <div
              className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition-colors ${
                dragActive ? "bg-blue-50 border-2 border-dashed border-blue-400" : "bg-gray-50/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
              <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-500 mb-6">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload or Drag Image</h3>
              <p className="text-gray-500 max-w-sm mb-6">
                Supported formats: JPG, PNG, HEIC. High-resolution images yield the best OCR results.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2"
              >
                <FileImage size={18} />
                Browse Files
              </button>
            </div>
          ) : (
            <div className="flex-1 relative bg-gray-100 p-4 flex items-center justify-center overflow-hidden">
              <img src={image} alt="Uploaded for OCR" className="max-w-full max-h-full object-contain rounded shadow-sm" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 flex justify-between items-center shadow-sm text-sm border border-white/40">
                <span className="font-medium text-gray-600 truncate mr-4">{imageFile?.name ?? "uploaded_image"}</span>
                <span className="font-bold text-blue-600 text-xs tracking-wider uppercase bg-blue-50 px-2 py-1 rounded">
                  {isProcessing ? "Processing…" : "Live Preview"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Progress */}
        <div className="hidden lg:flex flex-col items-center justify-center px-4 w-40 shrink-0">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-6 relative">
            <Zap size={24} className={isProcessing ? "animate-pulse text-blue-600" : ""} />
            {isProcessing && (
              <svg className="absolute inset-0 w-full h-full animate-spin text-blue-200" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <div className="w-full">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              <span>{isProcessing ? "Processing" : extractedText ? "Complete" : error ? "Error" : "Waiting"}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-out ${error ? "bg-red-400" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Extracted Text */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex-1 overflow-y-auto">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center text-red-400 gap-2">
                <p className="text-center font-medium">{error}</p>
                <button
                  onClick={() => { setError(null); setImage(null); setProgress(0); }}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : extractedText ? (
              <div className="text-slate-800 text-sm md:text-base leading-relaxed font-serif space-y-4">
                {extractedText.split("\n").map((para, i) => <p key={i}>{para}</p>)}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-center font-medium">Upload an image to see extracted text here.</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-4 shrink-0">
            <button
              disabled={!extractedText}
              onClick={handleCopy}
              className="flex-1 py-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-center gap-2 font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy size={16} /> Copy Text
            </button>
            <button
              disabled={!extractedText}
              onClick={() => {
                const blob = new Blob([extractedText], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "ocr-result.txt"; a.click();
              }}
              className="flex-1 py-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-center gap-2 font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 size={16} /> Export .txt
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
