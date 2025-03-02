import { deleteUserKey } from "@/api";
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
import { useUsers } from "@/hooks/use-users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/users/$userId/keys/$keyId/revoke")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId, keyId } = Route.useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const navigate = Route.useNavigate();
  const goBack = useCallback(() => {
    setTimeout(
      () => void navigate({ from: Route.fullPath, to: "../../../..", replace: true }),
      150,
    );
  }, [navigate]);
  const { data } = useUsers();
  const [validParams, user, key] = useMemo(() => {
    if (!data) return [undefined, undefined, undefined];
    const user = data.users.find((u) => u.id === userId);
    if (!user) {
      return [false, undefined, undefined];
    }
    const key = user.apiKeys.find((k) => k.id === keyId);
    if (!key) {
      return [false, user, undefined];
    }
    return [true, user, key];
  }, [userId, keyId, data]);
  const mutation = useMutation({
    mutationKey: ["deleteUserKey"],
    mutationFn: () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return deleteUserKey(userId, keyId);
    },
    onSuccess: () => {
      console.info(`Delete user API key successful! ${userId} -> ${keyId}`);
      toast.success("API key deleted successfully!");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      goBack();
    },
    onError: (error) => {
      console.error(`Delete admin failed: ${error.message}`);
    },
  });

  if (!data || validParams === undefined) return null;

  if (!validParams || !user || !key) {
    // invalid user and/or key IDs
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
              The selected API user and/or API key does not exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) goBack();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to revoke API key{" "}
            <span className="font-semibold text-foreground">{key.snippet}...</span> for user{" "}
            <span className="font-semibold text-foreground">
              {user.name} &lt;{user.email}&gt;
            </span>
            . The API key will be permanently deleted. This action cannot be undone!
          </AlertDialogDescription>
          {mutation.isError && (
            <div className="bg-destructive mt-2 p-1 rounded text-center text-sm text-destructive-foreground">
              {mutation.error.message}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Back</AlertDialogCancel>
          <AlertDialogDestructive
            disabled={mutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogDestructive>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
