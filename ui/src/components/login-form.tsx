import { createAdminSession } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formOptions, useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("You must enter a valid email address"),
  password: z.string().nonempty("You must enter a password"),
});
type LoginParams = z.infer<typeof loginSchema>;
const formOpts = formOptions<LoginParams>({
  defaultValues: {
    email: "",
    password: "",
  },
});

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginParams) => {
      console.log("Login form submit: ", email, password);
      return createAdminSession({ email, password });
    },
    onError: (error) => {
      console.info(`[AuthProvider] Login failed: ${error.message}`);
    },
    onSuccess: (data) => {
      console.info(`[AuthProvider] Login successful! ${data.email} -> ${data.id}`);
      queryClient.setQueryData(["currentUser"], data);
    },
    retry: false,
  });
  const form = useForm({
    ...formOpts,
    validators: {
      onChange: loginSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(value);
    },
  });

  const isBusy = form.state.isSubmitting || mutation.isPending;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Afterhours LLM Administration</CardTitle>
          <CardDescription>
            Enter your credentials below to login to your admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-6">
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
                        placeholder="user@example.com"
                        autoComplete="username"
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
                      <Label htmlFor={field.name}>Password</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        type="password"
                        autoComplete="current-password"
                        required
                        disabled={isBusy}
                      />
                    </>
                  )}
                </form.Field>
              </div>
              <div className="flex flex-col gap-3">
                <form.Subscribe selector={(state) => [state.canSubmit, state.isPristine]}>
                  {([canSubmit, isPristine]) => (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isPristine || isBusy || !canSubmit}
                    >
                      {isBusy ? "Logging in..." : "Login"}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
            {mutation.isError && (
              <div className="bg-destructive mt-4 p-1 rounded text-center text-sm text-destructive-foreground">
                {mutation.error.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
