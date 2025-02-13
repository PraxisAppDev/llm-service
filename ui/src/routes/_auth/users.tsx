import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/users")({
  component: ApiUsers,
  staticData: {
    breadcrumbLabel: "Manage API Users",
  },
});

function ApiUsers() {
  return (
    <>
      <section>
        <h1>API Users</h1>
        <p>
          API users can exercise LLM-related endpoints of the <em>LLM Service</em>&apos;s API using
          their assigned API keys. API users cannot access this console.
        </p>
      </section>
    </>
  );
}
