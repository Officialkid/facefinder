"use client";

import { useState } from "react";
import Link from "next/link";

interface DocSection {
  id: string;
  category: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sections = [
    {
      id: "introduction",
      category: "Getting Started",
      title: "Introduction to FaceFinder AI",
      description: "Enterprise-grade, privacy-first biometric retrieval platform for massive event media.",
    },
    {
      id: "quickstart",
      category: "Getting Started",
      title: "Quickstart & Local Setup",
      description: "Spin up the FastAPI backend and Next.js frontend in under 3 minutes.",
    },
    {
      id: "architecture",
      category: "Deep Learning Core",
      title: "Neural Engine & Embedding Models",
      description: "Mathematical formulation of ArcFace 512-D, RetinaFace alignment, and Angular Margin Loss.",
    },
    {
      id: "cloud-ingestion",
      category: "Dataset Retrieval",
      title: "Multi-Cloud Ingestion Architecture",
      description: "Direct scraping and extraction pipelines for Google Photos, Pixieset, Drive, and ZIPs.",
    },
    {
      id: "security-privacy",
      category: "Security & Compliance",
      title: "Zero-Retention Biometric Privacy",
      description: "Ephemeral in-RAM vectors and strict compliance with Kenya DPA & GDPR standards.",
    },
    {
      id: "api-reference",
      category: "REST API",
      title: "REST API Endpoints",
      description: "Complete API specification for upload, processing status, and batch download endpoints.",
    },
    {
      id: "live-event-qr",
      category: "Live Event Suite",
      title: "Live Event QR Stand & WhatsApp Guide",
      description: "Table QR stand generation, guest selfie enrollment, and real-time webhook dispatches.",
    },
    {
      id: "monetization",
      category: "Commercialization",
      title: "Pay-to-Unlock & M-Pesa Integration",
      description: "Watermarked preview stream, M-Pesa Daraja API webhooks, and revenue-sharing logic.",
    },
  ];

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-on-surface flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      {/* Top Navbar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/10 px-6 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img alt="FaceFinder AI Logo" className="h-8 w-8 rounded-full object-cover" src="/logo.png" />
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]">
                FaceFinder AI
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary font-mono text-[11px]">
              <span>Docs v1.4</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors">
              Platform
            </Link>
            <Link href="/live" className="text-xs font-mono text-secondary hover:text-white transition-colors">
              Live QR Hub
            </Link>
            <Link href="/studio" className="gradient-button text-white px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold shadow-md">
              Studio Login
            </Link>
          </div>
        </div>
      </header>

      {/* Docs Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full pt-20 flex flex-col lg:flex-row">
        {/* Left Sticky Sidebar */}
        <aside className="w-full lg:w-72 border-r border-white/10 p-6 space-y-6 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-y-auto">
          {/* Search Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container rounded-lg border border-white/10 text-xs font-mono text-white placeholder:text-outline focus:outline-none focus:border-secondary"
            />
          </div>

          {/* Navigation Categories */}
          <nav className="space-y-6">
            {Array.from(new Set(filteredSections.map((s) => s.category))).map((category) => (
              <div key={category} className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-outline block font-bold px-2">
                  {category}
                </span>
                <div className="space-y-0.5">
                  {filteredSections
                    .filter((s) => s.category === category)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                          activeSection === item.id
                            ? "bg-secondary/15 text-secondary border border-secondary/40 font-bold shadow-sm"
                            : "text-on-surface-variant hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {activeSection === item.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse flex-shrink-0" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Center Main Content Area */}
        <main className="flex-1 p-6 sm:p-10 max-w-4xl space-y-10">
          {/* Section 1: Introduction */}
          {activeSection === "introduction" && (
            <div className="space-y-6">
              <div className="space-y-2 border-b border-white/10 pb-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-tertiary-container/30 border border-tertiary-fixed-dim/40 text-tertiary">
                  Platform Overview
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Introduction to FaceFinder AI</h1>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  An AI-powered high-throughput biometric indexing and facial retrieval platform designed to solve the "needle-in-a-haystack" problem in event photography.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/10 bg-surface-container-low/60">
                  <span className="material-symbols-outlined text-primary text-[24px]">psychology</span>
                  <h3 className="font-bold text-white text-sm mt-2">512-D Tensor Embeddings</h3>
                  <p className="text-xs text-on-surface-variant mt-1">ArcFace ResNet-50 backbone with 99.83% LFW verification accuracy.</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10 bg-surface-container-low/60">
                  <span className="material-symbols-outlined text-secondary text-[24px]">cloud_sync</span>
                  <h3 className="font-bold text-white text-sm mt-2">Multi-Cloud Ingestion</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Direct parsing of Google Photos, Pixieset, Drive, and Direct ZIP links.</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10 bg-surface-container-low/60">
                  <span className="material-symbols-outlined text-tertiary text-[24px]">lock_reset</span>
                  <h3 className="font-bold text-white text-sm mt-2">Zero-Retention Privacy</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Biometric face tensors calculated ephemerally in RAM and purged on session exit.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 space-y-3">
                <h3 className="text-base font-bold text-white">System Workflow</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs text-on-surface-variant font-mono">
                  <li><strong className="text-white">Reference Enrollment:</strong> Upload reference portrait containing user's face.</li>
                  <li><strong className="text-white">Dataset Ingestion:</strong> Provide Google Photos, Pixieset, or ZIP URL.</li>
                  <li><strong className="text-white">Biometric Scan Cockpit:</strong> Real-time 8-checkpoint pipeline with HUD radar telemetry.</li>
                  <li><strong className="text-white">Verification &amp; Batch Export:</strong> Side-by-side comparison modal with 1-click ZIP download.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Section 2: Quickstart */}
          {activeSection === "quickstart" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Quickstart &amp; Local Setup</h1>
                <p className="text-sm text-on-surface-variant">Run the full stack locally with Python 3.11+ and Node.js 18+.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">1. Backend Setup (FastAPI &amp; DeepFace)</h3>
                <div className="relative rounded-xl overflow-hidden bg-surface-container-lowest border border-white/10 p-4 font-mono text-xs text-secondary">
                  <button
                    onClick={() => handleCopy("cd image-sorter/backend\npip install -r requirements.txt\nuvicorn main:app --host 127.0.0.1 --port 8000", "backend-cmd")}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface border border-white/10 hover:border-secondary text-[11px] text-white"
                  >
                    {copiedKey === "backend-cmd" ? "Copied!" : "Copy"}
                  </button>
                  <pre className="overflow-x-auto">
                    <code>{`cd image-sorter/backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000`}</code>
                  </pre>
                </div>

                <h3 className="text-base font-bold text-white pt-4">2. Frontend Setup (Next.js 14)</h3>
                <div className="relative rounded-xl overflow-hidden bg-surface-container-lowest border border-white/10 p-4 font-mono text-xs text-primary">
                  <button
                    onClick={() => handleCopy("cd image-sorter/frontend\nnpm install\nnpm run dev", "frontend-cmd")}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface border border-white/10 hover:border-primary text-[11px] text-white"
                  >
                    {copiedKey === "frontend-cmd" ? "Copied!" : "Copy"}
                  </button>
                  <pre className="overflow-x-auto">
                    <code>{`cd image-sorter/frontend
npm install
npm run dev`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Neural Architecture */}
          {activeSection === "architecture" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Neural Engine &amp; Mathematical Formulation</h1>
                <p className="text-sm text-on-surface-variant">Deep representation learning on the 512-dimensional unit hypersphere.</p>
              </div>

              <div className="p-5 rounded-xl bg-surface-container/60 border border-white/10 space-y-3 font-mono text-xs text-on-surface-variant">
                <h3 className="font-bold text-white text-sm">Additive Angular Margin Loss (ArcFace):</h3>
                <p className="text-secondary">
                  L3 = - (1/N) * sum( log( exp(s * cos(theta_yi + m)) / ( exp(s * cos(theta_yi + m)) + sum_j exp(s * cos(theta_j)) ) ) )
                </p>
                <p className="text-outline text-[11px]">
                  Where s = 64 (hypersphere scale radius) and m = 0.50 (angular margin penalty). This forces intra-class compactness and inter-class discrepancy on geodesic manifolds.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-surface-container/60 border border-white/10 space-y-3 font-mono text-xs text-on-surface-variant">
                <h3 className="font-bold text-white text-sm">Cosine Distance Similarity Metric:</h3>
                <p className="text-tertiary">
                  Dist(u, v) = 1 - ( (u . v) / ( ||u|| * ||v|| ) )
                </p>
                <p className="text-outline text-[11px]">
                  Vectors with Dist &lt; 0.40 indicate match confidence &gt; 60%.
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Cloud Ingestion */}
          {activeSection === "cloud-ingestion" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Multi-Cloud Ingestion Engine</h1>
                <p className="text-sm text-on-surface-variant">Direct gallery stream extraction from leading photo hosting platforms.</p>
              </div>

              <div className="space-y-4 text-xs font-mono text-on-surface-variant">
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                  <h4 className="font-bold text-white text-sm">Google Photos Albums</h4>
                  <p className="text-outline mt-1">
                    Extracts high-resolution asset tokens (<code className="text-secondary">lh3.googleusercontent.com/...=w1920-h1080-no</code>) without compression artifacts.
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-white/10">
                  <h4 className="font-bold text-white text-sm">Pixieset Client Galleries</h4>
                  <p className="text-outline mt-1">
                    Scrapes public client portals and extracts <code className="text-secondary">pxscdn.com</code> CDN image endpoints automatically.
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-white/10">
                  <h4 className="font-bold text-white text-sm">Google Drive &amp; Dropbox</h4>
                  <p className="text-outline mt-1">
                    Converts public sharing links into direct streaming downloads for atomic extraction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Security & Privacy */}
          {activeSection === "security-privacy" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Zero-Retention Biometric Privacy</h1>
                <p className="text-sm text-on-surface-variant">Compliant with Kenya Data Protection Act 2019 and GDPR standards.</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 space-y-3 text-xs text-on-surface-variant">
                <h3 className="font-bold text-white text-sm">Core Privacy Principles:</h3>
                <ul className="list-disc list-inside space-y-2 font-mono">
                  <li><strong className="text-white">Ephemeral Tensor Lifecycle:</strong> Face vectors exist strictly in RAM during session processing.</li>
                  <li><strong className="text-white">Zero Permanent Vector Database:</strong> No facial embeddings are stored on persistent disk.</li>
                  <li><strong className="text-white">Automated Session Purge:</strong> All temporary download staging directories are purged upon job completion or via <code className="text-error">DELETE /api/results/{`{session_id}`}</code>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Section 6: API Reference */}
          {activeSection === "api-reference" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">REST API Reference</h1>
                <p className="text-sm text-on-surface-variant">Programmatic endpoints for biometric ingestion and retrieval.</p>
              </div>

              <div className="space-y-4">
                <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">POST</span>
                    <span className="text-white font-bold">/api/upload/reference</span>
                  </div>
                  <p className="text-outline">Upload a reference face image to initialize a new processing session.</p>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-secondary/20 text-secondary font-bold">POST</span>
                    <span className="text-white font-bold">/api/process/start</span>
                  </div>
                  <p className="text-outline">Dispatch dataset scanning worker with custom similarity threshold and model.</p>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-bold">GET</span>
                    <span className="text-white font-bold">/api/results/{`{session_id}`}</span>
                  </div>
                  <p className="text-outline">Fetch matched image candidate pool with similarity scores and preview links.</p>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-bold">GET</span>
                    <span className="text-white font-bold">/api/results/{`{session_id}`}/download-all</span>
                  </div>
                  <p className="text-outline">Download all matched photos bundled into a single ZIP archive.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Live Event QR */}
          {activeSection === "live-event-qr" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Live Event QR Stand &amp; WhatsApp Suite</h1>
                <p className="text-sm text-on-surface-variant">Real-time attendee matching and automated notification channels.</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 space-y-3 text-xs text-on-surface-variant font-mono">
                <h3 className="font-bold text-white text-sm">Live Workflow:</h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Host prints acrylic table stands via <Link href="/live" className="text-secondary underline">/live</Link>.</li>
                  <li>Guests scan with mobile camera &rarr; opens <code className="text-tertiary">/event/[eventId]</code>.</li>
                  <li>Guest snaps a 3-second selfie and inputs their WhatsApp phone number.</li>
                  <li>When photographer drops SD cards, matching guests receive instant WhatsApp alerts!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Section 8: Monetization */}
          {activeSection === "monetization" && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-6 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Monetization &amp; Pay-to-Unlock</h1>
                <p className="text-sm text-on-surface-variant">Turn high-volume event galleries into high-converting digital print sales.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-2">
                  <h4 className="font-bold text-white text-sm">Watermarked Preview Stream</h4>
                  <p className="text-outline">Guests view low-res previews with diagonal "PREVIEW ONLY" protection for free.</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-2">
                  <h4 className="font-bold text-white text-sm">M-Pesa STK Push / Stripe</h4>
                  <p className="text-outline">Instant micro-fee unlock (KES 200 / $2.00) delivers full 4K print-ready originals.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
