import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_auth/admins/$adminId/edit")({
  component: EditAdmin,
});

const editAdminSchema = z.object({
  email: z.string().email("Email must be a valid email address"),
  name: z.string().nonempty("Name must not be empty"),
});
type EditAdminParams = z.infer<typeof editAdminSchema>;

function EditAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const navigate = Route.useNavigate();
  const { auth } = Route.useRouteContext();
  const { adminId } = Route.useParams();
  const goBack = useCallback(() => {
    setTimeout(() => void navigate({ from: Route.fullPath, to: "/admins", replace: true }), 150);
  }, [navigate]);
  const mutation = useMutation({
    mutationKey: ["editAdmin"],
    // mutationFn: (params: EditAdminParams) => {
    //   // return createAdmin(params);
    // },
    onError: (error) => {
      console.error(`Edit admin failed: ${error.message}`);
    },
    onSuccess: () => {
      // console.info(`Edit admin successful! ${data.email} -> ${data.id}`);
      toast.success("Your account information updated successfully!");
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      setOpen(false);
      goBack();
    },
    retry: false,
  });
  const form = useForm<EditAdminParams>({
    defaultValues: {
      name: auth.user?.name || "",
      email: auth.user?.email || "",
    },
    validators: {
      onChange: editAdminSchema,
    },
    // onSubmit: ({ value }) => {
    //   // mutation.mutate(value);
    // },
  });

  if (!auth.user) return null;

  if (adminId !== auth.user.id) {
    // only let admins edit their own accounts
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
              The specified admin either doesn&apos;t exist or doesn&apos;t match your account. You
              may only edit your own admin account information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const isBusy = form.state.isSubmitting || mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) goBack();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update your account</DialogTitle>
          <DialogDescription>
            Use the form below to edit your name and email address.
          </DialogDescription>
        </DialogHeader>
        <form
          id="newadminform"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <form.Field name="name">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="text"
                      autoComplete="name"
                      required
                      disabled={isBusy}
                    />
                  </>
                )}
              </form.Field>
            </div>
            <div className="grid gap-3">
              <form.Field name="email">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isBusy}
                    />
                  </>
                )}
              </form.Field>
            </div>
          </div>
          {mutation.isError && (
            <div className="bg-destructive mt-4 p-1 rounded text-center text-sm text-destructive-foreground">
              {mutation.error.message}
            </div>
          )}
        </form>
        <DialogFooter>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isPristine]}>
            {([canSubmit, isPristine]) => (
              <Button
                type="submit"
                form="newadminform"
                disabled={isPristine || isBusy || !canSubmit}
              >
                {isBusy ? "Updating..." : "Update"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
