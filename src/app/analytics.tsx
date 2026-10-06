"use client";

import { Analytics } from "@vercel/analytics/next";

// Order, student and product ids sit in some addresses
// (/student/order/confirmed/<id>, ?from=<id>). Visit counts never need
// them: ids become ":id" and the query string is dropped, so no id ever
// leaves the app.
const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Page views, counted by Vercel Web Analytics. No cookies. */
export function VisitCounter() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        return { ...event, url: `${url.origin}${url.pathname.replace(ID, ":id")}` };
      }}
    />
  );
}
