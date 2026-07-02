"use client";

import { useState, useTransition } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Loader2, FileText } from "lucide-react";
import { fetchPeriodReport } from "@/lib/admin/reports-actions";
import {
  REPORT_PERIODS,
  REPORT_PERIOD_LABEL,
  type ReportPeriod,
  type PeriodReport,
} from "@/lib/admin/reports-shared";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * jspdf-autotable augments the jsPDF instance with `lastAutoTable` at runtime,
 * but the installed type bundle does not expose it on the jsPDF interface. We
 * read it through a precise local interface (no `any`).
 * ------------------------------------------------------------------------- */
interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY?: number };
}

/* --------------------------------- helpers -------------------------------- */

const moneyFmt = new Intl.NumberFormat("en-IN");

/** Format integer minor units (poisha) as "Tk 1,234". No Bengali glyphs. */
function money(minor: number): string {
  return "Tk " + moneyFmt.format(Math.round(minor / 100));
}

/** URL-safe slug for the filename. */
function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "store"
  );
}

/** YYYY-MM-DD for today (runtime browser). */
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Safe date label for recent-order rows. */
function orderDate(raw: string): string {
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return raw;
  return new Date(t).toLocaleDateString();
}

function finalYOf(doc: AutoTableDoc, fallback: number): number {
  const y = doc.lastAutoTable?.finalY;
  return typeof y === "number" ? y : fallback;
}

/* --------------------------------- palette -------------------------------- */

const INK: [number, number, number] = [17, 24, 39]; // dark header band / body text
const ACCENT: [number, number, number] = [124, 58, 237]; // violet accent
const MUTED: [number, number, number] = [107, 114, 128]; // gray labels/footer
const HAIRLINE: [number, number, number] = [229, 231, 235];

/* --------------------------------- buildPdf ------------------------------- */

function buildPdf(report: PeriodReport, storeName: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as AutoTableDoc;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;

  /* -- 1. HEADER BAND ----------------------------------------------------- */
  const bandH = 72;
  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.rect(0, 0, pageW, bandH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(storeName, margin, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);
  doc.text("Analytics Report", margin, 54);

  // Meta block below the band (dark text).
  let y = bandH + 26;
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(report.title, margin, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(report.rangeLabel, margin, y);
  y += 13;
  doc.text("Generated " + report.generatedAtLabel, margin, y);

  /* -- 2. KPI SUMMARY (5-col row of stat boxes) --------------------------- */
  y += 22;
  const kpis = report.kpis;
  const cards: Array<{ label: string; value: string }> = [
    { label: "Paid revenue", value: money(kpis.revenue) },
    { label: "Pending (COD)", value: money(kpis.pendingRevenue) },
    { label: "Orders", value: moneyFmt.format(kpis.orders) },
    { label: "Avg order", value: money(kpis.aov) },
    { label: "Customers", value: moneyFmt.format(kpis.customers) },
  ];
  const gap = 10;
  const cardW = (contentW - gap * (cards.length - 1)) / cards.length;
  const cardH = 54;
  cards.forEach((card, i) => {
    const x = margin + i * (cardW + gap);
    doc.setDrawColor(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2]);
    doc.setFillColor(249, 250, 251);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y, cardW, cardH, 4, 4, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(card.label.toUpperCase(), x + 8, y + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    const valLines = doc.splitTextToSize(card.value, cardW - 16);
    doc.text(Array.isArray(valLines) ? valLines[0] ?? card.value : valLines, x + 8, y + 38);
  });
  y += cardH + 30;

  /* -- 3. SALES TREND (bar chart) ----------------------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("Sales over time", margin, y);
  y += 12;

  const series = report.series;
  const maxSales = series.reduce((m, p) => (p.sales > m ? p.sales : m), 0);

  const chartH = 120;
  const chartTop = y;
  const baselineY = chartTop + chartH;

  if (series.length === 0 || maxSales <= 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("No sales in this period", margin, chartTop + 24);
    y = chartTop + 40;
  } else {
    const n = series.length;
    const slot = contentW / n;
    const barW = Math.max(2, Math.min(slot * 0.6, 28));
    const labelEvery = Math.max(1, Math.ceil(n / 8));

    // Baseline.
    doc.setDrawColor(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2]);
    doc.setLineWidth(0.75);
    doc.line(margin, baselineY, margin + contentW, baselineY);

    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    for (let i = 0; i < n; i++) {
      const point = series[i];
      if (!point) continue;
      const h = maxSales > 0 ? (point.sales / maxSales) * chartH : 0;
      const cx = margin + i * slot + slot / 2;
      const bx = cx - barW / 2;
      const by = baselineY - h;
      if (h > 0) doc.rect(bx, by, barW, h, "F");

      if (i % labelEvery === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        const lbl = point.label;
        const lblLines = doc.splitTextToSize(lbl, slot);
        const first = Array.isArray(lblLines) ? lblLines[0] ?? lbl : lblLines;
        const lblW = doc.getTextWidth(String(first));
        doc.text(String(first), cx - lblW / 2, baselineY + 12);
      }
    }
    y = baselineY + 26;
  }

  /* -- 4. BREAKDOWN TABLES ------------------------------------------------- */
  const breakdowns: Array<{ title: string; rows: readonly { label: string; count: number; revenue: number }[] }> = [
    { title: "Orders by status", rows: report.statusBreakdown },
    { title: "Payment methods", rows: report.paymentBreakdown },
    { title: "Delivery zones", rows: report.zoneBreakdown },
  ];

  const sectionTitle = (text: string, top: number): number => {
    let t = top;
    if (t + 40 > pageH - margin) {
      doc.addPage();
      t = margin + 10;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(text, margin, t);
    return t + 6;
  };

  for (const bd of breakdowns) {
    y = sectionTitle(bd.title, y + 6);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      head: [[bd.title.replace(/^Orders by |^/, ""), "Orders", "Revenue"]],
      body:
        bd.rows.length > 0
          ? bd.rows.map((r) => [r.label, moneyFmt.format(r.count), money(r.revenue)])
          : [["No data", "0", money(0)]],
      styles: { fontSize: 8.5, cellPadding: 4, textColor: INK, lineColor: HAIRLINE },
      headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = finalYOf(doc, y) + 22;
  }

  /* -- 5. TOP PRODUCTS ----------------------------------------------------- */
  y = sectionTitle("Top products", y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    head: [["Product", "Units", "Revenue"]],
    body:
      report.topProducts.length > 0
        ? report.topProducts.map((p) => [p.name, moneyFmt.format(p.units), money(p.revenue)])
        : [["No products sold", "0", money(0)]],
    styles: { fontSize: 8.5, cellPadding: 4, textColor: INK, lineColor: HAIRLINE },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  y = finalYOf(doc, y) + 22;

  /* -- 6. RECENT ORDERS ---------------------------------------------------- */
  y = sectionTitle("Recent orders", y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    head: [["Order", "Customer", "Status", "Payment", "Total"]],
    body:
      report.recentOrders.length > 0
        ? report.recentOrders.map((o) => [
            o.order_number,
            o.customer_name,
            o.status,
            o.payment_status,
            money(o.total),
          ])
        : [["—", "No recent orders", "—", "—", money(0)]],
    styles: { fontSize: 8, cellPadding: 4, textColor: INK, lineColor: HAIRLINE },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 4: { halign: "right" } },
    didParseCell: (data) => {
      // Append placed_at under the order number in the body's first column.
      if (data.section === "body" && data.column.index === 0) {
        const row = report.recentOrders[data.row.index];
        if (row) data.cell.text = [row.order_number, orderDate(row.placed_at)];
      }
    },
  });

  /* -- 7. FOOTER (every page) --------------------------------------------- */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);

    const footY = pageH - 20;
    doc.text(`${storeName} · Confidential`, margin, footY);

    const right = `Page ${i} of ${totalPages}`;
    const rightW = doc.getTextWidth(right);
    doc.text(right, pageW - margin - rightW, footY);
  }

  return doc;
}

/* --------------------------------- component ------------------------------ */

export function ReportExport({ storeName }: { storeName: string }) {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchPeriodReport(period);
        if (!res.ok || !res.report) {
          setError(res.error ?? "Failed to generate report");
          return;
        }
        const doc = buildPdf(res.report, storeName);
        const filename = `${slug(storeName)}-${period}-report-${isoDate(new Date())}.pdf`;
        doc.save(filename);
      } catch {
        setError("Something went wrong while generating the PDF");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="report-period" className="text-sm font-medium text-foreground">
          Period
        </label>
        <select
          id="report-period"
          value={period}
          disabled={isPending}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
          className={cn(
            "h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {REPORT_PERIODS.map((p) => (
            <option key={p} value={p}>
              {REPORT_PERIOD_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isPending}
        aria-busy={isPending}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium",
          "text-primary-foreground transition-colors hover:bg-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? "Generating…" : "Download PDF"}
      </button>

      {error ? (
        <p role="alert" aria-live="assertive" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
