"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { routeDirection, type RouteDirection } from "@/lib/route-direction";

// A template remounts on every navigation, so the previous path cannot live
// in a ref inside the component. Module scope survives exactly as long as
// the client session does, which is what this needs.
let previousPath: string | null = null;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Resolved once, when this instance mounts — which is exactly when the
  // navigation happened. Reading it during render rather than in an effect
  // means the class is on the element for its first paint, so there is no
  // frame where the page sits at full opacity before fading in.
  const [direction] = useState<RouteDirection>(() => routeDirection(previousPath, pathname));

  useEffect(() => {
    previousPath = pathname;
  }, [pathname]);

  if (direction === "none") return <>{children}</>;

  return <div className={`route-${direction}`}>{children}</div>;
}
