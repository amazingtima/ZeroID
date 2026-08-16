import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict } from "../i18n";
import { maskDocx } from "../lib/docx";
import { isMobile } from "../lib/viewport";
import { maskSensitive } from "../lib/redact";

const CARET_H = 24;
const DOC_RE = /\.docx$/i;
const TEXT_RE = /\.(txt|md|json|csv)$/i;
const MAX_SIZE = 10 * 1024 * 1024;
const MIN_SPINNER_MS = 400;

async function hideDataInText(value: string) {
  return maskSensitive(value);
}

async function withMinDuration<T>(work: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => window.setTimeout(resolve, ms)),
  ]);
  return result;
}

const MIRRORED_PROPS = [
  "box-sizing",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "line-height",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "text-transform",
  "word-spacing",
];

type CaretOffset = { top: number; left: number };
type CaretState = CaretOffset & { visible: boolean };

function getCaretOffset(textarea: HTMLTextAreaElement): CaretOffset {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const span = document.createElement("span");

  MIRRORED_PROPS.forEach((prop) => {
    mirror.style.setProperty(prop, style.getPropertyValue(prop));
  });

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.clientWidth}px`;

  const value = textarea.value.slice(0, textarea.selectionStart);
  mirror.textContent = value;
  span.textContent = "\u200b";
  mirror.appendChild(span);
  document.body.appendChild(mirror);

  const top = span.offsetTop - textarea.scrollTop;
  const left = span.offsetLeft - textarea.scrollLeft;
  document.body.removeChild(mirror);

  return { top, left };
}

function ClearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export default function PromptComposer({ t }: { t: Dict }) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [textBusy, setTextBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [caret, setCaret] = useState<CaretState>({
    top: 0,
    left: 0,
    visible: false,
  });

  const syncCaret = useCallback(() => {
    const el = fieldRef.current;
    if (!el || !el.value) return;
    const { top, left } = getCaretOffset(el);
    setCaret({
      top,
      left: Math.min(left, Math.max(0, el.clientWidth - 1)),
      visible: top + CARET_H > 0 && top < el.clientHeight,
    });
  }, []);

  useEffect(() => {
    syncCaret();
  }, [text, syncCaret]);

  const pickFile = (files: FileList | File[] | null | undefined) => {
    const picked = files?.[0];
    if (!picked || !DOC_RE.test(picked.name)) return;
    if (picked.size > MAX_SIZE) {
      setTooBig(true);
      return;
    }
    setTooBig(false);
    setFailed(false);
    setReady(null);
    setFile(picked);
  };

  const clearFile = () => {
    setFile(null);
    setTooBig(false);
    setFailed(false);
    setReady(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDropFiles = async (files: FileList | File[] | null | undefined) => {
    const dropped = files?.[0];
    if (!dropped) return;
    if (DOC_RE.test(dropped.name)) {
      pickFile([dropped]);
    } else if (dropped.type.startsWith("text") || TEXT_RE.test(dropped.name)) {
      setText(await dropped.text());
    }
  };

  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      setReady(await withMinDuration(maskDocx(file), MIN_SPINNER_MS));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!ready || !file) return;
    const url = URL.createObjectURL(ready);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(DOC_RE, "") + "-hidden.docx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const runOnText = async () => {
    if (!text || textBusy) return;
    setTextBusy(true);
    try {
      setText(await withMinDuration(hideDataInText(text), MIN_SPINNER_MS));
    } finally {
      setTextBusy(false);
      requestAnimationFrame(() => {
        const el = fieldRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(0, 0);
        el.scrollTop = 0;
        syncCaret();
      });
    }
  };

  const copyText = async () => {
    const el = fieldRef.current;
    if (!text || !el) return;
    const selected = text.slice(el.selectionStart, el.selectionEnd);
    await navigator.clipboard.writeText(selected || text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    fieldRef.current?.focus();
  };

  const clearText = () => {
    setText("");
    fieldRef.current?.focus();
  };

  return (
    <div className="composer-wrap">
      <section
        className="composer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDropFiles(e.dataTransfer.files);
        }}
      >
        <div className="composer-body">
          <label className="field">
            <textarea
              ref={fieldRef}
              className="prompt"
              rows={3}
              spellCheck={false}
              autoFocus={!isMobile}
              value={text}
              aria-label={t.hint}
              onChange={(e) => setText(e.target.value)}
              onClick={syncCaret}
              onKeyUp={syncCaret}
              onSelect={syncCaret}
              onScroll={syncCaret}
              onPaste={(e) => {
                const pasted = e.clipboardData.files?.[0];
                if (pasted) {
                  e.preventDefault();
                  onDropFiles([pasted]);
                }
              }}
            />
          </label>

          {!text && (
            <span className="ghost">
              <span className="caret" aria-hidden="true" />
              <span className="hint">{t.hint}</span>
            </span>
          )}

          {text && caret.visible ? (
            <span
              className="caret caret-follow"
              style={{ top: caret.top, left: caret.left }}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div className="text-actions">
          <button
            className="chip"
            type="button"
            disabled={!text || textBusy}
            aria-busy={textBusy}
            onClick={runOnText}
          >
            {textBusy ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <span className="chip-label">{t.hideData}</span>
            )}
          </button>

          <button
            className={`chip${copied ? " is-copied" : ""}`}
            type="button"
            disabled={!text || textBusy}
            onClick={copyText}
          >
            {copied ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="chip-label">{t.copied}</span>
              </>
            ) : (
              <span className="chip-label">{t.copy}</span>
            )}
          </button>

          <button
            className="chip"
            type="button"
            disabled={!text || textBusy}
            onClick={clearText}
          >
            <span className="chip-label">{t.clear}</span>
          </button>
        </div>
      </section>

      <div className="composer-actions">
        <div className="action-slot">
          <button
            className={`action-btn${file ? " no-icon" : ""}`}
            type="button"
            title={file?.name}
            disabled={busy || ready !== null}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <span className="file-name">{file.name}</span>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                {t.upload}
              </>
            )}
          </button>

          {file && !ready && (
            <button
              className="file-clear"
              type="button"
              aria-label={t.removeFile}
              disabled={busy}
              onClick={clearFile}
            >
              <ClearIcon />
            </button>
          )}

          <span className={`file-note${tooBig || failed ? " is-error" : ""}`}>
            {tooBig ? t.sizeError : failed ? t.fileError : t.fileNote}
          </span>
        </div>

        <div className="action-slot">
          <button
            className={`action-btn no-icon primary${busy ? " is-busy" : ""}`}
            type="button"
            disabled={!file || busy}
            aria-busy={busy}
            onClick={ready ? download : run}
          >
            {busy ? (
              <span className="spinner" aria-hidden="true" />
            ) : ready ? (
              t.download
            ) : (
              t.hideInFile
            )}
          </button>

          {ready && (
            <button
              className="file-clear is-dark"
              type="button"
              aria-label={t.removeFile}
              onClick={clearFile}
            >
              <ClearIcon />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        className="file-input"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          pickFile(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
