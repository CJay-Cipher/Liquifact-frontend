"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import ErrorBanner from "@/components/ErrorBanner";
import InvoiceCard from "@/components/InvoiceCard";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import InvoiceSearch from "@/components/InvoiceSearch";
import InvoiceFilters, {
  ActiveFilterSummary,
  DEFAULT_FILTERS,
  clearFilterByKey,
  hasActiveFilters,
  parseSortState,
} from "@/components/InvoiceFilters";
import Pagination from "@/components/Pagination";
import { copy } from "../copy/en";
import { fetchInvestableInvoices } from "../../lib/api/invoices";
import { loadMockInvoices } from "./lib";

/** Number of invoices rendered per page. */
export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 200;

/** Debounce delay (ms) for issuer search filtering. */
export const SEARCH_DEBOUNCE_MS = 200;

/**
 * Returns the screen-reader announcement text for the initial invoice load.
 */
export function getInvoiceLoadAnnouncement(
  invoices,
  { filterActive = false, filteredCount = 0 } = {}
) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return "No invoices available";
  }
  return `${invoices.length} investable invoices loaded`;
}

export function getPaginationAnnouncement(shown, total) {
  if (total === 0) return "No invoices available";
  return `Showing ${shown} of ${total} investable invoices`;
}

function parseAmount(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

function parseYield(str) {
  return parseFloat(String(str).replace(/%/g, "")) || 0;
}

/**
 * Sort a copy of `list` by the active sort column + direction in `filters`.
 * Does not mutate the original array.
 */
export function applySortToList(list, filters) {
  if (!Array.isArray(list) || list.length === 0) return list;

  const { column, dir } = parseSortState(filters);
  if (!column) return list;

  const multiplier = dir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let diff = 0;
    if (column === "amount") {
      diff = parseAmount(a.amount) - parseAmount(b.amount);
    } else if (column === "yield") {
      diff = parseYield(a.yield) - parseYield(b.yield);
    } else if (column === "maturity") {
      diff = new Date(a.dueDate) - new Date(b.dueDate);
    }
    return multiplier * diff;
  });
}

/**
 * Filters and sorts invoices based on search query and structured filters.
 * Pure function — exported for testing.
 */
export function filterInvoices(invoices, debouncedQuery, filters) {
  if (!Array.isArray(invoices)) return [];

  let result = invoices;

  if (debouncedQuery.trim()) {
    const q = debouncedQuery.trim().toLowerCase();
    result = result.filter(
      (inv) =>
        inv.issuer?.toLowerCase().includes(q) ||
        inv.id?.toLowerCase().includes(q)
    );
  }

  if (filters.yieldMin !== "") {
    const min = parseFloat(filters.yieldMin);
    if (!Number.isNaN(min)) {
      result = result.filter((inv) => parseYield(inv.yield) >= min);
    }
  }

  if (filters.yieldMax !== "") {
    const max = parseFloat(filters.yieldMax);
    if (!Number.isNaN(max)) {
      result = result.filter((inv) => parseYield(inv.yield) <= max);
    }
  }

  if (filters.currency) {
    result = result.filter((inv) => inv.currency === filters.currency);
  }

  if (filters.maturityFrom) {
    result = result.filter((inv) => inv.dueDate >= filters.maturityFrom);
  }

  if (filters.maturityTo) {
    result = result.filter((inv) => inv.dueDate <= filters.maturityTo);
  }

  result = applySortToList(result, filters);

  return result;
}

/**
 * InvestMarketplace — main component for the invest page.
 *
 * @param {object} props
 * @param {Function} [props.loadInvoices] - Async loader; injectable for testing.
 */
export function InvestMarketplace({ loadInvoices = fetchInvestableInvoices }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const initialFilters = { ...DEFAULT_FILTERS };
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    if (searchParams.has(key)) {
      initialFilters[key] = searchParams.get(key) || "";
    }
  }

  const [invoices, setInvoices] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [paginationAnnouncement, setPaginationAnnouncement] = useState("");
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);

  const loadMoreRef = useRef(null);

  const resetPagination = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    setPaginationAnnouncement("");
  }, []);

  // ── Fetch invoices ────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function load() {
      setInvoices(null);
      setLoadError('');

      try {
        const nextInvoices = await loadInvoices({ signal: controller.signal });
        if (!isActive) return;
        const normalizedInvoices = Array.isArray(nextInvoices) ? nextInvoices : [];
        setInvoices(normalizedInvoices);
        setVisibleCount(PAGE_SIZE);
        setPaginationAnnouncement("");
        setLoadError("");
      } catch {
        if (!isActive) return;
        setInvoices(null);
        setLoadError(copy.invest.errorDescription);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [loadInvoices]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setVisibleCount(PAGE_SIZE);
      setPaginationAnnouncement("");
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Derived values ────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, debouncedQuery, filters),
    [invoices, debouncedQuery, filters]
  );

  const filterActive = hasActiveFilters(filters) || Boolean(debouncedQuery.trim());

  const filterStatusMessage = useMemo(() => {
    if (invoices === null) return "";
    if (loadError) return copy.invest.errorStatus;
    return getInvoiceLoadAnnouncement(invoices, {
      filterActive,
      filteredCount: filteredInvoices.length,
    });
  }, [invoices, loadError, filterActive, filteredInvoices.length]);

  const statusMessage = paginationAnnouncement || filterStatusMessage;

  const visibleInvoices = filteredInvoices.slice(0, visibleCount);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + PAGE_SIZE, filteredInvoices.length);
      setPaginationAnnouncement(
        getPaginationAnnouncement(next, filteredInvoices.length)
      );
      return next;
    });
    setTimeout(() => {
      loadMoreRef.current?.focus();
    }, 0);
  }, [filteredInvoices.length]);

  const handleFilterChange = useCallback(
    (nextFilters) => {
      setFilters(nextFilters);
      resetPagination();
    },
    [resetPagination]
  );

  const handleRemoveFilter = useCallback(
    (clearKey) => {
      if (clearKey === "search") {
        setSearchQuery("");
        setDebouncedQuery("");
      } else {
        setFilters((prev) => clearFilterByKey(prev, clearKey));
      }
      resetPagination();
    },
    [resetPagination]
  );

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setFilters(DEFAULT_FILTERS);
    resetPagination();
  }, [resetPagination]);

  const handleClearStructuredFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    resetPagination();
  }, [resetPagination]);

  const allInvoices = Array.isArray(invoices) ? invoices : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section aria-labelledby="invoice-list-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="invoice-list-heading" className="text-xl font-semibold text-slate-100">
            Your invoices
          </h2>
          <p className="text-sm text-slate-400">
            Track tokenization progress for uploaded documents.
          </p>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </p>
      </div>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <InvoiceSearch value={searchQuery} onChange={setSearchQuery} />
            <InvoiceFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearStructuredFilters}
            />
          </div>
        </div>

        {loadError ? (
          <ErrorBanner
            variant="error"
            title={copy.invest.errorTitle}
            description={loadError}
            previewLabel="Marketplace status"
          />
        ) : invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : allInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">
            {copy.invest.emptyState}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <>
            <ActiveFilterSummary
              shown={0}
              totalFiltered={0}
              filters={filters}
              searchQuery={debouncedQuery}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
            />
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">
              No invoices match your filters.
            </div>
          </>
        ) : (
          <>
            <ActiveFilterSummary
              shown={visibleInvoices.length}
              totalFiltered={filteredInvoices.length}
              filters={filters}
              searchQuery={debouncedQuery}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
            />

            <ul className="space-y-4" aria-label="Investable invoices">
              {visibleInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invest/${inv.id}`}
                    className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-cyan-500/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    aria-label={`View details for ${inv.issuer} invoice ${inv.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-100">{inv.issuer}</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-300">
                      <span>{inv.currency}&nbsp;{inv.amount}</span>
                      <span>Est. yield&nbsp;{inv.yield}</span>
                      <span>Maturity&nbsp;{inv.dueDate}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination
              ref={loadMoreRef}
              shown={visibleInvoices.length}
              total={filteredInvoices.length}
              onLoadMore={handleLoadMore}
            />

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
              Note: Yield references are educational only and reflect on-chain basis-point
              assumptions. Invoice contracts settle at maturity.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function InvestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvestMarketplace loadInvoices={loadMockInvoices} />
    </Suspense>
  );
}