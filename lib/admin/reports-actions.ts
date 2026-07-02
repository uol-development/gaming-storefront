"use server";

import { getCurrentProfile, can } from "@/lib/auth/server";
import {
  getReportForPeriod,
  type PeriodReport,
  type ReportPeriod,
} from "@/lib/admin/reports-queries";

export interface PeriodReportResult {
  ok: boolean;
  error?: string;
  report?: PeriodReport;
}

/** Fetch aggregated analytics for a PDF export period. Gated to report viewers. */
export async function fetchPeriodReport(period: ReportPeriod): Promise<PeriodReportResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Not authenticated" };
  if (!can.viewReports(profile.role)) {
    return { ok: false, error: "You don't have permission to view reports" };
  }
  if (profile.is_suspended) return { ok: false, error: "Your account is suspended" };

  const report = await getReportForPeriod(period);
  return { ok: true, report };
}
