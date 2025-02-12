import { AuthState } from "@/contexts/auth";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
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
  component: () => (
    <>
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools initialIsOpen={false} position="bottom-right" />
      </Suspense>
    </>
  ),
});
