import "server-only";
import { Molo } from "./molo";
import { headers } from "next/headers";
import { encode } from "uqr";
import { ShareActions } from "./share-actions";

/**
 * The address students open Molaro at. The deployment's own host, so the
 * code always points at the site the phone showing it is on.
 */
export async function appUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * A QR code for Molaro, big enough to scan off a phone held up in class,
 * with the link under it and buttons to copy or send it.
 *
 * Drawn as one SVG path from the code's modules: crisp at any size, ink
 * on card like everything else, and a quiet zone of four modules so
 * cameras find its edges.
 */
export function ShareApp({ url }: { url: string }) {
  const qr = encode(url, { ecc: "M", border: 4 });
  const d: string[] = [];
  qr.data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d.push(`M${x} ${y}h1v1h-1z`);
    }),
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Molo waving beside the code: this is the screen shown to a
          classmate, so it is where Molaro introduces itself. */}
      <Molo mood="hello" size={96} loop={false} />
      <div className="w-full max-w-[17rem] rounded-group bg-card p-3">
        <svg
          role="img"
          aria-label={`QR code for ${url}`}
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          className="block h-auto w-full"
          shapeRendering="crispEdges"
        >
          <rect width={qr.size} height={qr.size} fill="var(--card)" />
          <path d={d.join("")} fill="var(--ink)" />
        </svg>
      </div>
      <p className="text-center text-list-secondary text-ink-muted">
        Point a phone camera at the code, or send the link:
        <span className="mt-0.5 block select-all break-all text-native-body font-semibold text-ink">{url}</span>
      </p>
      <ShareActions url={url} />
    </div>
  );
}
