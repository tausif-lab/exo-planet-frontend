"use client";

import { useRef, useEffect, useState, useMemo } from "react";
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

// ─── Confidence color logic ────────────────────────────────────────────────
// >90 green (high-confidence planet), 60-90 yellow (edge case), <60 red (likely false positive)
function getConfidenceTier(value: number) {
  if (value >= 90) return { color: "#34d399", glow: "rgba(52,211,153,0.7)", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)", label: "High Confidence" };
  if (value >= 60) return { color: "#fbbf24", glow: "rgba(251,191,36,0.7)", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", label: "Edge Case" };
  return { color: "#f87171", glow: "rgba(248,113,113,0.7)", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", label: "Likely False Positive" };
}

// ─── Raw / Original Light Curve (Time vs Flux) ─────────────────────────────
// Includes a simulated flare + instrument gap so a researcher can sanity-check
// the raw telemetry, not just the cleaned transit.

function OriginalLightCurveChart() {
  const points = useMemo(() => {
    const n = 220;
    return Array.from({ length: n }, (_, i) => {
      const x = i / (n - 1);
      // periodic transits across full baseline
      const period = 0.18;
      const phase = (x % period) / period;
      const inTransit = phase > 0.46 && phase < 0.54;
      const dist = Math.abs(phase - 0.5);
      const dip = inTransit ? 0.02 * Math.cos((dist / 0.04) * (Math.PI / 2)) ** 2 : 0;

      // simulated stellar flare around x=0.33
      const flareCenter = 0.33;
      const flareDist = x - flareCenter;
      const flare = flareDist > 0 && flareDist < 0.02 ? 0.045 * Math.exp(-flareDist * 220) : 0;

      // instrument gap (data dropout) around x=0.62-0.66
      const inGap = x > 0.62 && x < 0.66;

      const noise = (Math.random() - 0.5) * 0.005;
      return { x, y: inGap ? null : 1 - dip + flare + noise, gap: inGap };
    });
  }, []);

  const w = 480, h = 130, pad = { x: 10, y: 10 };
  const toSvg = (x: number, y: number) => ({
    sx: pad.x + x * (w - pad.x * 2),
    sy: pad.y + (1 - (y - 0.93) / 0.12) * (h - pad.y * 2),
  });

  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.y === null) {
      if (current.length) { segments.push(current.join(" ")); current = []; }
      return;
    }
    const { sx, sy } = toSvg(p.x, p.y);
    current.push(`${current.length === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`);
    if (i === points.length - 1 && current.length) segments.push(current.join(" "));
  });

  const gapRanges = (() => {
    const ranges: { start: number; end: number }[] = [];
    let inGap = false, start = 0;
    points.forEach((p) => {
      if (p.gap && !inGap) { inGap = true; start = p.x; }
      if (!p.gap && inGap) { inGap = false; ranges.push({ start, end: p.x }); }
    });
    return ranges;
  })();

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
          Original light curve · flux vs time
        </span>
        <span className="text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.3)" }}>
          raw telemetry
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="none">
        <line x1={pad.x} y1={toSvg(0, 1).sy} x2={w - pad.x} y2={toSvg(0, 1).sy}
          stroke="rgba(214,211,209,0.1)" strokeWidth="1" strokeDasharray="4 4" />
        {/* Instrument gap shading */}
        {gapRanges.map((g, i) => (
          <rect key={i} x={toSvg(g.start, 1).sx} y={pad.y}
            width={toSvg(g.end, 1).sx - toSvg(g.start, 1).sx} height={h - pad.y * 2}
            fill="rgba(214,211,209,0.05)" />
        ))}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
        ))}
      </svg>
      <div className="mt-1.5 flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] font-sans" style={{ color: "rgba(251,191,36,0.6)" }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} /> flux
        </span>
        <span className="flex items-center gap-1 text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.4)" }}>
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "rgba(214,211,209,0.15)" }} /> instrument gap
        </span>
        <span className="text-[10px] font-sans" style={{ color: "rgba(251,191,36,0.5)" }}>
          flare near t≈0.33
        </span>
      </div>
    </div>
  );
}

// ─── BLS Periodogram (Period vs Power) ─────────────────────────────────────
// Shows a strong isolated spike at the recovered period, with low-power
// harmonics/noise elsewhere — visually justifies why this period was picked.

function BLSPeriodogram({ recoveredPeriod }: { recoveredPeriod: number }) {
  const w = 480, h = 130, pad = { x: 10, y: 10 };
  const minP = 0.5, maxP = 12;

  const bars = useMemo(() => {
    const n = 140;
    return Array.from({ length: n }, (_, i) => {
      const period = minP + (i / (n - 1)) * (maxP - minP);
      const distToMain = Math.abs(period - recoveredPeriod);
      const mainSpike = Math.exp(-(distToMain ** 2) / (2 * 0.015 ** 2));
      // harmonics at half and double period (smaller, noisier)
      const half = Math.exp(-((period - recoveredPeriod / 2) ** 2) / (2 * 0.04 ** 2)) * 0.32;
      const dbl = Math.exp(-((period - recoveredPeriod * 2) ** 2) / (2 * 0.08 ** 2)) * 0.22;
      const noiseFloor = 0.04 + Math.random() * 0.05;
      const power = Math.max(mainSpike, half, dbl, noiseFloor);
      return { period, power: Math.min(power, 1) };
    });
  }, [recoveredPeriod]);

  const barW = (w - pad.x * 2) / bars.length;
  const toY = (p: number) => pad.y + (1 - p) * (h - pad.y * 2);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
          BLS periodogram · period vs power
        </span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium font-sans"
          style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
          isolated peak
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="none">
        <line x1={pad.x} y1={toY(0)} x2={w - pad.x} y2={toY(0)} stroke="rgba(214,211,209,0.1)" strokeWidth="1" />
        {bars.map((b, i) => {
          const isMain = Math.abs(b.period - recoveredPeriod) < 0.03;
          const x = pad.x + i * barW;
          const y = toY(b.power);
          return (
            <rect key={i} x={x} y={y} width={Math.max(barW - 0.4, 0.6)} height={toY(0) - y}
              fill={isMain ? "#34d399" : "#f59e0b"}
              opacity={isMain ? 0.95 : 0.35} />
          );
        })}
        {/* marker line at recovered period */}
        <line
          x1={pad.x + ((recoveredPeriod - minP) / (maxP - minP)) * (w - pad.x * 2)}
          y1={pad.y}
          x2={pad.x + ((recoveredPeriod - minP) / (maxP - minP)) * (w - pad.x * 2)}
          y2={toY(0)}
          stroke="#34d399" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.5"
        />
      </svg>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.35)" }}>
          {minP}d
        </span>
        <span className="text-[10px] font-sans" style={{ color: "#34d399" }}>
          peak at {recoveredPeriod.toFixed(2)}d
        </span>
        <span className="text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.35)" }}>
          {maxP}d
        </span>
      </div>
    </div>
  );
}

// ─── Folded Light Curve (Phase vs Flux) with model overlay ────────────────
// Centered at phase 0.0. Scattered raw points + smooth theoretical model
// curve overlaid, so the eye can judge U-shape (planet) vs V-shape (binary).

function FoldedLightCurveChart({ depth, vShapeMetric }: { depth: number; vShapeMetric: number }) {
  const w = 900, h = 260, pad = { x: 24, y: 16 };

  // vShapeMetric: 0 = perfect flat-bottom U (planet), 1 = sharp V (grazing binary)
  const scatter = useMemo(() => {
    const n = 320;
    return Array.from({ length: n }, () => {
      const phase = (Math.random() - 0.5) * 0.5; // -0.25 .. 0.25
      const halfWidth = 0.06;
      const d = Math.abs(phase);
      let dip = 0;
      if (d < halfWidth) {
        const t = d / halfWidth;
        // blend between flat-bottom U (cos^2 plateau) and pointed V (linear)
        const uShape = t < 0.55 ? 1 : Math.cos(((t - 0.55) / 0.45) * (Math.PI / 2)) ** 2;
        const vShape = 1 - t;
        dip = depth * (uShape * (1 - vShapeMetric) + vShape * vShapeMetric);
      }
      const noise = (Math.random() - 0.5) * depth * 0.5;
      return { phase, flux: 1 - dip + noise };
    });
  }, [depth, vShapeMetric]);

  const modelCurve = useMemo(() => {
    const n = 200;
    const halfWidth = 0.06;
    return Array.from({ length: n }, (_, i) => {
      const phase = -0.25 + (i / (n - 1)) * 0.5;
      const d = Math.abs(phase);
      let dip = 0;
      if (d < halfWidth) {
        const t = d / halfWidth;
        const uShape = t < 0.55 ? 1 : Math.cos(((t - 0.55) / 0.45) * (Math.PI / 2)) ** 2;
        const vShape = 1 - t;
        dip = depth * (uShape * (1 - vShapeMetric) + vShape * vShapeMetric);
      }
      return { phase, flux: 1 - dip };
    });
  }, [depth, vShapeMetric]);

  const toSvg = (phase: number, flux: number) => ({
    sx: pad.x + ((phase + 0.25) / 0.5) * (w - pad.x * 2),
    sy: pad.y + (1 - (flux - (1 - depth * 1.6)) / (depth * 1.6 + depth * 0.6)) * (h - pad.y * 2),
  });

  const modelPath = modelCurve
    .map((p, i) => {
      const { sx, sy } = toSvg(p.phase, p.flux);
      return `${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(" ");

  const zeroX = toSvg(0, 1).sx;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
          Folded light curve · phase vs flux (centered at 0.0)
        </span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium font-sans"
          style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
          model overlaid on raw data
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: "clamp(200px, 28vw, 280px)" }} preserveAspectRatio="none">
        {/* baseline */}
        <line x1={pad.x} y1={toSvg(0, 1).sy} x2={w - pad.x} y2={toSvg(0, 1).sy}
          stroke="rgba(214,211,209,0.12)" strokeWidth="1" strokeDasharray="4 4" />
        {/* phase 0 centerline */}
        <line x1={zeroX} y1={pad.y} x2={zeroX} y2={h - pad.y}
          stroke="rgba(245,158,11,0.25)" strokeWidth="1" strokeDasharray="3 3" />
        {/* scattered raw points */}
        {scatter.map((p, i) => {
          const { sx, sy } = toSvg(p.phase, p.flux);
          return <circle key={i} cx={sx} cy={sy} r="1.6" fill="rgba(214,211,209,0.35)" />;
        })}
        {/* theoretical model overlay */}
        <path d={modelPath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={modelPath} fill="none" stroke="#34d399" strokeWidth="6" strokeLinejoin="round" opacity="0.15" />
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-1.5 text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "rgba(214,211,209,0.5)" }} /> raw data points
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-sans" style={{ color: "#34d399" }}>
          <span className="inline-block h-0.5 w-3" style={{ background: "#34d399" }} /> theoretical transit model
        </span>
        <span className="text-[10px] font-sans" style={{ color: "rgba(245,158,11,0.6)" }}>
          phase 0.0 centerline
        </span>
      </div>
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

// ─── Confidence ring (color-coded by tier) ─────────────────────────────────

function ConfidenceRing({ value }: { value: number }) {
  const [animated, setAnimated] = useState(0);
  const tier = getConfidenceTier(value);

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
          <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(214,211,209,0.08)" strokeWidth="6" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={tier.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 64 64)"
            style={{ filter: `drop-shadow(0 0 6px ${tier.glow})` }}
          />
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
      <span
        className="mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium font-sans"
        style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
      >
        {tier.label}
      </span>
    </div>
  );
}

// ─── Diagnostics row (sidebar entry) ────────────────────────────────────────

function DiagnosticRow({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div>
        <p className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.5)" }}>{label}</p>
        {hint && <p className="mt-0.5 text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.3)" }}>{hint}</p>}
      </div>
      <span className="text-sm font-semibold font-serif tabular-nums" style={{ color: "rgba(245,240,235,0.92)" }}>
        {value}
      </span>
    </div>
  );
}

// Shape gauge: visually places the system between U-shape (planet) and V-shape (binary)
function ShapeGauge({ vShapeMetric }: { vShapeMetric: number }) {
  const pct = vShapeMetric * 100;
  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-sans" style={{ color: "rgba(214,211,209,0.5)" }}>V / U Shape Metric</p>
        <span className="text-sm font-semibold font-serif" style={{ color: "rgba(245,240,235,0.92)" }}>
          {vShapeMetric.toFixed(2)}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: pct < 35 ? "#34d399" : pct < 65 ? "#fbbf24" : "#f87171",
            boxShadow: `0 0 6px 2px ${pct < 35 ? "rgba(52,211,153,0.6)" : pct < 65 ? "rgba(251,191,36,0.6)" : "rgba(248,113,113,0.6)"}`,
          }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] font-sans" style={{ color: "rgba(52,211,153,0.6)" }}>Flat U · planetary</span>
        <span className="text-[10px] font-sans" style={{ color: "rgba(248,113,113,0.6)" }}>Sharp V · grazing binary</span>
      </div>
    </div>
  );
}

// Model split: shows the contribution / agreement between the two model branches
function ModelSplitBar({ xgboost, transformer }: { xgboost: number; transformer: number }) {
  return (
    <div className="py-3">
      <p className="mb-2 text-xs font-sans" style={{ color: "rgba(214,211,209,0.5)" }}>Model Vote Split</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div style={{ width: `${xgboost}%`, background: "#fbbf24" }} />
        <div style={{ width: `${transformer}%`, background: "#818cf8" }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-sans">
        <span className="flex items-center gap-1" style={{ color: "#fbbf24" }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#fbbf24" }} />
          XGBoost {xgboost}%
        </span>
        <span className="flex items-center gap-1" style={{ color: "#818cf8" }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#818cf8" }} />
          Transformer {transformer}%
        </span>
      </div>
    </div>
  );
}

// ─── Result mock data ──────────────────────────────────────────────────────

const RESULT = {
  ticId: "TIC 307210830",
  category: "Exoplanet",
  confidence: 94.7,
  orbitalPeriod: 3.24,
  transitDepth: 0.0182,
  transitDuration: 2.14,
  vShapeMetric: 0.18,       // close to 0 → flat U-shape → consistent with a planet
  xgboostVote: 58,
  transformerVote: 42,
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard({ onBack }: { onBack: () => void }) {
  const [headerVisible, setHeaderVisible] = useState(false);
  const tier = getConfidenceTier(RESULT.confidence);

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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── 1. HEADER: The Verdict & Identity ── */}
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
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold sm:text-3xl font-serif" style={{ color: "rgba(245,240,235,0.97)" }}>
                Classification Result
              </h1>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide font-sans"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(214,211,209,0.65)" }}
              >
                {RESULT.ticId}
              </span>
            </div>
            <p className="mt-1 text-sm font-sans" style={{ color: "rgba(214,211,209,0.45)" }}>
              TESS light curve · processed just now
            </p>
          </div>

          {/* Category + confidence verdict badge (color-coded) */}
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-3 self-start sm:self-auto"
            style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
          >
            <div className="h-2.5 w-2.5 rounded-full"
              style={{ background: tier.color, boxShadow: `0 0 8px 2px ${tier.glow}`, animation: "pulse 2s ease-in-out infinite" }} />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-sans" style={{ color: tier.color, opacity: 0.75 }}>
                Detected · {tier.label}
              </p>
              <p className="text-lg font-bold font-serif" style={{ color: tier.color }}>
                {RESULT.category}
                <span className="ml-2 text-sm font-sans font-semibold tabular-nums" style={{ opacity: 0.85 }}>
                  {RESULT.confidence.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Body grid: main column + sidebar diagnostics ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* Main column */}
          <div className="min-w-0">

            {/* ── 2. TOP ROW: Global context & signal recovery ── */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <OriginalLightCurveChart />
              </div>
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <BLSPeriodogram recoveredPeriod={RESULT.orbitalPeriod} />
              </div>
            </div>

            {/* Quick stat strip */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <StatCard
                delay={200}
                label="Transit Depth"
                value={<AnimatedNumber target={RESULT.transitDepth * 1000} decimals={2} />}
                unit="ppt"
                accent="#f97316"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                    <path d="M3 12h4l3 6 4-12 3 6h4" />
                  </svg>
                }
              />
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

            {/* ── 3. MIDDLE ROW: Local morphology — full width, the critical view ── */}
            <div
              className="mb-6 rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <FoldedLightCurveChart depth={RESULT.transitDepth} vShapeMetric={RESULT.vShapeMetric} />
            </div>

            {/* 3D scene */}
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                height: "clamp(300px, 38vw, 420px)",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
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

          {/* ── 4. SIDEBAR: Physical diagnostics matrix ── */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div
              className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h3 className="mb-1 text-sm font-bold font-serif" style={{ color: "rgba(245,240,235,0.92)" }}>
                Physical Diagnostics
              </h3>
              <p className="mb-2 text-[10px] font-sans" style={{ color: "rgba(214,211,209,0.35)" }}>
                Quantified astrophysical parameters
              </p>

              <DiagnosticRow label="Estimated Period" value={`${RESULT.orbitalPeriod.toFixed(2)} d`} />
              <DiagnosticRow label="Transit Depth" value={`${(RESULT.transitDepth * 1000).toFixed(2)} ppt`} />
              <DiagnosticRow label="Transit Duration" value={`${RESULT.transitDuration.toFixed(2)} hrs`} />
              <DiagnosticRow label="Target" value={RESULT.ticId} />

              <div className="mt-2 border-t pt-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="pt-2 text-[10px] uppercase tracking-widest font-sans" style={{ color: "rgba(214,211,209,0.35)" }}>
                  Model Diagnostics
                </p>
                <ModelSplitBar xgboost={RESULT.xgboostVote} transformer={RESULT.transformerVote} />
                <ShapeGauge vShapeMetric={RESULT.vShapeMetric} />
              </div>

              <div
                className="mt-3 rounded-xl p-3"
                style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
              >
                <p className="text-[10px] leading-relaxed font-sans" style={{ color: tier.color, opacity: 0.85 }}>
                  Flat-bottomed phase-folded transit (V/U = {RESULT.vShapeMetric.toFixed(2)}) combined with a
                  dominant XGBoost vote agreement drives the {RESULT.confidence.toFixed(1)}% confidence score.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}