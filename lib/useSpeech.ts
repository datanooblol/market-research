"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ---- Minimal Web Speech API types (not in TypeScript's DOM lib) ---- */
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}
interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}
interface SpeechResultEvent {
  results: SpeechResultList;
}
interface SpeechErrorEvent {
  error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechStatus = "idle" | "listening" | "paused" | "unsupported" | "denied" | "error";

function join(a: string, b: string): string {
  const x = a.trim();
  const y = b.trim();
  if (!x) return y;
  if (!y) return x;
  return `${x} ${y}`;
}

/**
 * Safari on iOS sometimes reports cumulative results (each result repeats the
 * text before it). If the new chunk already contains what we have, replace
 * instead of appending, so words are not duplicated.
 */
function appendChunk(acc: string, chunk: string): string {
  const a = acc.trim();
  const c = chunk.trim();
  if (!a) return c;
  if (c.toLowerCase().startsWith(a.toLowerCase())) return c;
  return join(a, c);
}

/**
 * Live dictation using the browser's built-in speech recognition
 * (webkitSpeechRecognition in Safari on iOS 14.5+). Safari ends a session
 * after silence or about a minute, so we restart it automatically and keep
 * appending to one transcript.
 */
export function useSpeech(lang: string) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false); // user wants to keep listening
  const committedRef = useRef(""); // text from finished sessions
  const sessionRef = useRef({ final: "", interim: "" });
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const ok = !!getCtor();
    setSupported(ok);
    if (!ok) setStatus("unsupported");
  }, []);

  // Recording timer
  useEffect(() => {
    if (status !== "listening") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const commitSession = useCallback(() => {
    const s = sessionRef.current;
    const add = join(s.final, s.interim);
    if (add) committedRef.current = join(committedRef.current, add);
    sessionRef.current = { final: "", interim: "" };
    setFinalText(committedRef.current);
    setInterim("");
  }, []);

  const startSession = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const rec = new Ctor();
    rec.lang = langRef.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      // Rebuild this session's text from the full result list on every event.
      let f = "";
      let i = "";
      for (let k = 0; k < e.results.length; k++) {
        const r = e.results[k];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) f = appendChunk(f, t);
        else i = appendChunk(i, t);
      }
      sessionRef.current = { final: f, interim: i };
      setFinalText(join(committedRef.current, f));
      setInterim(i);
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // onend restarts
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setStatus("denied");
        setError(
          "Microphone or speech recognition is blocked. Allow the mic for this site, and make sure Dictation is on in iPhone Settings › General › Keyboard.",
        );
        return;
      }
      setError(`Speech recognition error: ${e.error}`);
    };

    rec.onend = () => {
      commitSession();
      if (!wantRef.current) {
        setStatus((s) => (s === "denied" ? s : "paused"));
        return;
      }
      // Safari stopped on its own (silence / time limit): keep going.
      setTimeout(() => {
        if (!wantRef.current) return;
        try {
          startSession();
        } catch {
          wantRef.current = false;
          setStatus("paused");
          setError("Listening stopped. Tap the mic to keep going.");
        }
      }, 250);
    };

    recRef.current = rec;
    rec.start();
    setStatus("listening");
  }, [commitSession]);

  /** Start (must be called from a tap). `base` = text to continue from. */
  const start = useCallback(
    (base?: string) => {
      if (base !== undefined) {
        committedRef.current = base.trim();
        setFinalText(committedRef.current);
      }
      setError(null);
      wantRef.current = true;
      try {
        startSession();
      } catch (err) {
        wantRef.current = false;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [startSession],
  );

  const pause = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
  }, []);

  /** Stop and return the full transcript, including words still being recognised. */
  const stop = useCallback((): string => {
    wantRef.current = false;
    const s = sessionRef.current;
    const text = join(committedRef.current, join(s.final, s.interim));
    committedRef.current = text;
    sessionRef.current = { final: "", interim: "" };
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.abort();
    }
    setFinalText(text);
    setInterim("");
    setStatus("paused");
    return text;
  }, []);

  // Release the mic when leaving the page.
  useEffect(
    () => () => {
      wantRef.current = false;
      const rec = recRef.current;
      if (rec) {
        rec.onend = null;
        rec.abort();
      }
    },
    [],
  );

  return { supported, status, finalText, interim, seconds, error, start, pause, stop };
}
