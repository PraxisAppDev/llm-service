import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/playground")({
  component: ModelPlayground,
  staticData: {
    breadcrumbLabel: "Model Playground",
  },
});

function ModelPlayground() {
  return (
    <>
      <section className="typography">
        <h1>Playground</h1>
        <p>
          Use the chat interface below to play around with the LLMs available through the{" "}
          <em>LLM Service&apos;s</em> API.
        </p>
      </section>
    </>
  );
}
