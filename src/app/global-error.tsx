"use client";

import "./globals.css";
import { ProblemScreen } from "./_components/problem-screen";

// Only when the root layout itself fails, so this brings its own <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="ui-native antialiased">
        <ProblemScreen
          title="Molaro didn't load"
          body="Something went wrong on our side. Your orders are safe. Try again in a moment."
          topic="the app didn't load"
          action={
            <button
              type="button"
              onClick={reset}
              className="pressable flex h-[3.125rem] items-center justify-center rounded-button bg-ink px-4 text-native-body font-semibold text-card"
            >
              Try again
            </button>
          }
        />
      </body>
    </html>
  );
}
