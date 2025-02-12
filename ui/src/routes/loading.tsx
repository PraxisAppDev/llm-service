import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/loading")({
  component: Loading,
});

function Loading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex flex-col items-center gap-4 w-full">
        <h1 className="text-6xl text-center tracking-widest">
          Praxis Afterhours
        </h1>
        <h2 className="text-4xl text-center tracking-widest italic">
          LLM Service
        </h2>
        <LoaderCircle className="animate-spin" size={48} />
      </div>
    </div>
  );
}
