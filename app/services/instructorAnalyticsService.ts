import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "~/db";
import { courses, enrollments, purchases } from "~/db/schema";
import { calculateEarnings } from "~/lib/revenue";

// ─── Instructor Analytics Service ───
// Aggregates figures for the instructor dashboard. All aggregation happens in
// SQL; never loop over per-student service functions here.

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};
const ANALYTICS_RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = "30d";

/** Every range in display order, with its picker label and comparison wording. */
export const RANGE_OPTIONS = ANALYTICS_RANGES.map((range) => ({
  range,
  label: range === "all" ? "All time" : `Last ${RANGE_DAYS[range]} days`,
  comparison: range === "all" ? null : `vs previous ${RANGE_DAYS[range]} days`,
}));

/** Turns a `?range=` value into a range, falling back to the default. */
export function parseRange(value: string | null): AnalyticsRange {
  return ANALYTICS_RANGES.find((range) => range === value) ?? DEFAULT_ANALYTICS_RANGE;
}

/** A half-open window [start, end) of ISO timestamps; null means unbounded. */
type TimeWindow = { start: string | null; end: string | null };

function getRevenueFigures(instructorId: number, window: TimeWindow) {
  const row = db
    .select({ revenue: sql<number>`coalesce(sum(${purchases.amountPaid}), 0)` })
    .from(purchases)
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .where(
      and(
        eq(courses.instructorId, instructorId),
        window.start ? gte(purchases.createdAt, window.start) : undefined,
        window.end ? lt(purchases.createdAt, window.end) : undefined
      )
    )
    .get();

  const revenue = row?.revenue ?? 0;
  return { revenue, earnings: calculateEarnings(revenue) };
}

function getNewEnrollments(instructorId: number, window: TimeWindow) {
  // Enrollments have no uniqueness constraint, so count each student once per course.
  const row = db
    .select({
      count: sql<number>`count(distinct ${enrollments.userId} || '-' || ${enrollments.courseId})`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(courses.instructorId, instructorId),
        window.start ? gte(enrollments.enrolledAt, window.start) : undefined,
        window.end ? lt(enrollments.enrolledAt, window.end) : undefined
      )
    )
    .get();

  return row?.count ?? 0;
}

function getWindowFigures(instructorId: number, window: TimeWindow) {
  return {
    ...getRevenueFigures(instructorId, window),
    newEnrollments: getNewEnrollments(instructorId, window),
  };
}

export function getInstructorOverview(
  instructorId: number,
  range: AnalyticsRange,
  now: Date = new Date()
) {
  if (range === "all") {
    return {
      range,
      current: getWindowFigures(instructorId, { start: null, end: null }),
      previous: null,
    };
  }

  const length = RANGE_DAYS[range] * DAY_MS;
  const start = new Date(now.getTime() - length).toISOString();
  const previousStart = new Date(now.getTime() - 2 * length).toISOString();

  return {
    range,
    current: getWindowFigures(instructorId, { start, end: null }),
    previous: getWindowFigures(instructorId, { start: previousStart, end: start }),
  };
}
