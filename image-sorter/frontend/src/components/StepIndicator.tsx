"use client";

interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Reference Face" },
  { number: 2, label: "Dataset Source" },
  { number: 3, label: "AI Recognition" },
  { number: 4, label: "Results" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8 px-2">
      <div className="flex items-center justify-between relative">
        {/* Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-variant -z-10 -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-secondary to-primary -z-10 -translate-y-1/2 transition-all duration-700"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <div key={step.number} className="flex flex-col items-center gap-2 bg-surface-container/60 px-2 py-1 rounded-lg backdrop-blur-md">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 relative
                  ${
                    isCompleted
                      ? "bg-tertiary-container text-on-tertiary-container shadow-[0_0_10px_rgba(0,165,114,0.4)]"
                      : ""
                  }
                  ${
                    isActive
                      ? "bg-surface-variant border-2 border-secondary text-secondary glow-pulse"
                      : ""
                  }
                  ${
                    !isCompleted && !isActive
                      ? "bg-surface-variant border border-white/10 text-on-surface-variant"
                      : ""
                  }
                `}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                ) : (
                  <span>{step.number}</span>
                )}

                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-secondary/20 animate-ping pointer-events-none" />
                )}
              </div>

              <span
                className={`font-mono text-[11px] tracking-wider transition-colors text-center whitespace-nowrap ${
                  isActive
                    ? "text-secondary font-semibold neon-text-secondary"
                    : isCompleted
                    ? "text-tertiary font-medium"
                    : "text-on-surface-variant"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


