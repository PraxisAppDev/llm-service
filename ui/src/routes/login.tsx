import { LoginForm } from "@/components/login-form";
import { Route as indexRoute } from "@/routes/_auth.index";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().default(indexRoute.to),
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
