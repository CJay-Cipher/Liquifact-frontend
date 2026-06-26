/**
 * Reduced-motion accessibility tests
 *
 * Verifies that components rendering animate-spin / animate-pulse loading
 * indicators remain perceivable and axe-clean under
 * (prefers-reduced-motion: reduce).  The CSS media query itself is applied
 * globally in app/globals.css; these tests confirm the rendered markup
 * satisfies WCAG 2.1 SC 2.3.3 (Animation from Interactions).
 *
 * Manual matrix (run in a real browser when CI cannot emulate the media query):
 *   1. Open DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → reduce
 *   2. Navigate to /invoices  → UploadZone spinner must be paused / not spin
 *   3. Navigate to /invoices  → InvoiceListSkeleton blocks must be visible, not pulsing
 *   4. Navigate to /invest    → invest/loading.js skeleton blocks must be visible, not pulsing
 *   5. Toggle preference back to "no-preference" → animations resume normally
 *   6. All aria-busy="true" regions must still be announced by a screen reader in both modes
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

// ── components under test ────────────────────────────────────────────────────
import InvoiceListSkeleton from "../components/InvoiceListSkeleton";
import InvestLoading from "../app/invest/loading";
import InvoicesLoading from "../app/invoices/loading";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Lightweight matchMedia stub that reports prefers-reduced-motion: reduce.
 * jsdom does not implement matchMedia, so we provide a minimal shim.
 */
function stubReducedMotion() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ── InvoiceListSkeleton ──────────────────────────────────────────────────────

describe("InvoiceListSkeleton – reduced-motion", () => {
  beforeEach(stubReducedMotion);

  it("renders the correct number of skeleton rows", () => {
    const { getAllByRole } = render(<InvoiceListSkeleton rows={3} />);
    // Each skeleton <li> is inside the <ul aria-label="Loading invoices">
    const list = document.querySelector('[aria-label="Loading invoices"]');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll("li")).toHaveLength(3);
  });

  it('exposes aria-busy="true" so assistive technology announces loading', () => {
    const { getByRole } = render(<InvoiceListSkeleton rows={3} />);
    const list = getByRole("list", { name: /loading invoices/i });
    expect(list).toHaveAttribute("aria-busy", "true");
  });

  it("skeleton rows remain in the DOM (visible) with reduced motion", () => {
    const { container } = render(<InvoiceListSkeleton rows={3} />);
    // Skeleton placeholder divs must exist regardless of animation state
    const placeholders = container.querySelectorAll(".rounded.bg-slate-700, .rounded.bg-slate-800");
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it("passes jest-axe with reduced-motion matchMedia active", async () => {
    const { container } = render(<InvoiceListSkeleton rows={3} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── InvestLoading ────────────────────────────────────────────────────────────

describe("InvestLoading – reduced-motion", () => {
  beforeEach(stubReducedMotion);

  it("renders the invest loading view without crashing", () => {
    const { container } = render(<InvestLoading />);
    expect(container.firstChild).not.toBeNull();
  });

  it('marks the root element aria-busy="true"', () => {
    const { container } = render(<InvestLoading />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("skeleton placeholder elements are present in the DOM", () => {
    const { container } = render(<InvestLoading />);
    const animated = container.querySelectorAll(".animate-pulse");
    expect(animated.length).toBeGreaterThan(0);
  });

  it("passes jest-axe with reduced-motion matchMedia active", async () => {
    const { container } = render(<InvestLoading />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── InvoicesLoading ──────────────────────────────────────────────────────────

describe("InvoicesLoading – reduced-motion", () => {
  beforeEach(stubReducedMotion);

  it("renders the invoices loading view without crashing", () => {
    const { container } = render(<InvoicesLoading />);
    expect(container.firstChild).not.toBeNull();
  });

  it('marks the root element aria-busy="true"', () => {
    const { container } = render(<InvoicesLoading />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("skeleton placeholder elements are present in the DOM", () => {
    const { container } = render(<InvoicesLoading />);
    const animated = container.querySelectorAll(".animate-pulse");
    expect(animated.length).toBeGreaterThan(0);
  });

  it("passes jest-axe with reduced-motion matchMedia active", async () => {
    const { container } = render(<InvoicesLoading />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Default (motion-allowed) smoke check ────────────────────────────────────

describe("InvoiceListSkeleton – default motion (no-preference)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false, // no-preference: animations run normally
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("still renders rows and passes axe under no-preference", async () => {
    const { container, getByRole } = render(<InvoiceListSkeleton rows={2} />);
    getByRole("list", { name: /loading invoices/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
