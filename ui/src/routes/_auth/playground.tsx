import { Model } from "@/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useModels } from "@/hooks/use-models";
import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";

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

function ChatInterface({ models }: { models: Model[] }) {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6 md:col-span-2">
          <div className="grid gap-3">
            <Label>Model</Label>
            <Select>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                  >{`[${model.provider}] ${model.name}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label>System prompt</Label>
            <Textarea placeholder="Enter a custom system prompt here..." />
          </div>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="grid gap-3">
            <Label>Temperature</Label>
            <Slider min={0} max={1} step={0.01} defaultValue={[0.5]} className="w-full" />
          </div>
          <div className="grid gap-3">
            <Label>Top P</Label>
            <Slider min={0} max={1} step={0.01} defaultValue={[0.9]} className="w-full" />
          </div>
          <div className="grid gap-3">
            <Label>Max generation length</Label>
            <Slider min={1} max={2048} step={1} defaultValue={[512]} className="w-full" />
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 border border-muted rounded-md">
        <div className="p-4">Chat area</div>
      </ScrollArea>
      <div className="-mb-4 flex gap-4">
        <Textarea placeholder="Enter a message..." />
        <Button className="h-16 text-lg">
          <Send className="size-4" />
          Send
        </Button>
      </div>
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
      <section className="flex-1 flex flex-col gap-6 mt-10">
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
