import Link from "next/link";
import { HelpLinks } from "./help-links";
import { Molo } from "./molo";

/**
 * The one look for "this didn't work": a crashed page, a missing page.
 * Plain ink, no red — red means Frasaco. A sad Molo (owner's call, Oct
 * 2026) says sorry; the words still say what happened. Always a way
 * forward (the action) and a way out (home, and a person to ask).
 */
export function ProblemScreen({
  title,
  body,
  action,
  topic,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  topic: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5 py-10 text-center">
      <Molo mood="sad" size={120} className="mx-auto" />
      <h1 className="text-screen-title font-bold text-ink">{title}</h1>
      <p className="text-native-body text-ink-muted">{body}</p>
      <div className="mt-2 flex flex-col gap-3">
        {action}
        <Link
          href="/"
          className="pressable flex h-[3.125rem] items-center justify-center rounded-button bg-fill px-4 text-native-body font-semibold text-ink"
        >
          Go to Molaro home
        </Link>
      </div>
      <HelpLinks topic={topic} className="mt-2" />
    </main>
  );
}
