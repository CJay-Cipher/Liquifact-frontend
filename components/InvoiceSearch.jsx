"use client";

import { useEffect, useRef } from "react";

/** Keyboard key that focuses the marketplace search input. */
export const SEARCH_SHORTCUT_KEY = "/";

/** Default placeholder with a visible shortcut hint. */
export const DEFAULT_PLACEHOLDER = "Search issuer\u2026 (press /)";

/**
 * Returns true when the element is an input, textarea, or contenteditable target.
 *
 * @param {Element | null | undefined} el
 * @returns {boolean}
 */
export function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if ("isContentEditable" in el && el.isContentEditable) return true;
  return false;
}

/**
 * Creates a window keydown handler that focuses the search input on "/".
 *
 * @param {() => void} focusInput
 * @returns {(event: KeyboardEvent) => void}
 */
export function createSearchShortcutHandler(focusInput) {
  return (event) => {
    if (event.key !== SEARCH_SHORTCUT_KEY) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableElement(document.activeElement)) return;

    event.preventDefault();
    focusInput();
  };
}

/**
 * InvoiceSearch — A controlled search input for filtering invoices by issuer name.
 *
 * Renders a labelled search field styled to match the existing slate/cyan
 * marketplace theme. A clear button appears when the input has a value.
 * Press "/" anywhere on the page (except inside editable fields) to focus.
 *
 * @param {Object} props
 * @param {string} props.value  - Current search query (controlled by parent).
 * @param {(value: string) => void} props.onChange - Called with the new value on every keystroke.
 * @param {string} [props.placeholder] - Placeholder text for the input.
 */
export default function InvoiceSearch({ value, onChange, placeholder }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = createSearchShortcutHandler(() => {
      inputRef.current?.focus();
    });

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="issuer-search" className="sr-only">
        Search by issuer name
      </label>
      <input
        ref={inputRef}
        id="issuer-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || DEFAULT_PLACEHOLDER}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-cyan-400 hover:bg-slate-700/50 transition-colors"
          aria-label="Clear search"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
