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
import { TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_auth/admins/$adminId/changepw")({
  component: ChangeAdminPassword,
});

const changeAdminPwSchema = z.object({
  currentPassword: z.string().min(8, "Passwords must be at least 8 characters"),
  newPassword: z.string().min(8, "Passwords must be at least 8 characters"),
  repeatNewPassword: z.string().min(8, "Passwords must be at least 8 characters"),
});
type ChangeAdminPwParams = z.infer<typeof changeAdminPwSchema>;

function ChangeAdminPassword() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [pwMatch, setPwMatch] = useState(true);
  const [pwSame, setPwSame] = useState(false);
  const navigate = Route.useNavigate();
  const { auth } = Route.useRouteContext();
  const { adminId } = Route.useParams();
  const goBack = useCallback(() => {
    setTimeout(() => void navigate({ from: Route.fullPath, to: "/admins", replace: true }), 150);
  }, [navigate]);
  const mutation = useMutation({
    mutationKey: ["changeAdminPw"],
    // mutationFn: (params: EditAdminParams) => {
    //   // return createAdmin(params);
    // },
    onError: (error) => {
      console.error(`Change admin password failed: ${error.message}`);
    },
    onSuccess: (data) => {
      // console.info(`Change admin password successful! ${data.email} -> ${data.id}`);
      toast.success("Your password was changed successfully!");
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      setOpen(false);
      goBack();
    },
    retry: false,
  });
  const form = useForm<ChangeAdminPwParams>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      repeatNewPassword: "",
    },
    validators: {
      onChange: ({ value }) => {
        const pwm =
          value.newPassword.length === 0 ||
          value.repeatNewPassword.length === 0 ||
          value.newPassword === value.repeatNewPassword;

        setPwMatch(pwm);

        const pws = value.newPassword.length !== 0 && value.currentPassword === value.newPassword;

        setPwSame(pws);

        const result = changeAdminPwSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues[0].message;
        }

        if (value.currentPassword === value.newPassword) {
          return "New password can't match current password";
        }

        if (value.newPassword !== value.repeatNewPassword) {
          return "New password values don't match";
        }

        return undefined;
      },
    },
    onSubmit: ({ value }) => {
      // mutation.mutate(value);
    },
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
              may only change the password on your own admin account.
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
  // const pwMatch = form.st;
  // form.state.values.repeatNewPassword.length == 0 ||
  //   form.state.values.newPassword === form.state.values.repeatNewPassword;

  console.log("PW Match", pwMatch);
  console.log("PW Same", pwSame);

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
          <DialogTitle>Change your password</DialogTitle>
          <DialogDescription>
            Enter your current password to verify your account and enter your new password.
            Passwords must be at least 8 characters in length.
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
              <form.Field name="currentPassword">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Current password</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </>
                )}
              </form.Field>
            </div>
            <div className="grid gap-3">
              <form.Field name="newPassword">
                {(field) => (
                  <>
                    <div className="flex">
                      <Label htmlFor={field.name} className="flex-1">
                        New password
                      </Label>
                      {pwSame && (
                        <div className="flex gap-1 items-center text-amber-500 text-sm leading-none">
                          <TriangleAlert className="size-3.5" />
                          Same as current password!
                        </div>
                      )}
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </>
                )}
              </form.Field>
            </div>
            <div className="grid gap-3">
              <form.Field name="repeatNewPassword">
                {(field) => (
                  <>
                    <div className="flex">
                      <Label htmlFor={field.name} className="flex-1">
                        Repeat new password
                      </Label>
                      {!pwMatch && (
                        <div className="flex gap-1 items-center text-amber-500 text-sm leading-none">
                          <TriangleAlert className="size-3.5" />
                          Doesn&apos;t match!
                        </div>
                      )}
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      required
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
                {isBusy ? "Changing..." : "Change"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
