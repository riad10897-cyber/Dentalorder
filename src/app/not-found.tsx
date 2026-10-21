import { ProblemScreen } from "./_components/problem-screen";

export default function NotFound() {
  return (
    <ProblemScreen
      title="Nothing here"
      body="This page doesn't exist, or the order it showed has changed. Your orders are in the Orders tab."
      topic="a page was missing"
    />
  );
}
