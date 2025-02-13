import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks";
import {
  ChevronsDown,
  ChevronsRight,
  LoaderCircle,
  LogOut,
} from "lucide-react";
import { useState } from "react";

export function NavUser() {
  const { user, logout } = useAuth();
  const { isMobile } = useSidebar();
  const [isWaiting, setIsWaiting] = useState(false);
  const [logoutError, setLogoutError] = useState<string | undefined>(undefined);

  const onLogout = async (evt: Event) => {
    setIsWaiting(true);
    setLogoutError(undefined);

    try {
      evt.preventDefault();
      const result = await logout();

      if (!result.ok) {
        // TODO: do something with an error
        setLogoutError(result.error || "Unknown logout failure");
      }
    } catch (e) {
      console.error("Error logging out: ", e);
      setLogoutError("Unexpected logout error!");
    } finally {
      setIsWaiting(false);
    }
  };

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar user={user} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                {/* <span className="truncate text-xs">{user.email}</span> */}
              </div>
              {isMobile ? (
                <ChevronsDown className="ml-auto size-4" />
              ) : (
                <ChevronsRight className="ml-auto size-4" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[239px] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar user={user} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout} disabled={isWaiting}>
              {isWaiting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut />
                  Log out
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
