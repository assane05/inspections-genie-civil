import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/supervisor/")({
  beforeLoad: () => {
    throw redirect({ to: "/supervisor/tasks" });
  },
});
