import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogDestructive,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdmins } from "@/hooks/use-admins";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

export const Route = createFileRoute("/_auth/admins/$adminId/delete")({
  component: DeleteAdmin,
});

function DeleteAdmin() {
  const navigate = Route.useNavigate();
  const goBack = useCallback(() => {
    setTimeout(() => void navigate({ from: Route.fullPath, to: "/admins", replace: true }), 150);
  }, [navigate]);
  const { auth } = Route.useRouteContext();
  const { adminId } = Route.useParams();
  const { data } = useAdmins();
  const validIds = useMemo(() => {
    if (!data) return [];
    return data.admins.map((u) => u.id);
  }, [data]);

  if (!auth.user) return null;
  if (!data) return null;
  if (validIds.length === 0) return null;

  if (adminId === auth.user.id) {
    // don't let admins delete their own accounts
    return (
      <AlertDialog
        defaultOpen
        onOpenChange={(open) => {
          if (!open) goBack();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid action</AlertDialogTitle>
            <AlertDialogDescription>
              You cannot delete your own admin acount. If you no longer need your account, you may
              have another admin delete it for you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  if (!validIds.includes(adminId)) {
    // can't delete invalid admin IDs
    return (
      <AlertDialog
        defaultOpen
        onOpenChange={(open) => {
          if (!open) goBack();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid action</AlertDialogTitle>
            <AlertDialogDescription>The selected admin does not exist.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const admin = data.admins.find((u) => u.id === adminId)!;

  return (
    <AlertDialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open) goBack();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete admin{" "}
            <span className="font-semibold text-foreground">
              {admin.name} &lt;{admin.email}&gt;
            </span>
            . The admin will be permanently deleted. This action cannot be undone!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogDestructive>Delete</AlertDialogDestructive>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
