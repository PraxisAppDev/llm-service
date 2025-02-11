import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/foo")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: Index,
});

function Index() {
  const { auth } = Route.useRouteContext();

  console.log("Index render", auth);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl text-center tracking-widest">
          Afterhours LLM Service
        </h1>
      </div>
    </div>
  );
}
