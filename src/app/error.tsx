"use client";

import { ProblemScreen } from "./_components/problem-screen";

// Any page that crashes lands here instead of the framework's bare error
// page. "Try again" re-renders the page; nothing the student typed on a
// form that already went through is lost, and an order is either placed
// or not — the database never half-saves one.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ProblemScreen
      title="This page didn't load"
      body="Something went wrong on our side. Your orders are safe. Try again in a moment."
      topic="a page didn't load"
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
  );
}
