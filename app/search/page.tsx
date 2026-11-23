"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { ActionSheet } from "@/components/ActionSheet";
import { EntryCard } from "@/components/EntryCard";
import { CalendarIcon, SearchIcon, SparkIcon } from "@/components/Icons";
import { UndoToast } from "@/components/UndoToast";
import { type Entry, softDelete, tagsOf, useAllEntries, visible } from "@/lib/entries";

type Range = "all" | "7" | "30";
type SourceFilter = "all" | "typed" | "voice";

const RANGE_LABEL: Record<Range, string> = { all: "Any time", "7": "Last 7 days", "30": "Last 30 days" };
const SOURCE_LABEL: Record<SourceFilter, string> = { all: "Typed & voice", typed: "Typed", voice: "Voice" };
const nextRange: Record<Range, Range> = { all: "7", "7": "30", "30": "all" };
const nextSource: Record<SourceFilter, SourceFilter> = { all: "typed", typed: "voice", voice: "all" };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wraps each matched term in <mark>. */
function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

export default function SearchPage() {
  const all = useAllEntries();
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<Entry | null>(null);
  const [deleted, setDeleted] = useState<Entry | null>(null);

  const entries = useMemo(() => visible(all), [all]);

  const topTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) for (const t of tagsOf(e.body)) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [entries]);

  const terms = useMemo(() => q.trim().toLowerCase().split(/\s+/).filter(Boolean), [q]);

  // v1 full-text search: every term must appear in the entry (AND), newest first.
  const results = useMemo(() => {
    const since = range === "all" ? 0 : Date.now() - Number(range) * 86_400_000;
    return entries.filter((e) => {
      if (e.createdMs < since) return false;
      if (source !== "all" && e.source !== source) return false;
      if (tag && !tagsOf(e.body).includes(tag)) return false;
      const hay = e.body.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [entries, terms, range, source, tag]);

  const onDelete = (e: Entry) => {
    softDelete(e.id);
    setSheetFor(null);
    setDeleted(e);
  };

  return (
    <div className="screen">
      <header className="search-head">
        <label className="search-box">
          <SearchIcon size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search entries"
            aria-label="Search entries"
            autoFocus
            enterKeyHint="search"
          />
        </label>
        <Link href="/" className="bar-btn" style={{ padding: "0 4px" }}>
          Cancel
        </Link>
      </header>

      <div className="chips">
        <button type="button" className={`chip${range !== "all" ? " on" : ""}`} onClick={() => setRange(nextRange[range])}>
          <CalendarIcon size={14} />
          {RANGE_LABEL[range]}
        </button>
        <button type="button" className={`chip${source !== "all" ? " on" : ""}`} onClick={() => setSource(nextSource[source])}>
          {SOURCE_LABEL[source]}
        </button>
        {topTags.map((t) => (
          <button key={t} type="button" className={`chip${tag === t ? " on" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="result-meta">
        <span>
          {results.length} {results.length === 1 ? "entry" : "entries"}
          {terms.length || range !== "all" || source !== "all" || tag ? " match" : ""}
        </span>
        <span>Newest first</span>
      </div>

      <main className="list">
        {results.map((e) => (
          <EntryCard key={e.id} entry={e} body={highlight(e.body, terms)} onMore={() => setSheetFor(e)} />
        ))}
        {results.length === 0 && <div className="empty"><p>No entries match. Try fewer words or clear a filter.</p></div>}
        <div className="later">
          <SparkIcon size={16} />
          <span>Coming later: &ldquo;Similar meaning&rdquo; search finds related entries even without the exact words.</span>
        </div>
      </main>

      {sheetFor && <ActionSheet entry={sheetFor} onClose={() => setSheetFor(null)} onDelete={onDelete} />}
      {deleted && <UndoToast entry={deleted} onDone={() => setDeleted(null)} />}
    </div>
  );
}
