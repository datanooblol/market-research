import type { Entry } from "./entries";
import { formatStamp } from "./time";

/** Demo entries spread over the last few weeks, for testing search and summaries. */
export function sampleEntries(): Entry[] {
  const rows: [number, string, string, Entry["source"], number?][] = [
    [0, "07:02:19", "Slept 6h. Woke up once around 3. Coffee before the run this time. #health", "typed"],
    [0, "09:14:02", "Standup: API for search is ready for review. Need to decide on FTS vs. Postgres before Friday. #work", "typed"],
    [0, "13:05:41", "Lunch walk idea: the onboarding should skip the tour entirely and drop people straight into a new entry with the time already stamped.", "voice", 58],
    [1, "21:47:10", "Finished the book. The last chapter on habits is worth re-reading in a month.", "typed"],
    [2, "22:08:45", "No screens after ten tonight. Trying the sleep playlist again and reading instead. #health", "voice", 34],
    [9, "06:51:30", "Best sleep in weeks — 7h40. Same routine: walk, no coffee after 2pm. #health", "typed"],
    [21, "23:40:12", "Can't sleep. Writing down tomorrow's three tasks so they stop looping. Remember to call the dentist.", "typed"],
  ];
  return rows.map(([daysAgo, time, body, source, secs], i) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const [h, m, s] = time.split(":").map(Number);
    d.setHours(h, m, s, 0);
    // Don't put "today" samples in the future.
    if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
    return {
      id: `sample-${i}-${d.getTime()}`,
      createdAt: formatStamp(d),
      createdMs: d.getTime(),
      updatedAt: formatStamp(d),
      body,
      source,
      voiceSeconds: secs,
      deletedAt: null,
    };
  });
}
