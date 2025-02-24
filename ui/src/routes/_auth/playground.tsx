import { ChatMessage, Model } from "@/api";
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
import { useEffect, useMemo, useState } from "react";

const DEFAULT_SYSTEM =
  "You are a helpful assistant. Provide succinct and factual responses. If you don't know the answer to something just say, \"I don't know the answer to that\". Don't make up facts.";

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

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="my-4 flex justify-end w-full">
        <div className="py-2 px-4 max-w-[80%] bg-primary text-primary-foreground text-sm rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl rounded-br-xs">
          {msg.message}
        </div>
      </div>
    );
  } else {
    return (
      <div className="my-4 flex w-full">
        <div className="py-2 px-4 max-w-[80%] bg-sidebar-primary text-sidebar-primary-foreground text-sm rounded-tl-2xl rounded-bl-xs rounded-tr-2xl rounded-br-2xl">
          {msg.message}
        </div>
      </div>
    );
  }
}

function ChatInterface({ models }: { models: Model[] }) {
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [temp, setTemp] = useState(0.5);
  const [topP, setTopP] = useState(0.9);
  const [maxLen, setMaxLen] = useState(512);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const modelName = useMemo(() => {
    if (!model) return undefined;
    return models.find((m) => m.id === model)?.name;
  }, [models, model]);

  useEffect(() => {
    console.log("Model change; clearing messages");
    setMessages([]);
  }, [model]);

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6 md:col-span-2">
          <div className="grid gap-3">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
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
            <Textarea
              placeholder="Enter a custom system prompt here..."
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="grid gap-3">
            <div className="flex justify-between items-baseline">
              <Label>Temperature</Label>
              <span className="text-sm italic">{temp}</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[temp]}
              onValueChange={([val]) => setTemp(val)}
              className="w-full"
            />
          </div>
          <div className="grid gap-3">
            <div className="flex justify-between items-baseline">
              <Label>Top P</Label>
              <span className="text-sm italic">{topP}</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[topP]}
              onValueChange={([val]) => setTopP(val)}
              className="w-full"
            />
          </div>
          <div className="grid gap-3">
            <div className="flex justify-between items-baseline">
              <Label>Max generation length</Label>
              <span className="text-sm italic">{maxLen}</span>
            </div>
            <Slider
              min={1}
              max={2048}
              step={1}
              value={[maxLen]}
              onValueChange={([val]) => setMaxLen(val)}
              className="w-full"
            />
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 border border-muted rounded-md">
        <div className="p-4">
          {!model && (
            <div className="flex justify-center">
              <div className="py-2 px-4 rounded-md bg-muted text-muted-foreground text-sm text-center">
                Select a model above to get started!
              </div>
            </div>
          )}
          {model && (
            <div className="flex justify-center">
              <div className="py-2 px-4 rounded-md bg-muted text-muted-foreground text-sm text-center">
                This is the beginning of your chat with {modelName}
              </div>
            </div>
          )}
          <Message
            msg={{
              role: "user",
              message:
                "This is a test user message to see how this thing is working it should look pretty good?",
            }}
          />
          <Message
            msg={{
              role: "assistant",
              message:
                "This is a test assistant message to see how this thing is working it should look pretty good?",
            }}
          />
        </div>
      </ScrollArea>
      <div className="-mb-4 flex gap-4">
        <Textarea placeholder="Enter a message..." className="resize-none" />
        <Button className="h-16 md:text-lg" disabled={!model}>
          <Send className="md:size-6" />
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
