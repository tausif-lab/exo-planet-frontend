"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Trail } from "@react-three/drei";
import * as THREE from "three";

// ─── Responsive camera rig ──────────────────────────────────────────────────
// On wide/laptop screens the default fixed camera leaves the star + orbit
// system looking small and centered with empty space on the sides. This rig
// watches the canvas aspect ratio and adjusts FOV + distance so the orbit
// ring always reaches comfortably toward the edges of the screen, on
// ultra-wide monitors and on tall/narrow phone screens alike.
function ResponsiveCameraRig() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;

    // Wider screens get a wider field of view so the scene visually expands
    // to fill the extra horizontal space.
    const fov = THREE.MathUtils.clamp(55 + (aspect - 1) * 8, 55, 82);

    // Pulled in much closer than before — this is the main lever for making
    // the star/orbit system read as "big" and fill the screen width on a
    // laptop, rather than floating small in the middle.
    const distance = THREE.MathUtils.clamp(7.5 + (aspect - 1.3) * 1.4, 6.5, 10);

    cam.fov = fov;
    cam.position.set(0, aspect > 1 ? 1.8 : 2.6, distance);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

// ─── 3D Scene Components ───────────────────────────────────────────────────

function Star() {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
      meshRef.current.rotation.x += delta * 0.03;
    }
    if (coronaRef.current) {
      const t = clock.getElapsedTime();
      coronaRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.04);
    }
  });

  return (
    <group>
      {/* Wide outer glow */}
      <mesh>
        <sphereGeometry args={[5.2, 32, 32]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.025} side={THREE.BackSide} />
      </mesh>
      {/* Mid glow */}
      <mesh>
        <sphereGeometry args={[3.6, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
      {/* Pulsing corona */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.3, 32, 32]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      {/* Star body */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.7, 64, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f97316"
          emissiveIntensity={1.6}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>
      {/* Core light */}
      <pointLight color="#fef3c7" intensity={14} distance={40} decay={2} />
      <pointLight color="#f97316" intensity={5} distance={65} decay={1.5} />
    </group>
  );
}

// ── Planet configs ──────────────────────────────────────────────────────────
const PLANET_CONFIGS = [
  {
    color: "#818cf8",
    emissive: "#4f46e5",
    emissiveIntensity: 0.5,
    size: 0.46,
    trailColor: "#6366f1" as THREE.ColorRepresentation,
    orbitA: 6.2,
    orbitB: 2.2,
    orbitH: 1.1,
    speed: 0.55,
    selfSpin: 0.012,
    phase: 0,
  },
  {
    color: "#34d399",
    emissive: "#059669",
    emissiveIntensity: 0.4,
    size: 0.33,
    trailColor: "#10b981" as THREE.ColorRepresentation,
    orbitA: 9.2,
    orbitB: 3.1,
    orbitH: -0.6,
    speed: 0.32,
    selfSpin: 0.009,
    phase: Math.PI * 0.7,
  },
  {
    color: "#f87171",
    emissive: "#b91c1c",
    emissiveIntensity: 0.45,
    size: 0.26,
    trailColor: "#ef4444" as THREE.ColorRepresentation,
    orbitA: 4.2,
    orbitB: 1.4,
    orbitH: 1.55,
    speed: 0.9,
    selfSpin: 0.018,
    phase: Math.PI * 1.4,
  },
];

function OrbitingPlanet({ cfg }: { cfg: (typeof PLANET_CONFIGS)[0] }) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * cfg.speed + cfg.phase;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(t) * cfg.orbitA;
      groupRef.current.position.y = Math.sin(t) * cfg.orbitH;
      groupRef.current.position.z = Math.sin(t) * cfg.orbitB;
    }
    if (planetRef.current) {
      planetRef.current.rotation.y += cfg.selfSpin;
    }
  });

  return (
    <group ref={groupRef}>
      <Trail width={0.12} length={8} color={cfg.trailColor} attenuation={(t) => t * t}>
        <mesh ref={planetRef}>
          <sphereGeometry args={[cfg.size, 32, 32]} />
          <meshStandardMaterial
            color={cfg.color}
            emissive={cfg.emissive}
            emissiveIntensity={cfg.emissiveIntensity}
            roughness={0.55}
            metalness={0.15}
          />
        </mesh>
      </Trail>
    </group>
  );
}

function OrbitalRing({ cfg }: { cfg: (typeof PLANET_CONFIGS)[0] }) {
  const line = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * cfg.orbitA,
          Math.sin(angle) * cfg.orbitH,
          Math.sin(angle) * cfg.orbitB,
        ),
      );
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: cfg.trailColor,
      transparent: true,
      opacity: 0.16,
    });
    return new THREE.Line(geometry, material);
  }, [cfg]);

  return <primitive object={line} />;
}

// ── Meteoroids ──────────────────────────────────────────────────────────────
interface MeteorConfig {
  size: number;
  orbitRadius: number;
  orbitTilt: number;
  speed: number;
  phase: number;
  color: string;
}

function Meteoroid({ cfg }: { cfg: MeteorConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * cfg.speed + cfg.phase;
    if (groupRef.current) {
      const r = cfg.orbitRadius;
      groupRef.current.position.x = Math.cos(t) * r;
      groupRef.current.position.y = Math.sin(t) * Math.sin(cfg.orbitTilt) * r * 0.4;
      groupRef.current.position.z = Math.sin(t) * r * 0.5;
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.z += 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      <Trail width={0.04} length={4} color={cfg.color as THREE.ColorRepresentation} attenuation={(t) => t * t * t}>
        <mesh ref={meshRef}>
          <dodecahedronGeometry args={[cfg.size, 0]} />
          <meshStandardMaterial color={cfg.color} roughness={0.9} metalness={0.3} />
        </mesh>
      </Trail>
    </group>
  );
}

const METEOR_CONFIGS: MeteorConfig[] = [
  { size: 0.075, orbitRadius: 11.0, orbitTilt: 1.1, speed: 1.4, phase: 0.3, color: "#94a3b8" },
  { size: 0.06, orbitRadius: 12.4, orbitTilt: 2.3, speed: 0.9, phase: 2.1, color: "#78716c" },
  { size: 0.1, orbitRadius: 8.2, orbitTilt: 0.7, speed: 1.9, phase: 4.5, color: "#a8a29e" },
  { size: 0.05, orbitRadius: 13.6, orbitTilt: 1.8, speed: 0.7, phase: 1.2, color: "#64748b" },
  { size: 0.07, orbitRadius: 10.0, orbitTilt: 3.0, speed: 2.1, phase: 3.8, color: "#8b7355" },
];

function Scene() {
  return (
    <>
      <ResponsiveCameraRig />
      <ambientLight intensity={0.08} />
      <Stars radius={200} depth={120} count={8000} factor={4} saturation={0.2} fade speed={0.3} />

      <Star />

      {PLANET_CONFIGS.map((cfg, i) => (
        <group key={i}>
          <OrbitalRing cfg={cfg} />
          <OrbitingPlanet cfg={cfg} />
        </group>
      ))}

      {METEOR_CONFIGS.map((cfg, i) => (
        <Meteoroid key={i} cfg={cfg} />
      ))}
    </>
  );
}

// ─── Upload Zone ───────────────────────────────────────────────────────────

type UploadState = "idle" | "dragging" | "loaded";

function UploadZone() {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("loaded");
    const file = e.dataTransfer.files[0];
    if (file) setFileName(file.name);
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setState("loaded");
    }
  }, []);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setState("dragging"); }}
      onDragLeave={() => setState("idle")}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border transition-all duration-300 p-5
        ${
          state === "dragging"
            ? "border-amber-400/60 bg-amber-500/10 shadow-[0_0_24px_2px_rgba(251,191,36,0.2)]"
            : state === "loaded"
              ? "border-amber-300/50 bg-amber-500/5"
              : "border-white/10 bg-white/[0.03] hover:border-amber-400/40 hover:bg-amber-500/5"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".fits,.csv,.txt,.h5,.npy"
        className="hidden"
        onChange={handleFile}
      />

      {state === "loaded" && fileName ? (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-amber-200">{fileName}</p>
            <p className="text-xs text-stone-300/50">Ready for classification</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setState("idle"); setFileName(null); }}
            className="ml-auto text-stone-300/40 hover:text-stone-200/70 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-100/90">
              {state === "dragging" ? "Drop your light curve here" : "Upload TESS light curve"}
            </p>
            <p className="text-xs text-stone-300/45 mt-0.5">.fits · .csv · .h5 · .npy — drag or click</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Classify Button ───────────────────────────────────────────────────────

function ClassifyButton({ onClassify }: { onClassify: () => void }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={() => { setLoading(true); setTimeout(() => onClassify(), 400); }}
      className="
        relative w-full overflow-hidden rounded-xl px-6 py-3.5
        bg-gradient-to-r from-amber-500 to-orange-600
        text-sm font-semibold text-stone-950 tracking-wide
        shadow-[0_0_24px_0px_rgba(251,146,60,0.4)]
        hover:shadow-[0_0_32px_4px_rgba(251,146,60,0.55)]
        hover:from-amber-400 hover:to-orange-500
        active:scale-[0.98] transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
      "
      disabled={loading}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Analysing light curve…
        </span>
      ) : (
        "Run Exoplanet Classification →"
      )}
    </button>
  );
}

// ─── Pipeline Steps ────────────────────────────────────────────────────────

const STEPS = [
  { label: "Noise removal", icon: "⟳" },
  { label: "BLS transit detection", icon: "◈" },
  { label: "Signal classification", icon: "◉" },
  { label: "Parameter estimation", icon: "⊙" },
];

// ─── Typewriter ────────────────────────────────────────────────────────────

function Typewriter({ text, speed = 45, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= text.length) { onDone?.(); return; }
    const timer = setTimeout(() => {
      setDisplayed((prev) => prev + text[index]);
      setIndex((i) => i + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [index, text, speed, onDone]);

  return (
    <>
      {displayed}
      {index < text.length && (
        <span className="inline-block w-[3px] h-[0.85em] bg-indigo-400 ml-1 align-middle animate-pulse" />
      )}
    </>
  );
}

// ─── Main Hero ─────────────────────────────────────────────────────────────

export default function HeroSection({ onClassify }: { onClassify: () => void }) {
  const [phase, setPhase] = useState<"typing" | "revealing" | "done">("typing");

  useEffect(() => {
    if (phase === "revealing") {
      const t = setTimeout(() => setPhase("done"), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#030712]">

      {/* ── Full-screen 3D background canvas ── */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 3, 11], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#030712", width: "100%", height: "100%" }}
        >
          <Scene />
        </Canvas>
      </div>

      {/* ── Subtle vignette to make text more readable ── */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 50%, transparent 30%, rgba(3,7,18,0.55) 100%)",
        }}
      />

      {/* ── Subtle nebula tints ── */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div
          className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full blur-[140px]"
          style={{ background: "rgba(49,46,129,0.12)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-[280px] w-[380px] rounded-full blur-[90px]"
          style={{ background: "rgba(76,29,149,0.08)" }}
        />
      </div>

      {/* ── Hero text overlay — floats above canvas ── */}
      <div className="relative z-20 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-24 text-center lg:px-12">

        {/* Eyebrow */}
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
          style={{
            borderColor: "rgba(251,191,36,0.25)",
            background: "rgba(3,7,18,0.45)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-amber-400"
            style={{ boxShadow: "0 0 6px 2px rgba(251,191,36,0.6)" }}
          />
          <span className="text-xs font-medium tracking-widest text-amber-200/80 uppercase">
            AI-Powered Exoplanet Detection
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mb-6 font-serif text-[2.4rem] font-bold leading-[1.1] tracking-tight text-stone-100
                     sm:text-[3rem] lg:text-[4rem] min-h-[2.4em] lg:min-h-[2em]"
        >
          {phase === "typing" ? (
            <Typewriter text="HUNT WORLDS HIDDEN IN STARLIGHT" speed={50} onDone={() => setPhase("revealing")} />
          ) : (
            <>
              HUNT WORLDS{" "}
              <span
                style={{
                  backgroundImage: "linear-gradient(to right, #fde68a, #fbbf24, #f97316)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                HIDDEN IN STARLIGHT
              </span>
            </>
          )}
        </h1>

        {/* Subtext + form — fade in after typing */}
        <div
          className="w-full max-w-xl transition-all duration-700"
          style={{
            opacity: phase === "typing" ? 0 : 1,
            transform: phase === "typing" ? "translateY(12px)" : "translateY(0)",
          }}
        >
          <p
            className="mb-8 text-base leading-relaxed mx-auto max-w-md font-sans"
            style={{ color: "rgba(245,240,235,0.88)", textShadow: "0 2px 12px rgba(3,7,18,0.8)" }}
          >
            Upload a TESS light curve and our AI pipeline strips the noise, finds periodic transit
            dips, and tells you whether you&apos;re looking at an exoplanet, a binary star, a blend,
            or nothing at all — in seconds.
          </p>

          {/* Pipeline steps */}
          <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 transition-all duration-500"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(3,7,18,0.5)",
                  backdropFilter: "blur(6px)",
                  opacity: phase === "done" ? 1 : 0,
                  transform: phase === "done" ? "translateY(0)" : "translateY(6px)",
                  transitionDelay: phase === "revealing" ? `${i * 80}ms` : "0ms",
                }}
              >
                <span className="text-base text-amber-400/80">{step.icon}</span>
                <span className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.65)" }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Upload + CTA */}
          <div className="flex flex-col gap-3">
            <UploadZone />
            <ClassifyButton onClassify={onClassify} />
          </div>

          <p className="mt-3 text-xs font-sans" style={{ color: "rgba(214,211,209,0.4)" }}>
            Supports TESS 2-min cadence · FITS · CSV · HDF5
          </p>
        </div>
      </div>
    </section>
  );
}