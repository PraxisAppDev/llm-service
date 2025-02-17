import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admins/$adminId/changepw")({
  component: ChangeAdminPassword,
});

function ChangeAdminPassword() {
  return <div>Hello "/_auth/admins/$adminId/changepw"!</div>;
}
