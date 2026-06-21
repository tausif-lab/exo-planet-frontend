"use client";

import { useRef, useState,useEffect, useCallback , useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, Trail } from "@react-three/drei";
import * as THREE from "three";

// ─── 3D Scene Components ───────────────────────────────────────────────────

function Star() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Outer soft glow */}
      <mesh>
        <sphereGeometry args={[1.25, 32, 32]} />
        <meshBasicMaterial
          color="#f97316"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Star body */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.0, 64, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f97316"
          emissiveIntensity={1.2}
          roughness={0.85}
          metalness={0.0}
        />
      </mesh>
      {/* Point light from star */}
      <pointLight color="#fbbf24" intensity={6} distance={12} />
    </group>
  );
}

function OrbitingPlanet() {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
  const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Orbital motion — tilted ellipse
      const a = 2.8; // semi-major axis
      const b = 1.0; // semi-minor axis (depth gives 3D feel)
      groupRef.current.position.x = Math.cos(t * 0.6) * a;
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.5;
      groupRef.current.position.z = Math.sin(t * 0.6) * b;
    }
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Trail
        width={0.15}
        length={6}
        color={"#6366f1"}
        attenuation={(t) => t * t}
      >
        <mesh ref={planetRef}>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#4f46e5"
            emissiveIntensity={0.4}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      </Trail>
    </group>
  );
}

function OrbitalRing() {
  const line = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * 2.8,
          Math.sin(angle) * 0.5,
          Math.sin(angle) * 1.0,
        ),
      );
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: "#6366f1",
      transparent: true,
      opacity: 0.18,
    });
    return new THREE.Line(geometry, material);
  }, []);

  return <primitive object={line} />;
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <Stars
        radius={80}
        depth={60}
        count={4000}
        factor={3}
        saturation={0.3}
        fade
        speed={0.4}
      />
      <Star />
      <OrbitalRing />
      <OrbitingPlanet />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.7}
      />
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
      onDragOver={(e) => {
        e.preventDefault();
        setState("dragging");
      }}
      onDragLeave={() => setState("idle")}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border transition-all duration-300 p-5
        ${
          state === "dragging"
            ? "border-indigo-400 bg-indigo-500/10 shadow-[0_0_24px_2px_rgba(99,102,241,0.25)]"
            : state === "loaded"
              ? "border-cyan-400/60 bg-cyan-500/5"
              : "border-white/10 bg-white/[0.03] hover:border-indigo-500/50 hover:bg-indigo-500/5"
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15">
            <svg
              className="h-4 w-4 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-cyan-300">
              {fileName}
            </p>
            <p className="text-xs text-white/40">Ready for classification</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setState("idle");
              setFileName(null);
            }}
            className="ml-auto text-white/30 hover:text-white/60 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <svg
              className="h-5 w-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">
              {state === "dragging"
                ? "Drop your light curve here"
                : "Upload TESS light curve"}
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              .fits · .csv · .h5 · .npy — drag or click
            </p>
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
      onClick={() => {
        setLoading(true);
        setTimeout(() => onClassify(), 400);
      }}
      className="
        relative w-full overflow-hidden rounded-xl px-6 py-3.5
        bg-gradient-to-r from-indigo-600 to-violet-600
        text-sm font-semibold text-white tracking-wide
        shadow-[0_0_24px_0px_rgba(99,102,241,0.4)]
        hover:shadow-[0_0_32px_4px_rgba(99,102,241,0.55)]
        hover:from-indigo-500 hover:to-violet-500
        active:scale-[0.98] transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
      "
      disabled={loading}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
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

function Typewriter({
  text,
  speed = 45,
  onDone,
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= text.length) {
      onDone?.();
      return;
    }
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
      {/* Nebula gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full blur-[120px]"
          style={{ background: "rgba(49,46,129,0.2)" }}
        />
        <div
          className="absolute right-0 top-1/4 h-[400px] w-[500px] rounded-full blur-[100px]"
          style={{ background: "rgba(23,37,84,0.15)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-[300px] w-[400px] rounded-full blur-[80px]"
          style={{ background: "rgba(76,29,149,0.1)" }}
        />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pt-24 pb-16 lg:flex-row lg:items-center lg:px-12">

        {/* ── Left ── */}
        <div className="flex flex-col justify-center lg:w-[46%] lg:pr-8">

          {/* Eyebrow */}
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5"
            style={{ borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"
              style={{ boxShadow: "0 0 6px 2px rgba(34,211,238,0.6)" }} />
            <span className="text-xs font-medium tracking-widest text-indigo-300 uppercase">
              AI-Powered Exoplanet Detection
            </span>
          </div>

          {/* Headline — typewriter */}
          <h1 className="mb-5 font-display text-[2.6rem] font-bold leading-[1.1] tracking-tight text-white lg:text-[3.4rem] min-h-[2.2em]">
            {phase === "typing" ? (
              <Typewriter
                text="Hunt worlds hidden in starlight"
                speed={50}
                onDone={() => setPhase("revealing")}
              />
            ) : (
              <>
                Hunt worlds{" "}
                <span
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #818cf8, #a78bfa, #22d3ee)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  hidden in starlight
                </span>
              </>
            )}
          </h1>

          {/* Subtext — fades in after typing */}
          <div
            className="transition-all duration-700"
            style={{
              opacity: phase === "typing" ? 0 : 1,
              transform: phase === "typing" ? "translateY(10px)" : "translateY(0)",
            }}
          >
            <p className="mb-8 max-w-md text-base leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              Upload a TESS light curve and our AI pipeline strips the noise,
              finds periodic transit dips, and tells you whether you&apos;re
              looking at an exoplanet, a binary star, a blend, or nothing at all
              — in seconds.
            </p>

            {/* Pipeline steps */}
            <div className="mb-8 grid grid-cols-2 gap-2">
              {STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-all duration-500"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.025)",
                    opacity: phase === "done" ? 1 : phase === "revealing" ? 0 : 0,
                    transform:
                      phase === "done"
                        ? "translateY(0)"
                        : "translateY(6px)",
                    transitionDelay: phase === "revealing" ? `${i * 80}ms` : "0ms",
                  }}
                >
                  <span className="text-base text-indigo-400">{step.icon}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
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

            <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Supports TESS 2-min cadence · FITS · CSV · HDF5
            </p>
          </div>
        </div>

        {/* ── Right: 3D Canvas — slides in after typing ── */}
        <div
          className="relative mt-10 h-[420px] lg:mt-0 lg:h-auto lg:w-[54%] lg:self-stretch transition-all duration-1000"
          style={{
            opacity: phase === "typing" ? 0 : 1,
            transform: phase === "typing" ? "translateX(40px)" : "translateX(0)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-64 w-64 rounded-full blur-[80px]"
              style={{ background: "rgba(251,191,36,0.08)" }}
            />
          </div>

          <Canvas
            camera={{ position: [0, 2.5, 7], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <Scene />
          </Canvas>

          <div
            className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 backdrop-blur-md"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.4)",
            }}
          >
            <p className="whitespace-nowrap text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Star + exoplanet system · drag to explore
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}