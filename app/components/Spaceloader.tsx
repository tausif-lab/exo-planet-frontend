"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { id: 1, label: "Ingesting light curve data", duration: 800 },
  { id: 2, label: "Removing photometric noise", duration: 900 },
  { id: 3, label: "Running Box Least Squares", duration: 1000 },
  { id: 4, label: "Classifying transit signal", duration: 800 },
  { id: 5, label: "Estimating orbital parameters", duration: 700 },
];

export default function SpaceLoader({ onComplete }: { onComplete: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let stepIndex = 0;
    let elapsed = 0;

    const advance = () => {
      if (stepIndex >= STEPS.length) {
        setTimeout(onComplete, 400);
        return;
      }
      setActiveStep(stepIndex + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 300);

      const duration = STEPS[stepIndex].duration;
      elapsed += duration;
      setTimeout(() => {
        setDoneSteps((prev) => [...prev, stepIndex + 1]);
        stepIndex++;
        advance();
      }, duration);
    };

    const start = setTimeout(advance, 300);
    return () => clearTimeout(start);
  }, [onComplete]);

  const progress = Math.round((doneSteps.length / STEPS.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "#030712" }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full blur-[140px]"
          style={{
            width: 500,
            height: 500,
            top: "-10%",
            left: "-10%",
            background: "rgba(49,46,129,0.18)",
          }}
        />
        <div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: 400,
            height: 400,
            bottom: "-5%",
            right: "-5%",
            background: "rgba(76,29,149,0.14)",
          }}
        />
      </div>

      {/* Star field */}
      <StarField />

      {/* Card */}
      <div
        className="relative z-10 flex w-full max-w-sm flex-col items-center px-8 py-10 mx-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 24,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Pulsar icon */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 72,
              height: 72,
              border: "1px solid rgba(99,102,241,0.25)",
              animation: "ping-slow 2s ease-in-out infinite",
            }}
          />
          {/* Mid ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 56,
              height: 56,
              border: "1px solid rgba(99,102,241,0.35)",
              animation: "ping-slow 2s ease-in-out infinite 0.4s",
            }}
          />
          {/* Core */}
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: pulse
                ? "rgba(99,102,241,0.35)"
                : "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.5)",
              transition: "background 0.2s",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(165,180,252,0.9)"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
              <path d="M12 6v2M12 16v2M6 12H4M20 12h-2" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <p
          className="mb-1 text-sm font-semibold tracking-widest uppercase"
          style={{ color: "rgba(165,180,252,0.85)", fontFamily: "var(--font-display, sans-serif)" }}
        >
          Analysing Signal
        </p>
        <p className="mb-8 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          TESS light curve pipeline running
        </p>

        {/* Steps */}
        <div className="w-full space-y-3 mb-8">
          {STEPS.map((step) => {
            const done = doneSteps.includes(step.id);
            const active = activeStep === step.id && !done;
            return (
              <div key={step.id} className="flex items-center gap-3">
                {/* Status dot */}
                <div
                  className="flex-shrink-0 rounded-full transition-all duration-300"
                  style={{
                    width: 7,
                    height: 7,
                    background: done
                      ? "#34d399"
                      : active
                      ? "#818cf8"
                      : "rgba(255,255,255,0.12)",
                    boxShadow: done
                      ? "0 0 6px rgba(52,211,153,0.6)"
                      : active
                      ? "0 0 8px rgba(129,140,248,0.8)"
                      : "none",
                  }}
                />
                <span
                  className="text-xs transition-colors duration-300"
                  style={{
                    color: done
                      ? "rgba(52,211,153,0.8)"
                      : active
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.25)",
                    fontFamily: "var(--font-body, sans-serif)",
                  }}
                >
                  {step.label}
                </span>
                {active && (
                  <span
                    className="ml-auto text-[10px]"
                    style={{ color: "rgba(129,140,248,0.6)" }}
                  >
                    running…
                  </span>
                )}
                {done && (
                  <span
                    className="ml-auto text-[10px]"
                    style={{ color: "rgba(52,211,153,0.5)" }}
                  >
                    done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden mb-3"
          style={{ height: 3, background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, #6366f1, #22d3ee)",
              boxShadow: "0 0 8px rgba(99,102,241,0.6)",
            }}
          />
        </div>
        <p
          className="text-xs tabular-nums"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          {progress}% complete
        </p>
      </div>

      <style>{`
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

// Minimal static star field — pure CSS, no canvas needed
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.5 + 0.1,
    delay: Math.random() * 3,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: "white",
            opacity: s.opacity,
            animation: `twinkle 3s ease-in-out infinite ${s.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--op, 0.2); }
          50% { opacity: 0.05; }
        }
      `}</style>
    </div>
  );
}