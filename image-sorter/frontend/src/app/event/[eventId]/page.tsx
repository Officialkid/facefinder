"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function GuestMobilePortal() {
  const params = useParams();
  const eventId = (params?.eventId as string)?.toUpperCase() || "WED-8821";

  const [step, setStep] = useState<"selfie" | "feed">("selfie");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlockedSuccess, setUnlockedSuccess] = useState<string | null>(null);

  const sampleMatches = [
    {
      id: "m1",
      url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80",
      timestamp: "10:42 AM",
      confidence: "98%",
      isWatermarked: true,
    },
    {
      id: "m2",
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80",
      timestamp: "10:39 AM",
      confidence: "94%",
      isWatermarked: true,
    },
    {
      id: "m3",
      url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&auto=format&fit=crop&q=80",
      timestamp: "10:30 AM",
      confidence: "91%",
      isWatermarked: true,
    },
  ];

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelfiePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !selfiePreview) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep("feed");
    }, 1500);
  };

  const handleUnlockPhotos = () => {
    setUnlockedSuccess("All 4K high-resolution photos unlocked! (Free Beta Mode active)");
    setTimeout(() => {
      setUnlockedSuccess(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-on-surface flex flex-col font-sans max-w-md mx-auto border-x border-white/10 shadow-2xl relative">
      {/* Mobile Top App Bar */}
      <header className="px-5 py-4 border-b border-white/10 bg-surface/90 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold text-xs">
            FF
          </div>
          <div>
            <h1 className="text-xs font-bold text-white leading-tight">Sarah &amp; David Wedding</h1>
            <span className="text-[10px] font-mono text-secondary">Event: {eventId}</span>
          </div>
        </div>

        <Link href="/" className="text-[11px] font-mono text-on-surface-variant hover:text-white">
          Home
        </Link>
      </header>

      {/* Screen 1: Guest Selfie Onboarding */}
      {step === "selfie" && (
        <main className="p-6 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-2 text-center mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary/10 border border-secondary/30 text-secondary">
              Instant Biometric Channel
            </span>
            <h2 className="text-xl font-bold text-white">Find Your Event Photos</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Snap a 3-second selfie. As the photographer shoots, you'll receive direct WhatsApp alerts whenever you appear in photos!
            </p>
          </div>

          {/* Selfie Camera Dropzone */}
          <div className="space-y-4 my-auto">
            <div className="relative aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-secondary/60 bg-surface-container/40 flex flex-col items-center justify-center p-4 group">
              {selfiePreview ? (
                <>
                  <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setSelfiePreview(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full space-y-2">
                  <div className="w-14 h-14 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                  </div>
                  <span className="text-xs font-bold text-white">Take a Quick Selfie</span>
                  <span className="text-[10px] text-outline">or select from camera roll</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">WhatsApp Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-secondary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selfiePreview || !guestName || !phone}
                className="w-full py-3 rounded-xl gradient-button text-white font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Enrolling Face Vector...</span>
                  </>
                ) : (
                  <>
                    <span>Start Live Matching</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center text-[10px] text-outline font-mono">
            Zero-Retention Biometrics &bull; Ephemeral RAM Encryption
          </div>
        </main>
      )}

      {/* Screen 2: Live Matched Feed & Watermark Unlock */}
      {step === "feed" && (
        <main className="p-5 flex-1 flex flex-col space-y-6">
          {/* Guest Status Banner */}
          <div className="glass-panel rounded-xl p-4 border border-secondary/30 bg-surface-container/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={selfiePreview || ""} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-secondary" />
              <div>
                <h3 className="font-bold text-white text-xs">{guestName}</h3>
                <span className="text-[10px] font-mono text-tertiary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  Live Channel Active
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-secondary/20 text-secondary border border-secondary/40">
              {sampleMatches.length} Matches Found
            </span>
          </div>

          {unlockedSuccess && (
            <div className="p-3 rounded-xl bg-tertiary-container/30 border border-tertiary-fixed-dim/60 text-tertiary text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>{unlockedSuccess}</span>
            </div>
          )}

          {/* Photo Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase text-on-surface-variant font-bold">Your Live Photos</h4>
              <span className="text-[10px] font-mono text-outline">Updated 2m ago</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {sampleMatches.map((m, idx) => (
                <div key={m.id} className="relative rounded-2xl overflow-hidden glass-panel border border-white/10 group shadow-md">
                  <div className="relative aspect-[4/3] bg-surface-container-lowest overflow-hidden">
                    <img src={m.url} alt="Match" className="w-full h-full object-cover" />
                    
                    {/* Watermark Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <span className="text-xl font-mono font-black text-white uppercase tracking-widest rotate-[-25deg] select-none border-2 border-white/60 px-4 py-1 rounded">
                        PREVIEW ONLY
                      </span>
                    </div>

                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-secondary">
                      {m.confidence} Biometric Match
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-outline">
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pay-to-Unlock / Free Preview Banner */}
          <div className="glass-panel-glow rounded-2xl p-5 border border-primary/40 text-center space-y-3 bg-surface-container/80">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Download 4K Unwatermarked Originals</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Get full high-resolution digital prints without watermarks.
              </p>
            </div>

            <button
              onClick={handleUnlockPhotos}
              className="w-full py-2.5 rounded-xl gradient-button text-white font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Unlock All Photos (Free Beta)</span>
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
