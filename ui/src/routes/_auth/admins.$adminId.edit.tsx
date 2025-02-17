import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admins/$adminId/edit")({
  component: EditAdmin,
});

function EditAdmin() {
  return <div>Hello "/_auth/admins/$adminId/edit"!</div>;
}
