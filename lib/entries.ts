"use client";

import { useSyncExternalStore } from "react";
import { formatStamp } from "./time";

export type Source = "typed" | "voice" | "ai";

export interface Entry {
  id: string;
  /** yyyy-mm-dd hh:mm:ss, set once when the entry is created. */
  createdAt: string;
  createdMs: number;
  updatedAt: string;
  body: string;
  source: Source;
  voiceSeconds?: number;
  /** Soft delete, so Delete can be undone. */
  deletedAt?: number | null;
}

// No backend yet: everything lives in this browser's localStorage.
const KEY = "journal.entries.v1";
const EMPTY: Entry[] = [];
const listeners = new Set<() => void>();
let cache: Entry[] | null = null;

function read(): Entry[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Entry[];
    // Purge entries deleted more than a minute ago (the undo window has long passed).
    const cutoff = Date.now() - 60_000;
    cache = parsed.filter((e) => !e.deletedAt || e.deletedAt > cutoff);
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: Entry[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** All entries, including soft-deleted ones. */
export function useAllEntries(): Entry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Visible entries, newest first. */
export function visible(list: Entry[]): Entry[] {
  return list.filter((e) => !e.deletedAt).sort((a, b) => b.createdMs - a.createdMs);
}

export function getEntry(id: string): Entry | undefined {
  return read().find((e) => e.id === id);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEntry(opts: {
  source: Source;
  body?: string;
  at?: Date;
  voiceSeconds?: number;
}): Entry {
  const at = opts.at ?? new Date();
  const entry: Entry = {
    id: newId(),
    createdAt: formatStamp(at),
    createdMs: at.getTime(),
    updatedAt: formatStamp(new Date()),
    body: opts.body ?? "",
    source: opts.source,
    voiceSeconds: opts.voiceSeconds,
    deletedAt: null,
  };
  write([...read(), entry]);
  return entry;
}

export function updateEntry(id: string, patch: Partial<Omit<Entry, "id" | "createdAt" | "createdMs">>) {
  write(
    read().map((e) => (e.id === id ? { ...e, ...patch, updatedAt: formatStamp(new Date()) } : e)),
  );
}

export function softDelete(id: string) {
  write(read().map((e) => (e.id === id ? { ...e, deletedAt: Date.now() } : e)));
}

export function restore(id: string) {
  write(read().map((e) => (e.id === id ? { ...e, deletedAt: null } : e)));
}

export function removeEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}

/** Remove entries that were created but never written in. */
export function purgeEmpty() {
  const list = read();
  if (list.some((e) => !e.deletedAt && e.body.trim() === "")) {
    write(list.filter((e) => e.deletedAt || e.body.trim() !== ""));
  }
}

export function addMany(list: Entry[]) {
  write([...read(), ...list]);
}

/** Lower-cased #tags found in the text. */
export function tagsOf(body: string): string[] {
  const found = body.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(found.map((t) => t.toLowerCase()))];
}
