"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import DatasetForm from "@/components/DatasetForm";
import PricingModal from "@/components/PricingModal";
import ProcessingStatus from "@/components/ProcessingStatus";
import ReferenceUpload from "@/components/ReferenceUpload";
import ResultsGrid from "@/components/ResultsGrid";
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
  const [showPricing, setShowPricing] = useState(false);

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

  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-primary selection:text-on-primary">
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/10 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-6 sm:px-8 py-4 max-w-7xl mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-4 cursor-pointer" onClick={handleReset}>
            <img alt="FaceFinder AI Logo" className="h-8 w-8 rounded-full object-cover shadow-sm" src="/logo.png" />
            <span className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]">
              FaceFinder AI
            </span>
            <div className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1 rounded-full border border-tertiary-fixed-dim/30 bg-tertiary-fixed-dim/10">
              <div className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" />
              <span className="font-mono text-xs text-tertiary-fixed-dim">Engine Live</span>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7 text-sm">
            <span className="text-primary font-bold border-b-2 border-primary pb-1 cursor-pointer">Platform</span>
            <Link href="/live" className="text-on-surface-variant hover:text-secondary font-medium transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-tertiary">qr_code_2</span>
              <span>Live QR Hub</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-tertiary/20 text-tertiary border border-tertiary/40">New</span>
            </Link>
            <span onClick={() => setShowPricing(true)} className="text-secondary hover:text-white font-semibold transition-colors cursor-pointer flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>Pricing</span>
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Lumina Pure Light Mode" : "Switch to Lumina Tech Noir Dark Mode"}
              className="p-2 rounded-lg border border-white/10 hover:border-secondary/40 text-on-surface-variant hover:text-white transition-colors active:scale-95 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>

            <Link
              href="/studio"
              className="hidden md:block font-mono text-xs text-on-surface-variant hover:text-white transition-colors"
            >
              Studio Login
            </Link>
            <Link
              href="/studio"
              className="gradient-button text-white px-4 py-2 rounded-lg font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-transform"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full z-10">
        {/* Fail Error Banner */}
        {failError && (
          <div className="w-full max-w-3xl mb-6 p-4 rounded-2xl bg-error-container/20 border border-error/50 text-on-surface flex items-start gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-error text-[24px] flex-shrink-0 mt-0.5">error</span>
            <div className="flex-1 space-y-1">
              <h3 className="font-headline font-bold text-sm text-error">{failError.title}</h3>
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed">{failError.message}</p>
              <p className="font-mono text-[11px] text-tertiary-fixed-dim">{failError.guidance}</p>
            </div>
            {/* Note: retryable logic simplified to match provided block */}
            <button
              onClick={() => setFailError(null)}
              className="px-3 py-1 rounded bg-error-container hover:bg-error-container/80 text-on-error-container text-xs font-mono font-bold transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Screen 1: Reference Upload */}
        {step === 1 && <ReferenceUpload onSuccess={handleUploadSuccess} />}

        {/* Screen 2: Dataset & Model Configuration */}
        {step === 2 && sessionId && referencePreview && (
          <div className="w-full max-w-4xl">
            <DatasetForm
              sessionId={sessionId}
              referencePreview={referencePreview}
              onStarted={handleProcessingStarted}
              onBack={() => setStep(1)}
            />
          </div>
        )}

        {/* Screen 3: Live Processing Cockpit */}
        {step === 3 && sessionId && (
          <div className="w-full max-w-5xl">
            <ProcessingStatus
              sessionId={sessionId}
              onComplete={handleComplete}
              onFailed={handleFailed}
            />
          </div>
        )}

        {/* Screen 4: Results Gallery */}
        {step === 4 && sessionId && referencePreview && (
          <div className="w-full max-w-5xl">
            <ResultsGrid
              sessionId={sessionId}
              referencePreview={referencePreview}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-surface/90 py-8 px-6 sm:px-8 mt-auto z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img alt="FaceFinder AI Logo" className="h-6 w-6 rounded-full object-cover" src="/logo.png" />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]">
              FaceFinder AI
            </span>
          </div>
          <p className="text-xs text-on-surface-variant text-center">
            &copy; 2026 FaceFinder AI. All rights reserved. Zero-retention facial recognition architecture.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-on-surface-variant font-mono">
            <Link href="/docs" className="hover:text-white cursor-pointer transition-colors flex items-center gap-1 text-secondary">
              <span className="material-symbols-outlined text-[14px]">menu_book</span>
              <span>Documentation</span>
            </Link>
            <Link href="/docs#api-reference" className="hover:text-white cursor-pointer transition-colors">
              API Reference
            </Link>
            <Link href="/docs#security-privacy" className="hover:text-white cursor-pointer transition-colors">
              Security &amp; Privacy
            </Link>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>

      {/* Pricing Modal */}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
}




