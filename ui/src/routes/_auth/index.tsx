import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <section className="typography">
        <h1>Dashboard</h1>
        <p>
          Something cool will go here eventually. For now, check out the{" "}
          <Link to="/users" className="underline">
            API users
          </Link>{" "}
          page or the{" "}
          <Link to="/admins" className="underline">
            admin users
          </Link>{" "}
          page.
        </p>
      </section>
    </>
  );
}
