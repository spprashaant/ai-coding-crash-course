import { Link } from "react-router";
import type { Route } from "./+types/about";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "About — Cadence" },
    {
      name: "description",
      content:
        "Cadence is a course platform for developers who want to learn at their own pace.",
    },
  ];
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Cadence
          </Link>
          <Link
            to="/courses"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Courses
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">About Cadence</h1>
        <div className="mt-6 space-y-4 text-lg text-muted-foreground">
          <p>
            Cadence is a course platform for developers. Experienced instructors
            publish structured courses, and students work through them on their
            own schedule.
          </p>
          <p>
            Courses are split into modules and lessons. You can watch video
            lessons, take quizzes, ask questions, and track your progress from
            your dashboard.
          </p>
        </div>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link to="/courses">
              Browse Courses
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
