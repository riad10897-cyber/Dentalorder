// A single crisp tick, used at exactly three moments: an order lands, a
// flicked tooth sheet lands, and a rep marks an order fulfilled.
//
// Deliberately not on tooth taps. That is seven or more per order every
// week, and Android's minimum pulse reads as a buzz rather than a tick,
// so it would feel cheap rather than physical. Over-feedback also trains
// people to ignore all of it.
//
// One pulse, never a pattern: patterns read as notifications, not as
// something physical happening under the finger.
const PULSE_MS = 12;

export function haptic(): void {
  if (typeof navigator === "undefined") return;

  // iOS Safari has no Vibration API at all, so this silently does
  // nothing there rather than needing a platform check at each call.
  if (typeof navigator.vibrate !== "function") return;

  // Haptics are motion feedback, so they answer to the same preference
  // as the animations they accompany.
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  try {
    navigator.vibrate(PULSE_MS);
  } catch {
    // Browsers throw here when the page is hidden or the user has not
    // interacted yet. A missing tick is never worth an error.
  }
}
