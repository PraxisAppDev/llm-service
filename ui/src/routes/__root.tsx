import { AuthState } from "@/contexts/auth";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import React, { Suspense } from "react";

interface RouterCtx {
  auth: AuthState;
}

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      }))
    );

export const Route = createRootRouteWithContext<RouterCtx>()({
  component: Root,
});

function Root() {
  const { auth } = Route.useRouteContext();

  return (
    <>
      {auth.user === undefined ? <Loading /> : <Outlet />}
      <Suspense>
        <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" />
      </Suspense>
    </>
  );
}

function Loading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex flex-col items-center gap-4 w-full">
        <h1 className="text-6xl text-center tracking-widest">
          Praxis Afterhours
        </h1>
        <h2 className="text-4xl text-center tracking-widest italic">
          LLM Service
        </h2>
        <LoaderCircle className="animate-spin" size={48} />
      </div>
    </div>
  );
}
