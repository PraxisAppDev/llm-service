import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const auth = useAuth();
  const router = useRouter();
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  // const navigate = Route.useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const onFormSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    setLoginError("");

    try {
      evt.preventDefault();
      evt.stopPropagation();
      const data = new FormData(evt.currentTarget);
      const email = data.get("email")?.toString();
      const password = data.get("password")?.toString();

      console.log("Login form submit: ", email, password);

      if (!email || !password) return;

      const result = await auth.login({ email, password });

      if (result.ok) {
        await router.invalidate();
        await router.navigate({ to: "/" }); // TODO change this to the redirect prop
      } else {
        setLoginError(result.error || "Unknown error!");
      }
    } catch (e) {
      console.error("Error logging in: ", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isLoading || isSubmitting;

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
          <form onSubmit={onFormSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="mail@example.com"
                  autoComplete="username"
                  required
                  disabled={isBusy}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isBusy}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isBusy}>
                  {isBusy ? "Loading..." : "Login"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-destructive">
              {loginError}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
