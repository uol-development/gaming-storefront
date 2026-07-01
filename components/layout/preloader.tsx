"use client";

import { useEffect, useState } from "react";

/**
 * Branded first-load splash. Rendered in the root layout so it's present in the
 * initial HTML (visible before hydration) and lives on the persistent layout —
 * meaning it shows on a full page load / hard refresh but NOT on client-side
 * route changes. It waits for `window.load` (or a safety cap), holds for a short
 * minimum so it never flash-and-vanishes, then fades out and unmounts.
 *
 * Animations are transform/opacity only; the global reduced-motion CSS backstop
 * neutralises the loops + shortens the fade for users who opt out.
 */
export function Preloader() {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const MIN_MS = 700; // minimum time the splash stays up
    const MAX_MS = 3500; // safety cap so it never hangs
    const FADE_MS = 550;
    const start = performance.now();
    let done = false;
    let holdTimer: number | undefined;
    let fadeTimer: number | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - start));
      holdTimer = window.setTimeout(() => {
        setLeaving(true);
        fadeTimer = window.setTimeout(() => setMounted(false), FADE_MS);
      }, wait);
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const capTimer = window.setTimeout(finish, MAX_MS);

    return () => {
      window.removeEventListener("load", finish);
      if (holdTimer) window.clearTimeout(holdTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      window.clearTimeout(capTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] grid place-items-center bg-background transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Ambient glow behind the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-7">
        <div className="relative grid size-20 place-items-center">
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl bg-primary/40 blur-2xl animate-pulse"
          />
          <span className="grid size-20 place-items-center rounded-2xl bg-primary font-display text-4xl font-bold text-primary-foreground shadow-2xl shadow-primary/30 animate-[loader-breathe_1.8s_ease-in-out_infinite]">
            N
          </span>
        </div>

        <div className="text-center">
          <p className="font-display text-lg font-bold uppercase tracking-[0.4em] text-foreground">
            NEXUS
          </p>
          <p className="mt-1.5 text-xs tracking-wide text-muted-foreground">Loading your gear…</p>
        </div>

        {/* Indeterminate sweep bar */}
        <div className="relative h-0.5 w-40 overflow-hidden rounded-full bg-secondary">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary animate-[loader-sweep_1.15s_ease-in-out_infinite]"
          />
        </div>
      </div>
    </div>
  );
}
