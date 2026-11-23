"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ActionSheet } from "@/components/ActionSheet";
import { SourceBadge } from "@/components/EntryCard";
import { BackIcon, CheckIcon, MicIcon, MoreIcon } from "@/components/Icons";
import { type Entry, getEntry, removeEntry, softDelete, tagsOf, updateEntry, useAllEntries } from "@/lib/entries";

export default function EntryPage() {
  return (
    <Suspense>
      <EntryEditor />
    </Suspense>
  );
}

function EntryEditor() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const all = useAllEntries();
  const entry = all.find((e) => e.id === id);

  const [text, setText] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const textRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Load the body once the entry is available.
  useEffect(() => {
    if (entry && text === null) {
      setText(entry.body);
      textRef.current = entry.body;
    }
  }, [entry, text]);

  // Focus for new entries / Edit (iOS may still need a tap to open the keyboard).
  useEffect(() => {
    if (text !== null && (params.get("new") || params.get("focus"))) {
      const el = areaRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text === null]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = getEntry(id);
    if (current && textRef.current !== null && current.body !== textRef.current) {
      updateEntry(id, { body: textRef.current });
    }
  }, [id]);

  const onChange = (value: string) => {
    setText(value);
    textRef.current = value;
    if (timer.current) clearTimeout(timer.current);
    // Autosave after a short pause in typing.
    timer.current = setTimeout(() => {
      flush();
      setSavedAt(new Date().toTimeString().slice(0, 8));
    }, 500);
  };

  // Save on leave (empty entries are discarded by Done and by the timeline).
  useEffect(() => () => flush(), [flush]);

  const done = () => {
    flush();
    const e = getEntry(id);
    if (e && e.body.trim() === "") removeEntry(id);
    router.push("/");
  };

  const dictate = () => {
    flush();
    router.push(`/record?append=${id}`);
  };

  const addTag = () => {
    const v = text ?? "";
    const next = `${v}${v && !/\s$/.test(v) ? " " : ""}#`;
    onChange(next);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      el?.focus();
      el?.setSelectionRange(next.length, next.length);
    });
  };

  const onDelete = (e: Entry) => {
    softDelete(e.id);
    router.push(`/?deleted=${e.id}`);
  };

  if (!entry) {
    return (
      <div className="screen white">
        <header className="bar">
          <Link href="/" className="bar-btn">
            <BackIcon /> Timeline
          </Link>
        </header>
        <div className="empty">
          <p>This entry doesn&apos;t exist on this device.</p>
        </div>
      </div>
    );
  }

  const words = (text ?? "").trim() ? (text ?? "").trim().split(/\s+/).length : 0;
  const edited = entry.updatedAt !== entry.createdAt && entry.body !== "";

  return (
    <div className="screen white">
      <header className="bar">
        <button type="button" className="bar-btn" onClick={done}>
          <BackIcon /> Timeline
        </button>
        <span className="bar-mid">
          {savedAt ? (
            <>
              <CheckIcon size={14} stroke="var(--good)" strokeWidth={2.4} /> Saved {savedAt}
            </>
          ) : params.get("new") ? (
            "New entry"
          ) : (
            "Entry"
          )}
        </span>
        <button type="button" className="bar-btn strong" onClick={done}>
          Done
        </button>
      </header>

      <section className="entry-head">
        <span className="entry-stamp">{entry.createdAt}</span>
        <span className="entry-sub" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {params.get("new") && !edited ? "Stamped when you tapped New entry" : `Created${edited ? ` · edited ${entry.updatedAt.slice(11)}` : ""} · ${words} words`}
          <SourceBadge entry={entry} />
        </span>
      </section>

      <label htmlFor="entry-body" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Entry text
      </label>
      <textarea
        id="entry-body"
        ref={areaRef}
        className="editor"
        placeholder="What's on your mind?"
        value={text ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />

      {tagsOf(text ?? "").length > 0 && (
        <div className="tags">
          {tagsOf(text ?? "").map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="toolbar">
        <button type="button" className="pill accent" onClick={dictate}>
          <MicIcon size={16} strokeWidth={2.2} /> Dictate
        </button>
        <button type="button" className="pill" onClick={addTag}>
          # Tag
        </button>
        <button type="button" className="pill pill-round" aria-label="More options" onClick={() => setSheet(true)}>
          <MoreIcon size={18} />
        </button>
      </div>

      {sheet && <ActionSheet entry={{ ...entry, body: text ?? entry.body }} onClose={() => setSheet(false)} onDelete={onDelete} />}
    </div>
  );
}
