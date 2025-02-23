import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./contexts/auth";
import { useAuth } from "./hooks/use-auth";
import "./index.css";
import { routeTree } from "./routeTree.gen";

// Create a query client
const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({ routeTree, context: { auth: undefined! } });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    breadcrumbLabel?: string;
  }

  interface Register {
    router: typeof router;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  const auth = useAuth();
  const [isInvalidating, setIsInvalidating] = useState(false);

  useEffect(() => {
    console.log("Main app useEffect fired with auth:", auth);
    if (!isInvalidating) {
      console.log("Invalidating router");
      setIsInvalidating(true);
      router
        .invalidate()
        .then(() => setIsInvalidating(false))
        .catch(() => setIsInvalidating(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  return <RouterProvider router={router} context={{ auth }} />;
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
} else {
  console.error("Root mount point is not empty!");
}
