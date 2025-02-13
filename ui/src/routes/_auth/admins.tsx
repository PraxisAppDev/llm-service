import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admins")({
  component: AdminUsers,
  staticData: {
    breadcrumbLabel: "Manage Admins",
  },
});

function AdminUsers() {
  return (
    <>
      <section>
        <h1>Admins</h1>
        <p>
          Admin users can log into this console to manage the <em>LLM Service</em>&apos;s
          components, including: available models, API users and their API keys, and admin users
          themselves.
        </p>
      </section>
    </>
  );
}
