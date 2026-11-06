import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import { getInstructorOverview, parseRange } from "./instructorAnalyticsService";
import { createPurchase, createTeamPurchase } from "./purchaseService";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

let studentCounter = 0;
function createStudent() {
  studentCounter++;
  return testDb
    .insert(schema.users)
    .values({
      name: `Student ${studentCounter}`,
      email: `student${studentCounter}@example.com`,
      role: schema.UserRole.Student,
    })
    .returning()
    .get();
}

function purchase(courseId: number, amountPaid: number, createdAt: string) {
  const student = createStudent();
  testDb
    .insert(schema.purchases)
    .values({ userId: student.id, courseId, amountPaid, country: "US", createdAt })
    .run();
}

function enroll(userId: number, courseId: number, enrolledAt: string) {
  testDb.insert(schema.enrollments).values({ userId, courseId, enrolledAt }).run();
}

beforeEach(() => {
  testDb = createTestDb();
  base = seedBaseData(testDb);
});

describe("getInstructorOverview", () => {
  it("sums revenue from purchases inside the range and ignores older ones", () => {
    purchase(base.course.id, 4999, daysAgo(1));
    purchase(base.course.id, 2500, daysAgo(29));
    purchase(base.course.id, 9999, daysAgo(31));

    const overview = getInstructorOverview(base.instructor.id, "30d", NOW);

    expect(overview.current.revenue).toBe(7499);
  });

  it("estimates earnings after the 20% platform fee", () => {
    purchase(base.course.id, 5000, daysAgo(2));

    const overview = getInstructorOverview(base.instructor.id, "30d", NOW);

    expect(overview.current.earnings).toBe(4000);
  });

  it("rounds earnings once on the total, not per purchase", () => {
    // Per purchase: round(0.8) = 1 each → 3. On the total: round(2.4) = 2.
    purchase(base.course.id, 1, daysAgo(1));
    purchase(base.course.id, 1, daysAgo(2));
    purchase(base.course.id, 1, daysAgo(3));

    const overview = getInstructorOverview(base.instructor.id, "30d", NOW);

    expect(overview.current.earnings).toBe(2);
  });

  it("reports the previous period of the same length for comparison", () => {
    purchase(base.course.id, 1000, daysAgo(3)); // current 7d
    purchase(base.course.id, 3000, daysAgo(8)); // previous 7d
    purchase(base.course.id, 2000, daysAgo(13)); // previous 7d
    purchase(base.course.id, 9000, daysAgo(15)); // before both

    const overview = getInstructorOverview(base.instructor.id, "7d", NOW);

    expect(overview.current.revenue).toBe(1000);
    expect(overview.previous?.revenue).toBe(5000);
    expect(overview.previous?.earnings).toBe(4000);
  });

  it("includes every purchase and has no comparison for all time", () => {
    purchase(base.course.id, 1000, daysAgo(3));
    purchase(base.course.id, 2000, daysAgo(400));

    const overview = getInstructorOverview(base.instructor.id, "all", NOW);

    expect(overview.current.revenue).toBe(3000);
    expect(overview.previous).toBeNull();
  });

  it("counts new enrollments by enrollment date, each student once", () => {
    const repeat = createStudent();
    enroll(repeat.id, base.course.id, daysAgo(2));
    enroll(repeat.id, base.course.id, daysAgo(4)); // duplicate row
    enroll(createStudent().id, base.course.id, daysAgo(5));
    enroll(createStudent().id, base.course.id, daysAgo(10)); // previous 7d

    const overview = getInstructorOverview(base.instructor.id, "7d", NOW);

    expect(overview.current.newEnrollments).toBe(2);
    expect(overview.previous?.newEnrollments).toBe(1);
  });

  it("only counts the given instructor's courses", () => {
    const otherInstructor = testDb
      .insert(schema.users)
      .values({
        name: "Other Instructor",
        email: "other@example.com",
        role: schema.UserRole.Instructor,
      })
      .returning()
      .get();
    const otherCourse = testDb
      .insert(schema.courses)
      .values({
        title: "Other Course",
        slug: "other-course",
        description: "Not ours",
        salesCopy: "Sales copy",
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();
    purchase(base.course.id, 1000, daysAgo(1));
    purchase(otherCourse.id, 7000, daysAgo(1));
    enroll(createStudent().id, otherCourse.id, daysAgo(1));

    const overview = getInstructorOverview(base.instructor.id, "30d", NOW);

    expect(overview.current.revenue).toBe(1000);
    expect(overview.current.newEnrollments).toBe(0);
  });

  it("counts a team purchase in full and a PPP purchase at the amount paid", () => {
    const buyer = createStudent();
    // A team purchase of 5 seats at $59.99 is one row for the full amount.
    createTeamPurchase(buyer.id, base.course.id, 5 * 5999, "US", 5);
    // A PPP purchase from India paid $25.00 rather than the list price.
    createPurchase(createStudent().id, base.course.id, 2500, "IN");

    const overview = getInstructorOverview(base.instructor.id, "30d");

    expect(overview.current.revenue).toBe(32495);
  });
});

describe("parseRange", () => {
  it("accepts the supported ranges", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("90d")).toBe("90d");
    expect(parseRange("all")).toBe("all");
  });

  it("falls back to 30 days for a missing or unknown value", () => {
    expect(parseRange(null)).toBe("30d");
    expect(parseRange("")).toBe("30d");
    expect(parseRange("365d")).toBe("30d");
  });
});
