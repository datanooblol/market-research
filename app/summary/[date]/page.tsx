"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { BackIcon, InfoIcon, SparkIcon } from "@/components/Icons";
import { createEntry, useAllEntries, visible } from "@/lib/entries";
import { summarizeDay } from "@/lib/summary";
import { weekday } from "@/lib/time";

export default function SummaryPage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const all = useAllEntries();

  // Only this day's entries go into the summary (AI summaries will be "ai" entries, so skip them).
  const dayEntries = useMemo(
    () => visible(all).filter((e) => e.createdAt.startsWith(date) && e.source !== "ai"),
    [all, date],
  );
  const s = useMemo(() => summarizeDay(dayEntries), [dayEntries]);

  const saveAsEntry = () => {
    const lines = [
      `Summary of ${date}`,
      s.overview,
      ...s.highlights.map((h) => `• ${h.time} ${h.text}`),
      ...(s.todos.length ? ["To-dos:", ...s.todos.map((t) => `☐ ${t}`)] : []),
    ];
    createEntry({ source: "ai", body: lines.join("\n") });
    router.push("/");
  };

  return (
    <div className="screen">
      <header className="bar" style={{ borderBottom: "none" }}>
        <Link href="/" className="bar-btn">
          <BackIcon /> Timeline
        </Link>
      </header>

      <section className="sum-head">
        <span className="sum-kicker">
          <SparkIcon size={14} /> Summary · {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
        </span>
        <span className="entry-stamp" style={{ fontSize: 22 }}>{`${date} · ${weekday(date)}`}</span>
      </section>

      {dayEntries.length === 0 ? (
        <div className="empty"><p>No entries on this day.</p></div>
      ) : (
        <>
          <article className="sum-card">
            <p>{s.overview}</p>

            <div className="sum-section">
              <span className="sum-label">Highlights</span>
              {s.highlights.map((h) => (
                <div key={h.id} className="sum-line">
                  <Link href={`/entry/${h.id}`}>{h.time}</Link>
                  <span>{h.text}</span>
                </div>
              ))}
            </div>

            {s.todos.length > 0 && (
              <div className="sum-section">
                <span className="sum-label">To-dos found</span>
                {s.todos.map((t, i) => (
                  <label key={i} className="todo">
                    <input type="checkbox" />
                    {t}
                  </label>
                ))}
              </div>
            )}

            {s.tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {s.tags.map((t) => (
                  <span key={t.tag} className="tag-count">
                    {t.tag} · {t.count}
                  </span>
                ))}
              </div>
            )}
          </article>

          <div className="notice" style={{ margin: "12px 16px 0" }}>
            <InfoIcon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            Mock summary made on your phone. Real AI summaries arrive with the backend; only this day&apos;s entries will be sent.
          </div>

          <div className="foot">
            <button type="button" className="primary-btn" style={{ width: "100%", height: 52 }} onClick={saveAsEntry}>
              Save summary as entry
            </button>
          </div>
        </>
      )}
    </div>
  );
}
