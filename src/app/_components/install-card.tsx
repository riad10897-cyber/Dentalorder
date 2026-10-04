"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// The browser's own install prompt (Chrome on Android and desktop). Not in
// TypeScript's DOM types yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "molaro-install-dismissed";

type Mode = "hidden" | "prompt" | "ios";

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia("(display-mode: standalone)").matches;
}

function isIOS(): boolean {
  // iPadOS reports itself as a Mac; touch gives it away.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Add Molaro to your home screen", inside the app rather than in the
 * WhatsApp message that shares the link. Android and desktop Chrome get a
 * real Install button; iPhone, which has no such button, gets the two taps
 * written out. Shown only in a browser tab, never once installed, and
 * "Not now" hides it on this phone for good.
 *
 * Renders nothing on the server and on the first paint: whether to show it
 * depends on the browser, and guessing would flash it at installed users.
 */
export function InstallCard({ native = false }: { native?: boolean }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || wasDismissed()) return;
    if (isIOS()) {
      setMode("ios");
      return;
    }
    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("prompt");
    }
    function onInstalled() {
      setMode("hidden");
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: it simply comes back next visit.
    }
    setMode("hidden");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setMode("hidden");
  }

  if (mode === "hidden") return null;

  return (
    <section
      aria-label="Add Molaro to your home screen"
      className={
        native
          ? "mt-4 rounded-group bg-card px-4 py-3.5"
          : "mx-5 mt-4 rounded-card border border-rule bg-card px-4 py-3.5"
      }
    >
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-control" />
        <div className="min-w-0">
          <h2 className="font-display text-body text-ink">Add Molaro to your home screen</h2>
          {mode === "ios" ? (
            <p className="mt-0.5 text-small text-ink-muted">
              Tap{" "}
              <span className="whitespace-nowrap text-ink">
                <ShareGlyph /> Share
              </span>{" "}
              at the bottom of Safari, then <span className="text-ink">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-small text-ink-muted">It opens like an app, full screen, one tap away.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {mode === "prompt" && (
          <button
            type="button"
            onClick={install}
            className="pressable min-h-11 flex-[2] rounded-control bg-ink px-4 font-display text-small text-card"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className={`pressable min-h-11 rounded-control border border-rule bg-card px-4 font-display text-small text-ink-muted ${
            mode === "prompt" ? "flex-1" : "w-full"
          }`}
        >
          Not now
        </button>
      </div>
    </section>
  );
}

/** Safari's share icon, so the instruction matches what is on screen. */
function ShareGlyph() {
  return (
    <svg aria-hidden className="inline h-4 w-4 align-[-0.2em]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" />
    </svg>
  );
}
