"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Entry } from "@/lib/entries";
import { duration } from "@/lib/time";
import { MicIcon, MoreIcon, SparkIcon } from "./Icons";

export function SourceBadge({ entry }: { entry: Entry }) {
  if (entry.source === "voice")
    return (
      <span className="badge">
        <MicIcon size={11} strokeWidth={2.4} />
        Voice{entry.voiceSeconds ? ` · ${duration(entry.voiceSeconds)}` : ""}
      </span>
    );
  if (entry.source === "ai")
    return (
      <span className="badge">
        <SparkIcon size={11} />
        Summary
      </span>
    );
  return null;
}

export function EntryCard({
  entry,
  body,
  onMore,
}: {
  entry: Entry;
  body?: ReactNode;
  onMore?: () => void;
}) {
  return (
    <article className="card">
      <Link href={`/entry/${entry.id}`} className="card-link">
        <span className="card-meta">
          <span className="stamp">{entry.createdAt}</span>
          <SourceBadge entry={entry} />
        </span>
        <span className="card-body">{body ?? entry.body}</span>
      </Link>
      {onMore && (
        <button type="button" className="card-more" aria-label={`Actions for entry ${entry.createdAt}`} onClick={onMore}>
          <MoreIcon size={18} />
        </button>
      )}
    </article>
  );
}
