"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { EntryCard } from "@/components/EntryCard";
import { MicIcon, PlusIcon, SearchIcon, SparkIcon } from "@/components/Icons";
import { UndoToast } from "@/components/UndoToast";
import { addMany, createEntry, type Entry, getEntry, purgeEmpty, useAllEntries, visible } from "@/lib/entries";
import { sampleEntries } from "@/lib/samples";
import { dayKey, dayLabel, weekday } from "@/lib/time";

export default function TimelinePage() {
  return (
    <Suspense>
      <Timeline />
    </Suspense>
  );
}

function Timeline() {
  const router = useRouter();
  const params = useSearchParams();
  const all = useAllEntries();
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("");
  const [deleted, setDeleted] = useState<Entry | null>(null);

  useEffect(() => {
    setMounted(true);
    setToday(dayKey(new Date()));
    // Discard entries that were opened but never written in.
    purgeEmpty();
    // Show Undo after deleting from the editor.
    const id = params.get("deleted");
    const e = id ? getEntry(id) : undefined;
    if (e?.deletedAt) setDeleted(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => {
    const groups = new Map<string, ReturnType<typeof visible>>();
    for (const e of visible(all)) {
      const key = e.createdAt.slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()];
  }, [all]);

  // Support /#day-yyyy-mm-dd links from the action sheet.
  useEffect(() => {
    if (!mounted || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [mounted, days.length]);

  const newEntry = () => {
    // The timestamp is stamped right now, at the tap.
    const e = createEntry({ source: "typed" });
    router.push(`/entry/${e.id}?new=1`);
  };

  return (
    <div className="screen">
      <header className="home-header">
        <div className="home-title">
          <h1>Journal</h1>
          {today && <span className="stamp">{`${today} · ${weekday(today)}`}</span>}
        </div>
        <Link href="/search" className="round-btn" aria-label="Search entries">
          <SearchIcon />
        </Link>
      </header>

      <main className="feed">
        {mounted && days.length === 0 && (
          <div className="empty">
            <p>
              No entries yet.
              <br />
              Tap <strong>New entry</strong> to write, or the gold mic to talk.
            </p>
            <button type="button" className="ghost-btn" onClick={() => addMany(sampleEntries())}>
              Add sample entries for testing
            </button>
          </div>
        )}

        {days.map(([key, entries]) => (
          <section key={key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="day-head" id={`day-${key}`}>
              <span className="day-label">
                {dayLabel(key)} · {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
              <Link href={`/summary/${key}`} className="day-link">
                <SparkIcon size={14} />
                Summarize day
              </Link>
            </div>
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </section>
        ))}
      </main>

      <div className="dock">
        <div className="dock-inner">
          <button type="button" className="primary-btn" onClick={newEntry}>
            <PlusIcon size={20} strokeWidth={2.2} />
            New entry
          </button>
          <Link href="/record" className="mic-fab" aria-label="New voice entry">
            <MicIcon size={22} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      {deleted && <UndoToast entry={deleted} onDone={() => setDeleted(null)} />}
    </div>
  );
}
