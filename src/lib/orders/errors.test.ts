import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyOrderError, UNKNOWN_ORDER_ERROR } from "./errors";

test("database wording never reaches the student", () => {
  assert.equal(friendlyOrderError("quantity must be between 1 and 10"), "You can order up to 10 of each tooth or extra.");
  assert.equal(
    friendlyOrderError("that supplier is not taking orders"),
    "This seller isn't taking orders right now. Message them, or order from another seller.",
  );
  assert.match(friendlyOrderError("this order can no longer be edited — the supplier has already confirmed it"), /already confirmed/);
  assert.match(friendlyOrderError("order not found"), /Open Orders/);
});

test("anything unrecognised says nothing was sent and how to get help", () => {
  assert.equal(friendlyOrderError('relation "x" does not exist'), UNKNOWN_ORDER_ERROR);
  assert.equal(friendlyOrderError(undefined), UNKNOWN_ORDER_ERROR);
});
