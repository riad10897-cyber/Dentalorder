import { test } from "node:test";
import assert from "node:assert/strict";
import { routeDirection } from "./route-direction";

test("the first render of a session animates nothing", () => {
  assert.equal(routeDirection(null, "/student"), "none");
});

test("re-rendering the same path animates nothing", () => {
  assert.equal(routeDirection("/student", "/student"), "none");
});

test("drilling in is forward, coming back out is back", () => {
  assert.equal(routeDirection("/student/orders", "/student/orders/abc"), "forward");
  assert.equal(routeDirection("/student/orders/abc", "/student/orders"), "back");
  assert.equal(routeDirection("/supplier/students", "/supplier/students/xyz"), "forward");
  assert.equal(routeDirection("/supplier/students/xyz", "/supplier/students"), "back");
});

test("bottom-nav tabs are lateral, not a descent", () => {
  // /student/order sits one segment deeper than /student but is a sibling
  // tab. Treating it as a drill-in was the bug this test exists to catch.
  assert.equal(routeDirection("/student", "/student/order"), "lateral");
  assert.equal(routeDirection("/student/order", "/student"), "lateral");
  assert.equal(routeDirection("/student", "/student/profile"), "lateral");
  assert.equal(routeDirection("/student/profile", "/student/order"), "lateral");
});

test("every supplier tab pairing is lateral", () => {
  const tabs = ["/supplier", "/supplier/summary", "/supplier/students", "/supplier/settings"];
  for (const from of tabs) {
    for (const to of tabs) {
      if (from === to) continue;
      assert.equal(routeDirection(from, to), "lateral", `${from} -> ${to}`);
    }
  }
});

test("unrelated paths are lateral rather than guessing a direction", () => {
  assert.equal(routeDirection("/student", "/supplier"), "lateral");
  assert.equal(routeDirection("/sign-in", "/sign-up"), "lateral");
});

test("a shared prefix that is not a path boundary is not a drill-in", () => {
  // /student/order is not inside /student/or, despite the string prefix.
  assert.equal(routeDirection("/student/or", "/student/order"), "lateral");
});
