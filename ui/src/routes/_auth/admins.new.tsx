import { createAdmin } from "@/api";
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
import { tempPassword } from "@/lib/crypto";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_auth/admins/new")({
  component: CreateAdmin,
});

const createAdminSchema = z.object({
  email: z.string().email("Email must be a valid email address"),
  name: z.string().nonempty("Name must not be empty"),
  password: z.string().nonempty(),
});
type CreateAdminParams = z.infer<typeof createAdminSchema>;

function CreateAdmin() {
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const goBack = useCallback(() => {
    setTimeout(() => void navigate({ from: Route.fullPath, to: "..", replace: true }), 150);
  }, [navigate]);
  const [open, setOpen] = useState(true);
  const mutation = useMutation({
    mutationKey: ["createAdmin"],
    mutationFn: (params: CreateAdminParams) => {
      return createAdmin(params);
    },
    onError: (error) => {
      console.error(`Create admin failed: ${error.message}`);
    },
    onSuccess: (data) => {
      console.info(`Create admin successful! ${data.email} -> ${data.id}`);
      toast.success("New admin created successfully!");
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      setOpen(false);
      goBack();
    },
    retry: false,
  });
  const form = useForm<CreateAdminParams>({
    defaultValues: {
      name: "",
      email: "",
      password: tempPassword(10),
    },
    validators: {
      onChange: createAdminSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(value);
    },
  });

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
          <DialogTitle>Create new admin</DialogTitle>
          <DialogDescription>
            Add a new admin user that will have access to this console. Copy their temp password and
            send it to them!
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
            <div className="grid gap-3">
              <form.Field name="password">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Initial password</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="text"
                      required
                      disabled
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
                {isBusy ? "Submitting..." : "Submit"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
