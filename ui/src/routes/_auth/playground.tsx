import { ChatInterface } from "@/components/chat-interface";
import { Skeleton } from "@/components/ui/skeleton";
import { useModels } from "@/hooks/use-models";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/playground")({
  component: ModelPlayground,
  staticData: {
    breadcrumbLabel: "Model Playground",
  },
});

function Loading() {
  return (
    <>
      <Skeleton className="h-20" />
      <Skeleton className="flex-1" />
      <Skeleton className="h-24" />
    </>
  );
}

function ModelPlayground() {
  const { isPending, isError, data, error } = useModels();

  return (
    <>
      <section className="typography">
        <h1>Playground</h1>
        <p>
          Use the chat interface below to play around with the LLMs available through the{" "}
          <em>LLM Service&apos;s</em> API.
        </p>
      </section>
      <section className="flex-1 mt-10">
        {isPending && <Loading />}
        {isError && (
          <div className="p-4 rounded-xl bg-destructive text-destructive-foreground text-center">
            {`Unable to retrieve model list: ${error.message}`}
          </div>
        )}
        {data && <ChatInterface models={data.models} />}
      </section>
    </>
  );
}
