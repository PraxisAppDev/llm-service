import { apiDocs } from "@/api";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Route as adminsRoute } from "@/routes/_auth/admins";
import { Route as indexRoute } from "@/routes/_auth/index";
import { Route as playgroundRoute } from "@/routes/_auth/playground";
import { Route as usersRoute } from "@/routes/_auth/users";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookMarked,
  BrainCircuit,
  Code,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  UserCog,
} from "lucide-react";

const serviceItems = [
  {
    title: "Dashboard",
    url: indexRoute.to,
    icon: LayoutDashboard,
  },
  {
    title: "API Users",
    url: usersRoute.to,
    icon: KeyRound,
  },
  {
    title: "Playground",
    url: playgroundRoute.to,
    icon: MessagesSquare,
  },
];

const adminItems = [
  {
    title: "Admin Users",
    url: adminsRoute.to,
    icon: UserCog,
  },
];

const refItems = [
  {
    title: "API Documentation",
    url: apiDocs(),
    icon: BookMarked,
  },
  {
    title: "Code Repository",
    url: "https://github.com/PraxisAppDev/llm-service",
    icon: Code,
  },
  {
    title: "Bugs & Feedback",
    url: "https://github.com/PraxisAppDev/llm-service/issues",
    icon: LifeBuoy,
  },
];

export function AppSidebar() {
  const currentPath = useRouterState({
    select: (s) => s.resolvedLocation?.pathname,
  });

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BrainCircuit className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Praxis Afterhours</span>
                  <span className="">LLM Service</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Service Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {serviceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/"
                        ? currentPath === item.url
                        : currentPath?.startsWith(item.url)
                    }
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath?.startsWith(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {refItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
