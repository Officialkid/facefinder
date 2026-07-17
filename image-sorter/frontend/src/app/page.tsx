"use client";

import { useCallback, useState } from "react";
import DatasetForm from "@/components/DatasetForm";
import ProcessingStatus from "@/components/ProcessingStatus";
import ReferenceUpload from "@/components/ReferenceUpload";
import ResultsGrid from "@/components/ResultsGrid";
import StepIndicator from "@/components/StepIndicator";
import {
  getSessionErrorDisplay,
  SessionError,
  SessionErrorDisplay,
  UploadResponse,
} from "@/lib/api";

type AppStep = 1 | 2 | 3 | 4;

export default function Home() {
  const [step, setStep] = useState<AppStep>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [failError, setFailError] = useState<SessionErrorDisplay | null>(null);

  const handleUploadSuccess = useCallback((result: UploadResponse, preview: string) => {
    setSessionId(result.session_id);
    setReferencePreview(preview);
    setFailError(null);
    setStep(2);
  }, []);

  const handleProcessingStarted = useCallback(() => {
    setFailError(null);
    setStep(3);
  }, []);

  const handleComplete = useCallback(() => {
    setStep(4);
  }, []);

  const handleFailed = useCallback((error: SessionError | null) => {
    const display = getSessionErrorDisplay(error);
    setFailError(display);
    setStep(display.recoverAtStep);
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setSessionId(null);
    setReferencePreview(null);
    setFailError(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">FaceFinder AI</h1>
              <p className="text-indigo-300 text-xs mt-0.5">AI-Powered Photo Retrieval</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-300">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
            Privacy-first | No permanent storage
          </div>
        </div>
      </header>

      {step === 1 && (
        <div className="bg-gradient-to-b from-indigo-950 to-indigo-900 text-white pb-12 pt-2">
          <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
            <p className="inline-block text-xs font-semibold text-violet-300 bg-violet-900/50 border border-violet-700/50 rounded-full px-3 py-1 uppercase tracking-widest">
              Final Year Project | JKUAT BSc IT 2026
            </p>
            <h2 className="text-4xl font-extrabold leading-tight">
              Find yourself in <br />
              <span className="text-violet-300">thousands of photos</span>
            </h2>
            <p className="text-indigo-200 text-base max-w-lg mx-auto">
              Upload one reference photo. FaceFinder AI scans your event dataset and pulls out every
              image that contains your face in seconds.
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <StepIndicator currentStep={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {failError && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="font-semibold">{failError.title}</p>
                <p className="mt-0.5 text-red-600">{failError.message}</p>
                <p className="mt-1 text-red-600/90">{failError.guidance}</p>
              </div>
            </div>
          )}

          {step === 1 && <ReferenceUpload onSuccess={handleUploadSuccess} />}

          {step === 2 && sessionId && referencePreview && (
            <DatasetForm
              sessionId={sessionId}
              referencePreview={referencePreview}
              onStarted={handleProcessingStarted}
            />
          )}

          {step === 3 && sessionId && (
            <ProcessingStatus
              sessionId={sessionId}
              onComplete={handleComplete}
              onFailed={handleFailed}
            />
          )}

          {step === 4 && sessionId && referencePreview && (
            <ResultsGrid
              sessionId={sessionId}
              referencePreview={referencePreview}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100">
        Daniel Mwalili Mutinda | SCT221-C004-0765/2022 | JKUAT BSc IT | Supervisor: Dr. Judy Gateri
      </footer>
    </div>
  );
}
