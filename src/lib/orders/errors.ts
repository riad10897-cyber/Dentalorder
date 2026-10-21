// What a student reads when the database refuses an order, an edit or a
// cancel. The database's own messages are written for the people who
// maintain it ("quantity must be between 1 and 10"); these are written for
// a student standing in a corridor between classes. Each one says what
// happened and what to do next. Anything not recognised falls back to a
// message that says nothing was sent and how to get help.

const RULES: [RegExp, string][] = [
  [/must be signed in/i, "You were signed out. Sign in again, then send it once more."],
  [/not taking orders|no such supplier/i, "This seller isn't taking orders right now. Message them, or order from another seller."],
  [/cannot order from yourself/i, "You can't order from yourself."],
  [/quantity must be between/i, "You can order up to 10 of each tooth or extra."],
  [/at least one item|order must have at least one/i, "Add at least one tooth or extra first."],
  [/more than \d+ lines/i, "That's too many lines for one order. Split it into two orders."],
  [/appears twice|either a tooth or a product|invalid tooth number|tooth_type is required/i, "Something on this order didn't add up. Go back, check it, and try again."],
  [/order not found|already been edited|edited and replaced/i, "This order has changed since you opened it. Open Orders to see where it stands."],
  [/already cancelled/i, "This order is already cancelled."],
  [/the supplier has already confirmed it/i, "Your seller has already confirmed this order, so it can't be changed here. Message them if something needs to change."],
  [/the supplier has already handed it over/i, "This order has already been handed over."],
  [/the supplier has already rejected it/i, "Your seller rejected this order. Open Orders to see why."],
  [/the supplier has already had it cancelled/i, "This order is already cancelled."],
];

export const UNKNOWN_ORDER_ERROR =
  "Something went wrong and nothing was sent. Try again, and if it keeps happening, contact us.";

export function friendlyOrderError(message: string | null | undefined): string {
  if (!message) return UNKNOWN_ORDER_ERROR;
  for (const [pattern, text] of RULES) {
    if (pattern.test(message)) return text;
  }
  return UNKNOWN_ORDER_ERROR;
}
