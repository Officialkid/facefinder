"use client";

import { useState } from "react";
import Link from "next/link";

interface Guest {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  matchesCount: number;
  lastNotified: string;
  status: "active" | "queued";
}

interface AlertLog {
  id: string;
  recipient: string;
  phone: string;
  channel: "WhatsApp" | "SMS";
  photoCount: number;
  timestamp: string;
  status: "Delivered" | "Sent";
}

export default function LiveEventHub() {
  const [eventName, setEventName] = useState("Sarah & David Wedding 2026");
  const [eventCode, setEventCode] = useState("WED-8821");
  const [activeTab, setActiveTab] = useState<"qr_stand" | "photographer_upload" | "attendees" | "alerts">("qr_stand");
  const [tableNumber, setTableNumber] = useState("04");
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const [guests, setGuests] = useState<Guest[]>([
    {
      id: "g1",
      name: "Sarah Jenkins",
      phone: "+254 712 345 678",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      matchesCount: 6,
      lastNotified: "2 mins ago",
      status: "active",
    },
    {
      id: "g2",
      name: "David Kimani",
      phone: "+254 722 987 654",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      matchesCount: 4,
      lastNotified: "5 mins ago",
      status: "active",
    },
    {
      id: "g3",
      name: "Amina Hassan",
      phone: "+254 733 112 233",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      matchesCount: 8,
      lastNotified: "Just now",
      status: "active",
    },
  ]);

  const [alerts, setAlerts] = useState<AlertLog[]>([
    {
      id: "a1",
      recipient: "Amina Hassan",
      phone: "+254 733 112 233",
      channel: "WhatsApp",
      photoCount: 3,
      timestamp: "10:42 AM",
      status: "Delivered",
    },
    {
      id: "a2",
      recipient: "Sarah Jenkins",
      phone: "+254 712 345 678",
      channel: "WhatsApp",
      photoCount: 2,
      timestamp: "10:39 AM",
      status: "Delivered",
    },
    {
      id: "a3",
      recipient: "David Kimani",
      phone: "+254 722 987 654",
      channel: "SMS",
      photoCount: 4,
      timestamp: "10:31 AM",
      status: "Delivered",
    },
  ]);

  const handleSimulateBatchUpload = () => {
    setIsUploadingBatch(true);
    setUploadSuccessMessage(null);

    setTimeout(() => {
      setIsUploadingBatch(false);
      setUploadSuccessMessage("Successfully processed Batch #14 (42 photos). 9 new biometric matches dispatched via WhatsApp!");
      
      // Update guests and alerts
      setGuests((prev) =>
        prev.map((g) => ({
          ...g,
          matchesCount: g.matchesCount + Math.floor(Math.random() * 3) + 1,
          lastNotified: "Just now",
        }))
      );

      const newAlert: AlertLog = {
        id: `a-${Date.now()}`,
        recipient: "Sarah Jenkins",
        phone: "+254 712 345 678",
        channel: "WhatsApp",
        photoCount: 2,
        timestamp: "Just now",
        status: "Delivered",
      };

      setAlerts((prev) => [newAlert, ...prev]);
    }, 2000);
  };

  const guestJoinUrl = typeof window !== "undefined" ? `${window.location.origin}/event/${eventCode.toLowerCase()}` : `https://facefinder.ai/event/${eventCode.toLowerCase()}`;

  return (
    <div className="min-h-screen bg-[#020617] text-on-surface flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-surface/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-secondary text-[20px]">arrow_back</span>
              <span className="font-mono text-xs text-on-surface-variant">Back to Main Scanner</span>
            </Link>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <h1 className="font-bold text-white text-base sm:text-lg">Live Event Hub &amp; QR Stand</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline px-3 py-1 rounded-full text-xs font-mono bg-secondary/10 border border-secondary/30 text-secondary">
              Event Code: <strong className="text-white">{eventCode}</strong>
            </span>
            <Link
              href={`/event/${eventCode.toLowerCase()}`}
              target="_blank"
              className="gradient-button text-white px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold shadow-md flex items-center gap-1.5"
            >
              <span>Open Guest View</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8 space-y-8">
        {/* Event Header Banner */}
        <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 border border-primary/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-tertiary-container/30 border border-tertiary-fixed-dim/40 text-tertiary">
              <span className="material-symbols-outlined text-[14px]">sensors</span>
              Live Tethering Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{eventName}</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl">
              Guests scan the table QR code &rarr; take a 3-second selfie &rarr; receive instant WhatsApp notifications as the photographer drops memory cards!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-panel p-3.5 rounded-xl border border-white/10 flex items-center gap-4 bg-surface-container/60">
              <div>
                <span className="text-[10px] font-mono uppercase text-outline block">Registered Guests</span>
                <span className="text-2xl font-bold text-white">{guests.length}</span>
              </div>
              <div className="h-8 w-[1px] bg-white/10" />
              <div>
                <span className="text-[10px] font-mono uppercase text-outline block">Dispatched Alerts</span>
                <span className="text-2xl font-bold text-tertiary neon-text-tertiary">{alerts.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("qr_stand")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "qr_stand"
                ? "bg-secondary text-surface shadow-md"
                : "bg-surface-container text-on-surface-variant hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            <span>1. Table QR Stand Generator</span>
          </button>

          <button
            onClick={() => setActiveTab("photographer_upload")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "photographer_upload"
                ? "bg-secondary text-surface shadow-md"
                : "bg-surface-container text-on-surface-variant hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
            <span>2. Photographer Batch Dropper</span>
          </button>

          <button
            onClick={() => setActiveTab("attendees")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "attendees"
                ? "bg-secondary text-surface shadow-md"
                : "bg-surface-container text-on-surface-variant hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>3. Guest Roster ({guests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "alerts"
                ? "bg-secondary text-surface shadow-md"
                : "bg-surface-container text-on-surface-variant hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">mark_chat_read</span>
            <span>4. Live WhatsApp Logs</span>
          </button>
        </div>

        {/* Tab 1: QR Stand Generator */}
        {activeTab === "qr_stand" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Customizer Settings */}
            <div className="md:col-span-6 glass-panel rounded-2xl p-6 border border-white/10 space-y-6 bg-surface-container-low/40">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
                  <span>Customize Table Stand</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Generate high-resolution printable table cards for reception tables, stages, or venue entrances.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-on-surface-variant block mb-1.5 uppercase">Event Name</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container rounded-lg border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-on-surface-variant block mb-1.5 uppercase">Event Code</label>
                    <input
                      type="text"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-container rounded-lg border border-white/10 text-xs font-mono text-secondary font-bold uppercase focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-on-surface-variant block mb-1.5 uppercase">Table Number</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-container rounded-lg border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container/60 border border-white/5 space-y-2">
                  <span className="text-[11px] font-mono text-outline block">Direct Guest Mobile Link:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={guestJoinUrl}
                      className="flex-1 px-3 py-1.5 bg-surface-container-lowest rounded border border-white/10 text-xs font-mono text-white"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(guestJoinUrl)}
                      className="px-3 py-1.5 rounded bg-surface border border-white/10 hover:border-secondary text-xs font-mono text-secondary"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="gradient-button text-white px-5 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    <span>Print Table Stand (PDF)</span>
                  </button>
                  <Link
                    href={`/event/${eventCode.toLowerCase()}`}
                    target="_blank"
                    className="px-4 py-2.5 rounded-lg bg-surface border border-white/10 hover:border-secondary/40 text-on-surface-variant hover:text-white text-xs font-mono font-semibold transition-all"
                  >
                    Preview Mobile Portal &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Live Stand Preview Card */}
            <div className="md:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-sm rounded-2xl p-6 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-primary/50 shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-tertiary" />
                
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-secondary font-bold">Table #{tableNumber}</span>
                  <h4 className="text-xl font-bold text-white">{eventName}</h4>
                  <p className="text-[11px] text-on-surface-variant">Official AI Photo Finder</p>
                </div>

                {/* Simulated QR Code Canvas */}
                <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(guestJoinUrl)}`}
                    alt="Event QR Stand"
                    className="w-40 h-40 mx-auto"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-tertiary">
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    <span>Scan with your phone camera</span>
                  </div>
                  <p className="text-[11px] text-outline leading-relaxed px-4">
                    Snap a quick selfie &amp; get instant WhatsApp alerts whenever new photos of you are shot by the photographer!
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Powered by FaceFinder AI</span>
                  <span>Zero-Retention Biometrics</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Photographer Batch Dropper */}
        {activeTab === "photographer_upload" && (
          <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6 bg-surface-container-low/40">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">cloud_upload</span>
                <span>Photographer Live Batch Dropzone</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Drop memory card batches or paste cloud folder links during the event. The engine automatically indexes all faces and alerts guests.
              </p>
            </div>

            {uploadSuccessMessage && (
              <div className="p-4 rounded-xl bg-tertiary-container/30 border border-tertiary-fixed-dim/60 text-tertiary text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{uploadSuccessMessage}</span>
              </div>
            )}

            <div className="border-2 border-dashed border-primary/40 rounded-xl p-8 text-center space-y-4 bg-surface-container/30 hover:border-secondary/60 transition-colors">
              <div className="w-14 h-14 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center mx-auto text-secondary">
                <span className="material-symbols-outlined text-[28px]">sd_card</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Drop SD Card Photos / Batch Folder</h4>
                <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                  Drag &amp; drop 50 to 5,000 photos from your camera dump. ArcFace indexes faces in parallel.
                </p>
              </div>

              <button
                disabled={isUploadingBatch}
                onClick={handleSimulateBatchUpload}
                className="gradient-button text-white px-6 py-2.5 rounded-lg text-xs font-mono font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isUploadingBatch ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Indexing 42 Photos &amp; Running Periocular Matching...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    <span>Simulate Batch Ingestion (42 Photos)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Guest Roster */}
        {activeTab === "attendees" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 bg-surface-container-low/40">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Registered Event Guests</h3>
                <p className="text-xs text-on-surface-variant mt-1">Guests who scanned the table QR code and enrolled selfies.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-tertiary-container/30 border border-tertiary-fixed-dim/40 text-tertiary">
                {guests.length} Active Channels
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {guests.map((g) => (
                <div key={g.id} className="glass-panel rounded-xl p-4 border border-white/10 bg-surface-container/60 flex items-center gap-3.5 shadow-md">
                  <img src={g.avatar} alt={g.name} className="w-12 h-12 rounded-full object-cover border border-secondary/50 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-xs truncate">{g.name}</h4>
                    <p className="text-[11px] font-mono text-on-surface-variant truncate">{g.phone}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className="text-secondary font-bold">{g.matchesCount} Photos Found</span>
                      <span className="text-outline">{g.lastNotified}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Live WhatsApp Logs */}
        {activeTab === "alerts" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 bg-surface-container-low/40">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">chat</span>
                <span>Real-Time WhatsApp &amp; SMS Dispatch Logs</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Automated webhook notifications delivered to guests with direct links to their matched gallery.
              </p>
            </div>

            <div className="space-y-2.5">
              {alerts.map((a) => (
                <div key={a.id} className="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center border border-tertiary/40">
                      <span className="material-symbols-outlined text-[16px]">sms</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        Sent <strong className="text-secondary">{a.photoCount} new matches</strong> to {a.recipient}
                      </p>
                      <span className="text-[10px] font-mono text-outline">Channel: {a.channel} &bull; {a.phone}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">
                      {a.status}
                    </span>
                    <span className="block text-[10px] font-mono text-outline mt-0.5">{a.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
