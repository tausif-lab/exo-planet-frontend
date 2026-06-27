"use client";

import { useRef, useEffect, useState , useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, Trail } from "@react-three/drei";
import * as THREE from "three";

// ─── Reused 3D scene (same as Hero) ───────────────────────────────────────

function Star() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.12;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.25, 32, 32]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.0, 64, 64]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f97316" emissiveIntensity={1.2} roughness={0.85} metalness={0} />
      </mesh>
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
      groupRef.current.position.x = Math.cos(t * 0.6) * 2.8;
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.5;
      groupRef.current.position.z = Math.sin(t * 0.6) * 1.0;
    }
    if (planetRef.current) planetRef.current.rotation.y += 0.01;
  });
  return (
    <group ref={groupRef}>
      <Trail width={0.15} length={6} color={"#f59e0b"} attenuation={(t) => t * t}>
        <mesh ref={planetRef}>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#ea580c" emissiveIntensity={0.4} roughness={0.6} metalness={0.2} />
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
      color: "#f59e0b",
      transparent: true,
      opacity: 0.2,
    });
    return new THREE.Line(geometry, material);
  }, []);

  return <primitive object={line} />;
}

function Scene3D() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <Stars radius={80} depth={60} count={3000} factor={3} saturation={0.3} fade speed={0.3} />
      <Star />
      <OrbitalRing />
      <OrbitingPlanet />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.7} />
    </>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, decimals]);
  return <>{value.toFixed(decimals)}{suffix}</>;
}

// ─── Light curve mini chart ────────────────────────────────────────────────

function LightCurveChart() {
  // Simulated transit dip
  const points = Array.from({ length: 80 }, (_, i) => {
    const x = i / 79;
    const transitCenter = 0.5;
    const transitWidth = 0.08;
    const dist = Math.abs(x - transitCenter);
    const dip = dist < transitWidth
      ? 0.035 * Math.cos((dist / transitWidth) * (Math.PI / 2)) ** 2
      : 0;
    const noise = (Math.random() - 0.5) * 0.004;
    return { x, y: 1 - dip + noise };
  });

  const w = 400;
  const h = 80;
  const pad = { x: 8, y: 8 };
  const toSvg = (x: number, y: number) => ({
    sx: pad.x + x * (w - pad.x * 2),
    sy: pad.y + (1 - (y - 0.955) / 0.055) * (h - pad.y * 2),
  });

  const pathD = points
    .map((p, i) => {
      const { sx, sy } = toSvg(p.x, p.y);
      return `${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
          Light curve · flux vs time
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium font-sans"
          style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
        >
          Transit detected
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: 80 }}
        preserveAspectRatio="none"
      >
        {/* Baseline */}
        <line x1={pad.x} y1={toSvg(0, 1).sy} x2={w - pad.x} y2={toSvg(0, 1).sy}
          stroke="rgba(214,211,209,0.1)" strokeWidth="1" strokeDasharray="4 4" />
        {/* Transit zone highlight */}
        <rect
          x={toSvg(0.42, 1).sx} y={pad.y}
          width={toSvg(0.58, 1).sx - toSvg(0.42, 1).sx}
          height={h - pad.y * 2}
          fill="rgba(251,191,36,0.08)"
        />
        {/* Curve */}
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Glow copy */}
        <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinejoin="round" opacity="0.15" />
        {/* Transit dip label */}
        <text x={toSvg(0.5, 1).sx} y={h - 2} textAnchor="middle"
          fontSize="8" fill="rgba(251,191,36,0.55)">transit</text>
      </svg>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  icon,
  accent,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ReactNode;
  accent: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-700"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest font-sans" style={{ color: "rgba(214,211,209,0.4)" }}>
          {label}
        </span>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <span
          className="text-3xl font-bold tabular-nums leading-none font-serif"
          style={{ color: "rgba(245,240,235,0.92)" }}
        >
          {value}
        </span>
        {unit && (
          <span className="mb-0.5 text-sm font-sans" style={{ color: "rgba(214,211,209,0.4)" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Confidence ring ───────────────────────────────────────────────────────

function ConfidenceRing({ value }: { value: number }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const duration = 1400;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(eased * value);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (animated / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Track */}
          <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(214,211,209,0.08)" strokeWidth="6" />
          {/* Fill */}
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke="url(#confGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 64 64)"
          />
          <defs>
            <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-serif" style={{ color: "rgba(245,240,235,0.95)" }}>
            {animated.toFixed(1)}
            <span className="text-sm">%</span>
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs uppercase tracking-widest font-sans" style={{ color: "rgba(214,211,209,0.4)" }}>
        Confidence
      </span>
    </div>
  );
}

// ─── Result mock data ──────────────────────────────────────────────────────

const RESULT = {
  category: "Exoplanet",
  confidence: 94.7,
  orbitalPeriod: 3.24,
  transitDepth: 0.0182,
  transitDuration: 2.14,
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard({ onBack }: { onBack: () => void }) {
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full" style={{ background: "#030712" }}>
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute rounded-full blur-[140px]"
          style={{ width: 600, height: 600, top: "-15%", left: "-10%", background: "rgba(120,53,15,0.15)" }} />
        <div className="absolute rounded-full blur-[120px]"
          style={{ width: 400, height: 400, bottom: "-5%", right: "-5%", background: "rgba(154,52,18,0.12)" }} />
      </div>

      {/* Grid */}
      <div className="pointer-events-none fixed inset-0" style={{
        backgroundImage: "linear-gradient(rgba(251,191,36,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.025) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700"
          style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? "none" : "translateY(-8px)" }}
        >
          <div>
            <div className="mb-1 flex items-center gap-2">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs transition-colors font-sans"
                style={{ color: "rgba(214,211,209,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(245,240,235,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(214,211,209,0.4)")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back
              </button>
            </div>
            <h1
              className="text-2xl font-bold sm:text-3xl font-serif"
              style={{ color: "rgba(245,240,235,0.97)" }}
            >
              Classification Result
            </h1>
            <p className="mt-1 text-sm font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
              TESS light curve · processed just now
            </p>
          </div>

          {/* Category badge */}
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-3 self-start sm:self-auto"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400"
              style={{ boxShadow: "0 0 8px 2px rgba(251,191,36,0.7)", animation: "pulse 2s ease-in-out infinite" }} />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-sans" style={{ color: "rgba(253,230,138,0.65)" }}>
                Detected
              </p>
              <p className="text-lg font-bold font-serif" style={{ color: "rgba(253,230,138,0.95)" }}>
                {RESULT.category}
              </p>
            </div>
          </div>
        </div>

        {/* Top row: confidence + stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Confidence */}
          <div
            className="flex items-center justify-center rounded-2xl py-6 sm:col-span-1"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <ConfidenceRing value={RESULT.confidence} />
          </div>

          {/* Orbital Period */}
          <StatCard
            delay={100}
            label="Orbital Period"
            value={<AnimatedNumber target={RESULT.orbitalPeriod} decimals={2} />}
            unit="days"
            accent="#fbbf24"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
          />

          {/* Transit Depth */}
          <StatCard
            delay={200}
            label="Transit Depth"
            value={<AnimatedNumber target={RESULT.transitDepth * 100} decimals={3} />}
            unit="%"
            accent="#f97316"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                <path d="M3 12h4l3 6 4-12 3 6h4" />
              </svg>
            }
          />

          {/* Transit Duration */}
          <StatCard
            delay={300}
            label="Transit Duration"
            value={<AnimatedNumber target={RESULT.transitDuration} decimals={2} />}
            unit="hrs"
            accent="#fde68a"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fde68a" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            }
          />
        </div>

        {/* Light curve */}
        <div
          className="mb-6 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <LightCurveChart />
        </div>

        {/* 3D scene */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            height: "clamp(300px, 45vw, 480px)",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full blur-[80px]"
              style={{ width: 280, height: 280, background: "rgba(251,191,36,0.07)" }} />
          </div>

          <Canvas
            camera={{ position: [0, 2.5, 7], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <Scene3D />
          </Canvas>

          {/* Overlay labels */}
          <div className="pointer-events-none absolute left-4 top-4">
            <p className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.4)" }}>
              Simulated system · {RESULT.category}
            </p>
          </div>

          <div
            className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 backdrop-blur-md"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(3,7,18,0.5)" }}
          >
            <p className="whitespace-nowrap text-xs font-sans" style={{ color: "rgba(214,211,209,0.5)" }}>
              Orbital period {RESULT.orbitalPeriod}d · drag to explore
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}