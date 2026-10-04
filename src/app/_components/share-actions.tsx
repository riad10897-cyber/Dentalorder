"use client";

import { useEffect, useState } from "react";

/**
 * Copy the link, or hand it to the phone's own share sheet (WhatsApp,
 * Messages…) where the browser has one. The share button appears only
 * after mount, once it is known to work here.
 */
export function ShareActions({ url }: { url: string }) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access: the link above is selectable by hand.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Molaro", text: "Order your teeth on Molaro", url });
    } catch {
      // Closing the share sheet rejects; nothing to do.
    }
  }

  return (
    <div className="flex w-full gap-2">
      {canShare && (
        <button
          type="button"
          onClick={share}
          className="pressable min-h-11 flex-1 rounded-control bg-ink px-4 font-display text-body text-card"
        >
          Share link
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        className={`pressable min-h-11 flex-1 rounded-control border px-4 font-display text-body ${
          canShare ? "border-rule bg-card text-ink" : "border-ink bg-ink text-card"
        }`}
        aria-live="polite"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
