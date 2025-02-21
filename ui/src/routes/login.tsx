import { LoginForm } from "@/components/login-form";
import { Route as indexRoute } from "@/routes/_auth/index";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context, search }) => {
    if (context.auth.user) {
      // already logged in
      console.log(`[Login] User is logged in! Redirecting to ${search.redirect}`);

      throw redirect({ to: search.redirect || indexRoute.to });
    }
  },
  validateSearch: z.object({
    redirect: z.string().optional().catch(indexRoute.to),
  }),
  component: Login,
});

function Login() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
