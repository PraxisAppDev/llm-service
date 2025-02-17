import { Toaster } from "@/components/ui/sonner";
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
      })),
    );

const TanStackQueryDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import("@tanstack/react-query-devtools").then((res) => ({
        default: res.ReactQueryDevtools,
      })),
    );

export const Route = createRootRouteWithContext<RouterCtx>()({
  component: Root,
});

function Root() {
  const { auth } = Route.useRouteContext();

  return (
    <>
      {auth.user === undefined ? <Loading /> : <Outlet />}
      <Toaster />
      <Suspense>
        <TanStackRouterDevtools
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{ className: "right-16" }}
        />
      </Suspense>
      <Suspense>
        <footer className="fixed right-[8px] bottom-[48px] z-[99998]">
          <TanStackQueryDevtools
            initialIsOpen={false}
            position="bottom"
            buttonPosition="relative"
          />
        </footer>
      </Suspense>
    </>
  );
}

function Loading() {
  return (
    <div className="typography flex min-h-svh w-full items-center justify-center p-6 md:p-10 ri">
      <div className="flex flex-col items-center gap-4 w-full">
        <h1 className="text-center tracking-widest">Praxis Afterhours</h1>
        <h2 className="text-center text-muted-foreground tracking-wider border-b-0">LLM Service</h2>
        <LoaderCircle className="animate-spin" size={48} />
      </div>
    </div>
  );
}
