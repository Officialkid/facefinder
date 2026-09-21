import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageSorterAPI, UploadResponse, DetectedReferenceFace } from "@/lib/api";

interface Props {
  onSuccess: (result: UploadResponse, previewUrl: string, selectedFaceIndex?: number | null) => void;
}

export default function ReferenceUpload({ onSuccess }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedReferenceFace[] | null>(null);
  const [selectedFaceIdx, setSelectedFaceIdx] = useState<number>(0);
  const [pendingUploadResult, setPendingUploadResult] = useState<UploadResponse | null>(null);

  const handleSelectedFile = useCallback((file: File) => {
    setError(null);
    setSelectedFile(file);
    setDetectedFaces(null);
    setPendingUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    handleSelectedFile(file);
  }, [handleSelectedFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/bmp": [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    noClick: false,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "File not accepted. Please use JPG, PNG, WEBP, or BMP.";
      setError(msg);
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const result = await ImageSorterAPI.uploadReference(selectedFile);
      if (result.detected_faces && result.detected_faces.length > 1) {
        setDetectedFaces(result.detected_faces);
        setSelectedFaceIdx(0);
        setPendingUploadResult(result);
      } else {
        onSuccess(result, preview!, 0);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please check your image and try again.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mb-12 mt-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Find yourself across <br />
          <span className="gradient-text">thousands of event photos</span>
        </h1>
        <p className="text-base text-on-surface-variant mb-8 max-w-2xl mx-auto">
          Leveraging state-of-the-art facial recognition models to instantly locate your presence in massive unstructured image datasets.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-sm">memory</span>
            <span className="font-mono text-xs text-on-surface-variant">512-D Embeddings</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">cloud_download</span>
            <span className="font-mono text-xs text-on-surface-variant">Multi-Source Ingestion</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-sm">join_inner</span>
            <span className="font-mono text-xs text-on-surface-variant">Cosine Similarity Matching</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 border-tertiary-fixed-dim/30">
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-sm">security</span>
            <span className="font-mono text-xs text-tertiary-fixed-dim">Zero-Retention Privacy</span>
          </div>
        </div>
      </div>

      {/* Main Interaction Card */}
      <div className="w-full max-w-4xl glass-panel rounded-2xl p-1 relative overflow-hidden group shadow-2xl">
        {/* Inner Bevel Effect */}
        <div className="absolute inset-0 border-t border-l border-white/20 rounded-2xl pointer-events-none" />
        <div className="absolute inset-0 border-b border-r border-black/40 rounded-2xl pointer-events-none" />

        <div className="bg-surface-container/40 rounded-xl p-6 sm:p-8 backdrop-blur-md">
          {/* Stepper */}
          <div className="flex items-center justify-between mb-10 relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-variant -z-10 -translate-y-1/2" />
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border-2 border-secondary glow-pulse relative">
                <div className="absolute inset-0 rounded-full bg-secondary/20 animate-ping" />
                <span className="font-mono text-xs text-secondary font-bold z-10">1</span>
              </div>
              <span className="font-mono text-xs text-secondary font-semibold">Reference Face</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-white/10 text-on-surface-variant">
                <span className="font-mono text-xs">2</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">Dataset Source</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-white/10 text-on-surface-variant">
                <span className="font-mono text-xs">3</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">AI Recognition</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-surface-container/40 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-white/10 text-on-surface-variant">
                <span className="font-mono text-xs">4</span>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">Results</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error-container/20 border border-error/40 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Upload Dropzone or Preview */}
          {!preview ? (
            <div
              {...getRootProps()}
              className={`w-full bg-slate-900/50 border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-300 group/dropzone cursor-pointer relative overflow-hidden ${
                isDragActive
                  ? "border-secondary bg-slate-800/70 shadow-[0_0_25px_rgba(76,215,246,0.25)]"
                  : "border-secondary/40 hover:border-secondary hover:bg-slate-800/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="absolute inset-0 bg-secondary/5 translate-y-full group-hover/dropzone:translate-y-0 transition-transform duration-500 pointer-events-none" />

              {/* Animated SVG Biometric Radar */}
              <div className="w-16 h-16 mx-auto mb-4 text-secondary opacity-80 group-hover/dropzone:opacity-100 transition-opacity">
                <svg fill="none" height="64" viewBox="0 0 64 64" width="64" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" stroke="url(#paint0_linear)" strokeDasharray="4 4" strokeWidth="2">
                    <animateTransform attributeName="transform" dur="10s" from="0 32 32" repeatCount="indefinite" to="360 32 32" type="rotate" />
                  </circle>
                  <path d="M20 24C20 20 24 16 32 16C40 16 44 20 44 24M20 40C20 44 24 48 32 48C40 48 44 44 44 40" stroke="#06b6d4" strokeLinecap="round" strokeWidth="2">
                    <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0.3;1;0.3" />
                  </path>
                  <rect fill="url(#paint1_linear)" height="2" width="32" x="16" y="31">
                    <animate attributeName="y" dur="3s" repeatCount="indefinite" values="18;44;18" />
                  </rect>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear" x1="2" x2="62" y1="2" y2="62">
                      <stop stopColor="#8b5cf6" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear" x1="16" x2="48" y1="32" y2="32">
                      <stop stopColor="#8b5cf6" />
                      <stop offset="0.5" stopColor="#06b6d4" />
                      <stop offset="1" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 text-center">
                Drag and drop your reference portrait here or{" "}
                <span className="text-secondary underline hover:text-secondary-fixed font-bold cursor-pointer inline focus:outline-none rounded px-1">
                  browse files
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant text-center max-w-sm mb-6">
                For optimal results, ensure the face is well-lit, front-facing, and unobstructed.
              </p>

              {/* Supported Format Tags */}
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-surface-variant text-[11px] font-mono text-on-surface-variant">JPG</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-variant text-[11px] font-mono text-on-surface-variant">PNG</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-variant text-[11px] font-mono text-on-surface-variant">WEBP</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-variant text-[11px] font-mono text-on-surface-variant">BMP</span>
                <span className="px-2.5 py-1 rounded-md bg-surface-variant text-[11px] font-mono text-on-surface-variant">Max 10MB</span>
              </div>
            </div>
          ) : detectedFaces && detectedFaces.length > 1 ? (
            <div className="w-full bg-slate-900/80 border border-primary/40 rounded-2xl p-6 flex flex-col items-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-primary/20 border border-primary/40 text-primary">
                  <span className="material-symbols-outlined text-sm">group</span>
                  <span>{detectedFaces.length} Faces Detected in Photo</span>
                </div>
                <h3 className="font-headline font-bold text-white text-lg pt-1">
                  Which person are you searching for?
                </h3>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                  Click on the person you want to locate across the event gallery.
                </p>
              </div>

              {/* Grid of detected faces */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg">
                {detectedFaces.map((f) => {
                  const isSelected = selectedFaceIdx === f.face_index;
                  return (
                    <button
                      key={f.face_index}
                      type="button"
                      onClick={() => setSelectedFaceIdx(f.face_index)}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/20 shadow-lg shadow-primary/30 ring-2 ring-primary scale-105"
                          : "border-white/10 bg-surface-variant/40 hover:border-white/30 hover:bg-surface-variant/60"
                      }`}
                    >
                      <img
                        src={f.thumbnail_base64}
                        alt={`Person ${f.face_index + 1}`}
                        className="w-20 h-20 rounded-full object-cover border border-white/20 shadow"
                      />
                      <span className="font-mono text-xs font-bold text-white">
                        Person {f.face_index + 1}
                      </span>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[12px] shadow">
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/20 bg-surface text-transparent flex items-center justify-center text-[10px]">
                          ○
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex w-full justify-between items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-mono text-outline hover:text-white transition-colors"
                >
                  Choose Different Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingUploadResult) {
                      onSuccess(pendingUploadResult, preview!, selectedFaceIdx);
                    }
                  }}
                  className="gradient-button text-white px-8 py-3 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>Confirm Person {selectedFaceIdx + 1} &amp; Proceed</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full bg-slate-900/60 border border-secondary/40 rounded-xl p-6 flex flex-col items-center space-y-4">
              <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-secondary shadow-[0_0_20px_rgba(76,215,246,0.3)]">
                <img src={preview} alt="Reference Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-2 border border-dashed border-secondary/60 rounded-xl pointer-events-none" />
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-secondary" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-secondary" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-secondary" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-secondary" />
              </div>

              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-tertiary-container/30 border border-tertiary-fixed-dim/40 text-tertiary">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  Target Profile Ready
                </div>
                <p className="font-mono text-xs text-on-surface-variant pt-1 truncate max-w-xs">{selectedFile?.name}</p>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-mono text-outline hover:text-white transition-colors"
              >
                Choose Different Photo
              </button>
            </div>
          )}

          {/* Action CTA Button for single face */}
          {(!detectedFaces || detectedFaces.length <= 1) && (
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full sm:w-auto gradient-button text-white px-8 py-3 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Detecting Faces &amp; Vectors...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Proceed to Dataset Link</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
