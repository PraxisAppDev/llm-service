import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.user === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthLayout,
  staticData: {
    breadcrumbLabel: "Afterhours LLM Service",
  },
});

function AuthLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh">
        <header className="flex sticky top-0 h-16 shrink-0 bg-background items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="bg-border mr-2 w-[1px] h-4"></div>
          <AppBreadcrumbs />
        </header>
        <div className="flex-1 flex flex-col px-4 py-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
