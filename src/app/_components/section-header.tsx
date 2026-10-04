/** "Paper, native" section header above an inset grouped list. */
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-1 mb-1.5 mt-[1.375rem] text-native-caption uppercase tracking-[0.02em] text-ink-faint">
      {children}
    </h2>
  );
}
