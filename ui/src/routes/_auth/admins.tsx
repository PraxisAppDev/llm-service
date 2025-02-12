import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admins")({
  component: AdminUsers,
  staticData: {
    breadcrumbLabel: "Manage Admins",
  },
});

function AdminUsers() {
  return <div>Admin Users!</div>;
}
