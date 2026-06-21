"use client";

import { useState } from "react";
import HeroSection from "./components/Hero";
import SpaceLoader from "./components/Spaceloader";
import Dashboard from "./components/Dashboard ";

type AppState = "hero" | "loading" | "dashboard";

export default function Home() {
  const [state, setState] = useState<AppState>("hero");

  return (
    <main>
      {state === "hero" && (
        <HeroSection onClassify={() => setState("loading")} />
      )}
      {state === "loading" && (
        <SpaceLoader onComplete={() => setState("dashboard")} />
      )}
      {state === "dashboard" && (
        <Dashboard onBack={() => setState("hero")} />
      )}
    </main>
  );
}