/**
 * For one-off GSAP entrances (cards rising in as a section scrolls into view): gives the
 * targets their own compositor layer only while the tween runs. Without it Chrome repaints
 * each card (shadows, form fields and all) on every frame of its entrance, in the middle of
 * the user's scroll; leaving `will-change` on permanently would keep dozens of layers alive.
 *
 *   gsap.from(cards, { y: 40, autoAlpha: 0, ...promoteWhile(cards) })
 */
export function promoteWhile(targets: Element[]) {
  const set = (v: string) => targets.forEach((t) => ((t as HTMLElement).style.willChange = v));
  return {
    onStart: () => set("transform, opacity"),
    onComplete: () => set(""),
  };
}
