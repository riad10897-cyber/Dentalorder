/**
 * Every student screen: the "Paper, native" look (owner decision,
 * 4 Oct 2026). For now this only swaps in the system font; the screens
 * themselves are restyled step by step (design_handoff_ios_feel/).
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <div className="ui-native">{children}</div>;
}
