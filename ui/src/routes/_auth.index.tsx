import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/")({
  component: RouteComponent,
  staticData: {
    breadcrumbLabel: "Home",
  },
});

function RouteComponent() {
  return <div>Dashboard page!</div>;
}
