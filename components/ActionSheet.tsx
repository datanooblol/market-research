"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Entry } from "@/lib/entries";
import { SourceBadge } from "./EntryCard";
import { CalendarIcon, CopyIcon, EditIcon, EyeIcon, TrashIcon } from "./Icons";

export function ActionSheet({
  entry,
  onClose,
  onDelete,
}: {
  entry: Entry;
  onClose: () => void;
  onDelete: (entry: Entry) => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.body);
      setCopied(true);
      setTimeout(onClose, 600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Entry actions" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-preview">
          <span className="card-meta">
            <span className="stamp">{entry.createdAt}</span>
            <SourceBadge entry={entry} />
          </span>
          <span className="sheet-preview-body">{entry.body || "(empty)"}</span>
        </div>
        <button type="button" className="sheet-row" onClick={() => router.push(`/entry/${entry.id}`)}>
          <EyeIcon /> Open
        </button>
        <button type="button" className="sheet-row" onClick={() => router.push(`/entry/${entry.id}?focus=1`)}>
          <EditIcon /> Edit
        </button>
        <button type="button" className="sheet-row" onClick={copy}>
          <CopyIcon /> {copied ? "Copied" : "Copy text"}
        </button>
        <button type="button" className="sheet-row" onClick={() => router.push(`/#day-${entry.createdAt.slice(0, 10)}`)}>
          <CalendarIcon /> Go to this day in timeline
        </button>
        <button type="button" className="sheet-row danger" onClick={() => onDelete(entry)}>
          <TrashIcon /> Delete
        </button>
      </section>
    </div>
  );
}
