import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/")({
  component: Dashboard,
});

function Dashboard() {
  return <h1>Dashboard</h1>;
}
