// Days on market from the list date, so it stays current between syncs
export function daysOnMarket(listDate: string | Date | null | undefined, stored?: number | null): number | null {
  if (listDate) {
    const t = new Date(listDate).getTime();
    if (!isNaN(t)) return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  }
  return stored ?? null;
}
