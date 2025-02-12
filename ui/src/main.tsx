import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

console.log(`Got API root: ${import.meta.env.VITE_LLMSVC_API_ROOT}`);

// Import the generated route tree
import { AuthProvider } from "./contexts/auth";
import { useAuth } from "./hooks";
import { routeTree } from "./routeTree.gen";

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

function App() {
  const auth = useAuth();
  console.log("Main app render", auth);
  return <RouterProvider router={router} context={{ auth }} />;
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
} else {
  console.error("Root mount point is not empty!");
}
