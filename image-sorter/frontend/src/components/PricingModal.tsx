"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: Props) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [unlockedSuccess, setUnlockedSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFreeTrial = (tierName: string) => {
    setUnlockedSuccess(`Activated ${tierName} plan in Community Preview Mode! (100% free access enabled)`);
    setTimeout(() => {
      setUnlockedSuccess(null);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl glass-panel-glow rounded-2xl p-6 sm:p-8 border border-primary/40 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-secondary/10 border border-secondary/30 text-secondary mb-2">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Commercial SaaS Tiers
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Flexible Plans for Photographers &amp; Event Creators
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Currently in <span className="text-tertiary font-bold">Public Beta Preview</span> � all features are free to test and use!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface border border-white/10 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Notification message */}
        {unlockedSuccess && (
          <div className="p-3.5 rounded-xl bg-tertiary-container/20 border border-tertiary-fixed-dim/40 text-tertiary text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{unlockedSuccess}</span>
          </div>
        )}

        {/* Billing cycle switch */}
        <div className="flex justify-center">
          <div className="p-1 rounded-xl bg-surface-container border border-white/10 inline-flex items-center gap-2">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-secondary text-surface shadow-md"
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-secondary text-surface shadow-md"
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-tertiary-container text-tertiary rounded-full">Save 25%</span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Free / Community Tier */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 flex flex-col justify-between space-y-4 bg-surface-container-low/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-base font-bold text-white">Starter Free</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-on-surface-variant">Active</span>
              </div>
              <p className="text-xs text-on-surface-variant">For personal photo searches &amp; single album sorting.</p>
              <div className="my-4">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-xs text-on-surface-variant font-mono"> / forever</span>
              </div>
              <ul className="space-y-2 text-xs text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Up to 500 photos per album</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>ArcFace 512-D Recognition</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Google Photos &amp; Drive URLs</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>ZIP batch download</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleFreeTrial("Starter Free")}
              className="w-full py-2.5 rounded-lg border border-white/20 hover:border-secondary/50 text-white font-mono text-xs font-bold transition-all bg-surface-container hover:bg-surface-container-high"
            >
              Included Free
            </button>
          </div>

          {/* Pro Photographer Tier */}
          <div className="glass-panel-glow rounded-xl p-5 border-2 border-primary relative flex flex-col justify-between space-y-4 bg-surface-container/60 shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-primary to-secondary text-surface text-[10px] font-mono font-bold shadow-md">
              Most Popular for Events
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 mt-1">
                <h3 className="font-mono text-base font-bold text-white">Event Pro</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/40">Popular</span>
              </div>
              <p className="text-xs text-on-surface-variant">For wedding &amp; event photographers delivering client galleries.</p>
              <div className="my-4">
                <span className="text-3xl font-bold text-white">{billingCycle === "monthly" ? "$29" : "$22"}</span>
                <span className="text-xs text-on-surface-variant font-mono"> / month</span>
              </div>
              <ul className="space-y-2 text-xs text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Up to 10,000 photos per event</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Live Event QR-Code Guest Matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Pixieset, Google Photos &amp; Cloud Drive</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>High-speed priority GPU queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Custom Watermarking on previews</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleFreeTrial("Event Pro")}
              className="w-full py-2.5 rounded-lg gradient-button text-white font-mono text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
            >
              Start Free Preview (0 USD)
            </button>
          </div>

          {/* Enterprise & Agency Tier */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 flex flex-col justify-between space-y-4 bg-surface-container-low/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-base font-bold text-white">Agency Scale</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-tertiary/20 text-tertiary border border-tertiary/40">Enterprise</span>
              </div>
              <p className="text-xs text-on-surface-variant">For marathons, festivals, universities &amp; media agencies.</p>
              <div className="my-4">
                <span className="text-3xl font-bold text-white">{billingCycle === "monthly" ? "$99" : "$79"}</span>
                <span className="text-xs text-on-surface-variant font-mono"> / month</span>
              </div>
              <ul className="space-y-2 text-xs text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Unlimited photos &amp; concurrent scans</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>Live camera tethering ingestion</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>WhatsApp &amp; SMS Instant Notification API</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check</span>
                  <span>M-Pesa / Stripe Pay-to-Unlock integration</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleFreeTrial("Agency Scale")}
              className="w-full py-2.5 rounded-lg border border-white/20 hover:border-secondary/50 text-white font-mono text-xs font-bold transition-all bg-surface-container hover:bg-surface-container-high"
            >
              Test Enterprise Features
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="p-3 rounded-lg bg-surface border border-white/5 text-center text-xs text-on-surface-variant">
          Payments gateway integration (M-Pesa &amp; Stripe) will be enabled for production deployments. All features are fully usable today without credit card.
        </div>
      </div>
    </div>
  );
}
