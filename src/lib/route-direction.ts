// Which way a navigation went, so the transition can say something about
// it. Pure and separate from the template so it can be tested: getting this
// wrong is silent — the page still renders, it just animates a tab switch
// as a drill-in, which nobody would file a bug about.

export type RouteDirection = "forward" | "back" | "lateral" | "none";

// Taken from the two bottom navs. These are peers in the information
// architecture even though they sit at different URL depths: /student is a
// tab root and /student/order is a sibling tab, not somewhere deeper.
// If a tab is added to a nav and not here, moving to it animates as a
// drill-in.
export const TAB_SETS: readonly (readonly string[])[] = [
  ["/student", "/student/order", "/student/profile"],
  ["/rep", "/rep/summary", "/rep/students", "/rep/settings"],
];

export function routeDirection(from: string | null, to: string): RouteDirection {
  if (from === null || from === to) return "none";

  if (TAB_SETS.some((set) => set.includes(from) && set.includes(to))) return "lateral";

  if (to.startsWith(`${from}/`)) return "forward";
  if (from.startsWith(`${to}/`)) return "back";
  return "lateral";
}
