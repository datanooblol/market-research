const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-mm-dd hh:mm:ss in the device's local time. */
export function formatStamp(d: Date): string {
  return `${dayKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** yyyy-mm-dd in the device's local time. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekday(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/** "Today", "Yesterday" or "2026-11-21 · Sat". */
export function dayLabel(key: string, now = new Date()): string {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === today) return "Today";
  if (key === dayKey(y)) return `Yesterday · ${weekday(key)}`;
  return `${key} · ${weekday(key)}`;
}

/** hh:mm from a stamp. */
export const hm = (stamp: string) => stamp.slice(11, 16);

/** m:ss for durations. */
export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${pad(seconds % 60)}`;
}
