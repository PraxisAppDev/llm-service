import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/users")({
  component: ApiUsers,
  staticData: {
    breadcrumbLabel: "Manage API Users",
  },
});

function ApiUsers() {
  return <div>API Users!</div>;
}
