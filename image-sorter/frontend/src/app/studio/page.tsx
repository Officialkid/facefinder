"use client";

import { useState } from "react";
import Link from "next/link";

export default function StudioOnboarding() {
  const [studioName, setStudioName] = useState("Lumina Studios");
  const [cloudProvider, setCloudProvider] = useState("Pixieset");
  const [payoutMethod, setPayoutMethod] = useState<"mpesa" | "stripe">("mpesa");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "agency">("pro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSignupSuccess("Studio registered successfully! Redirecting to Command Center...");
      setTimeout(() => {
        window.location.href = "/live";
      }, 1500);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-on-surface flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      {/* Top Navbar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/10 px-6 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img alt="FaceFinder AI Logo" className="h-8 w-8 rounded-full object-cover" src="/logo.png" />
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]">
              FaceFinder AI
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors">
              Platform
            </Link>
            <Link href="/docs" className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/live" className="text-xs font-mono text-secondary hover:text-white transition-colors">
              Live QR Hub
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Hero Showcase */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 border border-primary/30 text-primary">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Photographer &amp; Studio Suite
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
              Empower Your Lens with <span className="gradient-text">AI</span>.
            </h1>

            <p className="text-sm text-on-surface-variant leading-relaxed max-w-lg">
              Automate delivery, eliminate manual tagging, and delight clients instantly. Turn 5,000 unorganized event photos into personalized real-time guest galleries.
            </p>

            {/* 2 Metric KPI Cards */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="glass-panel rounded-xl p-4 border border-white/10 bg-surface-container-low/60">
                <span className="text-[10px] font-mono uppercase text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-secondary text-[14px]">search</span>
                  Efficiency
                </span>
                <p className="text-3xl font-bold text-white mt-1">100%</p>
                <span className="text-xs text-on-surface-variant">Zero Search Time</span>
              </div>

              <div className="glass-panel rounded-xl p-4 border border-white/10 bg-surface-container-low/60">
                <span className="text-[10px] font-mono uppercase text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-tertiary text-[14px]">verified</span>
                  Accuracy
                </span>
                <p className="text-3xl font-bold text-tertiary neon-text-tertiary mt-1">99.83%</p>
                <span className="text-xs text-on-surface-variant">Facial Precision</span>
              </div>
            </div>
          </div>

          {/* Right Setup Form Card */}
          <div className="lg:col-span-6">
            <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 border border-primary/40 shadow-2xl space-y-5 bg-surface-container/70">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Join the Future of Event Delivery</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Finish setup in 60 seconds.</p>
              </div>

              {signupSuccess && (
                <div className="p-3.5 rounded-xl bg-tertiary-container/30 border border-tertiary-fixed-dim/60 text-tertiary text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>{signupSuccess}</span>
                </div>
              )}

              {/* Social Login Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setSignupSuccess("Google Authentication verified. Configure studio profile below.")}
                  className="w-full py-2.5 rounded-xl bg-surface border border-white/10 hover:border-white/30 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                >
                  <span className="text-sm">G</span>
                  <span>Continue with Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignupSuccess("Apple Authentication verified. Configure studio profile below.")}
                  className="w-full py-2.5 rounded-xl bg-surface border border-white/10 hover:border-white/30 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                  <span>Continue with Apple</span>
                </button>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-[10px] font-mono text-outline uppercase">OR</span>
                <div className="flex-1 h-[1px] bg-white/10" />
              </div>

              {/* Studio Setup Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-on-surface-variant block mb-1">Photography Studio Name</label>
                  <input
                    type="text"
                    required
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="e.g. Lumina Studios"
                    className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-on-surface-variant block mb-1">Default Cloud Provider</label>
                  <select
                    value={cloudProvider}
                    onChange={(e) => setCloudProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-secondary"
                  >
                    <option value="Pixieset">Pixieset</option>
                    <option value="Google Photos">Google Photos</option>
                    <option value="Google Drive">Google Drive</option>
                    <option value="Dropbox">Dropbox / Direct ZIP</option>
                  </select>
                </div>

                {/* Currency & Payout Preference */}
                <div>
                  <label className="text-[11px] font-mono text-on-surface-variant block mb-1.5">Currency &amp; Payout Preference</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("mpesa")}
                      className={`p-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                        payoutMethod === "mpesa"
                          ? "bg-secondary text-surface border-secondary shadow-sm"
                          : "bg-surface-container border-white/10 text-on-surface-variant"
                      }`}
                    >
                      M-Pesa Till / Paybill
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("stripe")}
                      className={`p-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                        payoutMethod === "stripe"
                          ? "bg-secondary text-surface border-secondary shadow-sm"
                          : "bg-surface-container border-white/10 text-on-surface-variant"
                      }`}
                    >
                      Stripe Connect
                    </button>
                  </div>
                </div>

                {/* Select Plan */}
                <div>
                  <label className="text-[11px] font-mono text-on-surface-variant block mb-1.5">Select Plan</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("free")}
                      className={`p-2 rounded-lg text-center font-mono transition-all border ${
                        selectedPlan === "free"
                          ? "bg-secondary/20 border-secondary text-white"
                          : "bg-surface-container border-white/10 text-on-surface-variant"
                      }`}
                    >
                      <span className="block text-[10px] text-outline">Starter</span>
                      <span className="text-sm font-bold text-white">$0</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro")}
                      className={`p-2 rounded-lg text-center font-mono transition-all border ${
                        selectedPlan === "pro"
                          ? "bg-primary/20 border-primary text-white shadow-[0_0_10px_rgba(208,188,255,0.3)]"
                          : "bg-surface-container border-white/10 text-on-surface-variant"
                      }`}
                    >
                      <span className="block text-[10px] text-primary font-bold">Event Pro</span>
                      <span className="text-sm font-bold text-white">$29<span className="text-[10px]">/mo</span></span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("agency")}
                      className={`p-2 rounded-lg text-center font-mono transition-all border ${
                        selectedPlan === "agency"
                          ? "bg-tertiary/20 border-tertiary text-white"
                          : "bg-surface-container border-white/10 text-on-surface-variant"
                      }`}
                    >
                      <span className="block text-[10px] text-tertiary">Agency</span>
                      <span className="text-sm font-bold text-white">$99<span className="text-[10px]">/mo</span></span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl gradient-button text-white font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Setting up studio workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Studio &amp; Start Scanning</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Trust Badges */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-outline">
                <span>GDPR Compliant</span>
                <span>512-D Ephemeral Biometrics</span>
                <span>Bank-Grade Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
