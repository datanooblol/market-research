import { type Entry, tagsOf } from "./entries";
import { hm } from "./time";

export interface DaySummary {
  overview: string;
  highlights: { id: string; time: string; text: string }[];
  todos: string[];
  tags: { tag: string; count: number }[];
}

const TODO = /\b(need to|needs to|todo|to-do|must|should|decide|remember to|don't forget|call|buy|book|send)\b/i;

function sentences(body: string): string[] {
  return body
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shorten(s: string, max = 90): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * MOCK summary built on the device (no AI, no backend yet).
 * It keeps the same output shape a real AI summary will return later.
 */
export function summarizeDay(entries: Entry[]): DaySummary {
  const list = [...entries].sort((a, b) => a.createdMs - b.createdMs);
  const tagCount = new Map<string, number>();
  for (const e of list) for (const t of tagsOf(e.body)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const tags = [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const highlights = list.map((e) => ({
    id: e.id,
    time: hm(e.createdAt),
    text: shorten(sentences(e.body)[0] ?? ""),
  }));

  const todos = list.flatMap((e) => sentences(e.body).filter((s) => TODO.test(s))).map((s) => shorten(s, 120));

  const voice = list.filter((e) => e.source === "voice").length;
  const parts = [
    `${list.length} ${list.length === 1 ? "entry" : "entries"}`,
    list.length ? `from ${hm(list[0].createdAt)} to ${hm(list[list.length - 1].createdAt)}` : "",
    voice ? `(${voice} by voice)` : "",
  ].filter(Boolean);
  const overview =
    `${parts.join(" ")}.` + (tags.length ? ` Mostly about ${tags.slice(0, 3).map((t) => t.tag).join(", ")}.` : "");

  return { overview, highlights, todos, tags };
}
