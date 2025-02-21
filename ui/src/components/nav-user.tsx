import { deleteAdminSession } from "@/api";
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
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronsDown, ChevronsRight, LoaderCircle, LogOut, RectangleEllipsis } from "lucide-react";
import { toast } from "sonner";

export function NavUser() {
  const { user } = useAuth();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        throw new Error("Can't logout with no current user!");
      }

      return deleteAdminSession(user.id);
    },
    onError: (error) => {
      console.info(`[Logout] logout failed: ${error.message}`);
      toast.error(`Logout failed: ${error.message}`);
    },
    onSuccess: () => {
      console.info("[Logout] logout successful!");
      toast.success("You have successfully logged out");
      queryClient.setQueryData(["currentUser"], null);
    },
  });

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
              <UserAvatar userId={user.id} userName={user.name} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
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
                <UserAvatar userId={user.id} userName={user.name} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem
              onSelect={() =>
                void navigate({ to: "/admins/$adminId/edit", params: { adminId: user.id } })
              }
            >
              <Pencil /> Edit account
            </DropdownMenuItem> */}
            <DropdownMenuItem
              onSelect={() =>
                void navigate({ to: "/admins/$adminId/changepw", params: { adminId: user.id } })
              }
            >
              <RectangleEllipsis /> Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
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
