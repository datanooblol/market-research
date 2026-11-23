"use client";

import { useEffect } from "react";
import { type Entry, restore } from "@/lib/entries";

/** Shows "Entry deleted · Undo" for 5 seconds after a soft delete. */
export function UndoToast({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [entry.id, onDone]);

  return (
    <div className="toast" role="status">
      <span className="toast-text">
        <strong>Entry deleted</strong>
        <span className="toast-stamp">{entry.createdAt}</span>
      </span>
      <button
        type="button"
        className="toast-undo"
        onClick={() => {
          restore(entry.id);
          onDone();
        }}
      >
        Undo
      </button>
    </div>
  );
}
