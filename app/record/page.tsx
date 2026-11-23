"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { InfoIcon, KeyboardIcon, MicIcon, PauseIcon, StopIcon } from "@/components/Icons";
import { createEntry, getEntry, updateEntry } from "@/lib/entries";
import { duration, formatStamp } from "@/lib/time";
import { useSpeech } from "@/lib/useSpeech";

const LANGS = [
  { code: "en-US", label: "EN" },
  { code: "th-TH", label: "TH" },
];
const LANG_KEY = "journal.lang";

export default function RecordPage() {
  return (
    <Suspense>
      <Recorder />
    </Suspense>
  );
}

function Recorder() {
  const router = useRouter();
  const params = useSearchParams();
  const appendId = params.get("append");
  const appendTo = appendId ? getEntry(appendId) : undefined;

  const [stamp, setStamp] = useState<Date | null>(null);
  const [lang, setLang] = useState("en-US");
  const [phase, setPhase] = useState<"record" | "review">("record");
  const [draft, setDraft] = useState("");
  const speech = useSpeech(lang);

  useEffect(() => {
    // Stamped when the mic was tapped (i.e. when this screen opened).
    setStamp(new Date());
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && LANGS.some((l) => l.code === saved)) setLang(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const chooseLang = (code: string) => {
    setLang(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
  };

  const exitTo = appendId ? `/entry/${appendId}` : "/";
  const listening = speech.status === "listening";
  const stampText = appendTo ? appendTo.createdAt : stamp ? formatStamp(stamp) : "";

  const stopAndReview = () => {
    setDraft(speech.stop());
    setPhase("review");
  };

  const cancel = () => {
    speech.stop();
    router.push(exitTo);
  };

  const save = (thenEdit = false) => {
    const text = draft.trim();
    if (!text) return;
    if (appendId && appendTo) {
      const body = appendTo.body.trim() ? `${appendTo.body.trimEnd()}\n\n${text}` : text;
      updateEntry(appendId, { body });
      router.push(`/entry/${appendId}`);
      return;
    }
    const e = createEntry({ source: "voice", body: text, at: stamp ?? new Date(), voiceSeconds: speech.seconds });
    router.push(thenEdit ? `/entry/${e.id}` : "/");
  };

  const typeInstead = () => {
    const text = speech.stop().trim();
    if (appendId) {
      if (text && appendTo) updateEntry(appendId, { body: `${appendTo.body.trimEnd()}\n\n${text}`.trim() });
      router.push(`/entry/${appendId}?focus=1`);
      return;
    }
    const e = createEntry({ source: "typed", body: text, at: stamp ?? new Date() });
    router.push(`/entry/${e.id}?new=1`);
  };

  /* ---------------- review ---------------- */
  if (phase === "review") {
    return (
      <div className="screen white">
        <header className="bar">
          <button type="button" className="bar-btn danger" onClick={() => router.push(exitTo)}>
            Discard
          </button>
          <span className="bar-mid">Review</span>
          <button type="button" className="bar-btn strong" onClick={() => save()} disabled={!draft.trim()}>
            Save
          </button>
        </header>

        <section className="entry-head">
          <span className="entry-stamp">{stampText}</span>
          <span className="badge" style={{ alignSelf: "flex-start" }}>
            <MicIcon size={12} strokeWidth={2.4} />
            {appendTo ? "Adding to this entry" : "From voice"} · {duration(speech.seconds)}
          </span>
        </section>

        <div className="transcript" style={{ paddingTop: 8 }}>
          <label htmlFor="review" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            Transcript
          </label>
          <textarea
            id="review"
            className="review-text"
            value={draft}
            placeholder="Nothing was recognised. Tap Keep talking to try again."
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="notice">
            <InfoIcon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            Tap the text to fix any word before saving.
          </div>
        </div>

        <div className="stack">
          <button type="button" className="primary-btn" style={{ height: 52 }} onClick={() => save()} disabled={!draft.trim()}>
            {appendTo ? "Add to entry" : "Save entry"}
          </button>
          <div className="row">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setPhase("record");
                speech.start(draft);
              }}
            >
              <MicIcon size={16} strokeWidth={2.2} /> Keep talking
            </button>
            {!appendTo && (
              <button type="button" className="ghost-btn" onClick={() => save(true)} disabled={!draft.trim()}>
                Edit as text
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- record ---------------- */
  const statusLabel =
    speech.status === "listening" ? "Listening" : speech.status === "paused" ? "Paused" : speech.status === "unsupported" ? "Not available" : "Ready";

  return (
    <div className="screen">
      <header className="bar" style={{ borderBottom: "none" }}>
        <button type="button" className="bar-btn" onClick={cancel}>
          Cancel
        </button>
        <span className="rec-status">
          <span className={`rec-dot${listening ? " live" : ""}`} />
          {statusLabel}
        </span>
        <div className="lang" role="group" aria-label="Speech language">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`chip${lang === l.code ? " on" : ""}`}
              style={{ height: 32 }}
              aria-pressed={lang === l.code}
              onClick={() => chooseLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <section className="entry-head" style={{ paddingTop: 8 }}>
        <span className="entry-stamp">{stampText}</span>
        <span className="entry-sub">{appendTo ? "Adding to this entry" : "Stamped when you tapped the mic"}</span>
      </section>

      <div className="transcript">
        {speech.finalText || speech.interim ? (
          <p className="transcript-text">
            {speech.finalText}
            {speech.interim && <span className="interim">{speech.finalText ? " " : ""}{speech.interim}</span>}
          </p>
        ) : (
          <p className="transcript-text placeholder">
            {speech.status === "unsupported" ? "Live dictation isn't available in this browser." : "Tap the gold mic and start talking."}
          </p>
        )}
        {speech.interim && <span className="hint">Grey words are still being recognised</span>}

        {speech.status === "unsupported" && (
          <div className="notice warn">
            <InfoIcon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Use <strong>Type instead</strong> below, then tap the mic on the iPhone keyboard to dictate.
            </span>
          </div>
        )}
        {speech.error && (
          <div className="notice warn" role="alert">
            <InfoIcon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{speech.error}</span>
          </div>
        )}
      </div>

      <div className={`wave${listening ? " live" : ""}`} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="controls">
        <span className="timer">{duration(speech.seconds)}</span>
        <div className="control-row">
          <button
            type="button"
            className="side-btn"
            aria-label={listening ? "Pause" : "Resume"}
            disabled={speech.status === "unsupported" || speech.status === "idle"}
            onClick={() => (listening ? speech.pause() : speech.start())}
            style={{ opacity: speech.status === "idle" || speech.status === "unsupported" ? 0.4 : 1 }}
          >
            {listening ? <PauseIcon /> : <MicIcon size={20} />}
          </button>

          {speech.status === "idle" || speech.status === "denied" || speech.status === "error" ? (
            <button type="button" className="big-btn start" aria-label="Start dictation" onClick={() => speech.start()}>
              <MicIcon size={30} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              className="big-btn"
              aria-label="Stop and review"
              onClick={stopAndReview}
              disabled={speech.status === "unsupported"}
              style={{ opacity: speech.status === "unsupported" ? 0.4 : 1 }}
            >
              <StopIcon />
            </button>
          )}

          <button type="button" className="side-btn" aria-label="Type instead" onClick={typeInstead}>
            <KeyboardIcon />
          </button>
        </div>
        <span className="hint" style={{ textAlign: "center" }}>
          Uses Safari&apos;s built-in speech recognition · only text is saved
        </span>
      </div>
    </div>
  );
}
