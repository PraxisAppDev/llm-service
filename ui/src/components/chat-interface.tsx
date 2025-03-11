import { ChatMessage, ChatReq, getChatCompletion, Model } from "@/api";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { formOptions, useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { BrainCircuit, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const DEFAULT_SYSTEM =
  "You are a helpful assistant. Provide succinct and factual responses. If you don't know the answer to something just say, \"I don't know the answer to that\". Don't make up facts.";

const chatInputSchema = z.object({
  model: z.string().nonempty("Must select a model"),
  system: z.string().nonempty("System prompt must not be empty"),
  temperature: z.number().min(0, "Temperature must be >= 0").max(1, "Temperature must be <= 1"),
  topP: z.number().min(0, "Top P must be >= 0").max(1, "Top P must be <= 1"),
  maxGenLen: z
    .number()
    .min(1, "Max generation length must be > 0")
    .max(2048, "Max generation length must be <= 2048"),
  userInput: z.string().nonempty("Message must not be empty"),
});
type ChatInputs = z.infer<typeof chatInputSchema>;

function Thinking() {
  return (
    <div className="my-4 flex w-full">
      <div className="animate-pulse py-2 px-4 max-w-[80%] bg-sidebar-primary text-sidebar-primary-foreground text-sm rounded-tl-2xl rounded-bl-xs rounded-tr-2xl rounded-br-2xl">
        <BrainCircuit />
      </div>
    </div>
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

const formOpts = formOptions({
  defaultValues: {
    model: "",
    system: DEFAULT_SYSTEM,
    temperature: 0.5,
    topP: 0.9,
    maxGenLen: 512,
    userInput: "",
  } as ChatInputs,
});

export function ChatInterface({ models }: { models: Model[] }) {
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const mutation = useMutation({
    mutationKey: ["chatCompletion"],
    mutationFn: (req: ChatReq) => {
      return getChatCompletion(req);
    },
    onError: (error) => {
      console.error(`Chat completion failed: ${error.message}`);
      toast.error("Chat completion failed ☹️");
    },
    onSuccess: (data) => {
      console.info("Chat completion successful!", data);
      const nMessages = messages.slice();
      nMessages.push({ role: "assistant", message: data.generation.trim() });
      setMessages(nMessages);
    },
  });
  const form = useForm({
    ...formOpts,
    validators: {
      onChange: chatInputSchema,
    },
    onSubmit: ({ value, formApi }) => {
      const nMessages = messages.slice();
      nMessages.push({ role: "user", message: value.userInput });
      setMessages(nMessages);

      const req = {
        ...value,
        messages: nMessages,
        userInput: undefined,
      };

      mutation.mutate(req);
      formApi.setFieldValue("userInput", "");
    },
  });
  const modelName = useMemo(() => {
    if (model === "") return undefined;
    return models.find((m) => m.id === model)?.name;
  }, [models, model]);

  useEffect(() => {
    console.log("Model change; clearing messages");
    setMessages([]);
  }, [model]);

  const isBusy = form.state.isSubmitting || mutation.isPending;

  return (
    <form
      id="chat"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="h-full flex flex-col gap-6"
    >
      <div className="grid md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6 md:col-span-2">
          <div className="grid gap-3">
            <form.Field name="model">
              {(field) => (
                <>
                  <Label htmlFor={field.name}>Model</Label>
                  <Select
                    name={field.name}
                    value={field.state.value}
                    onValueChange={(v) => {
                      setModel(v);
                      field.handleChange(v);
                    }}
                    disabled={isBusy}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {`[${model.provider}] ${model.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </form.Field>
          </div>
          <div className="grid gap-3">
            <form.Field name="system">
              {(field) => (
                <>
                  <Label htmlFor={field.name}>System prompt</Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter a custom system prompt here..."
                    className="resize-none"
                    disabled={isBusy}
                  />
                </>
              )}
            </form.Field>
          </div>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="grid gap-3">
            <form.Field name="temperature">
              {(field) => (
                <>
                  <div className="flex justify-between items-baseline">
                    <Label htmlFor={field.name}>Temperature</Label>
                    <span className="text-sm italic">{field.state.value}</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    name={field.name}
                    value={[field.state.value]}
                    onValueChange={([val]) => field.handleChange(val)}
                    className="w-full"
                    disabled={isBusy}
                  />
                </>
              )}
            </form.Field>
          </div>
          <div className="grid gap-3">
            <form.Field name="topP">
              {(field) => (
                <>
                  <div className="flex justify-between items-baseline">
                    <Label htmlFor={field.name}>Top P</Label>
                    <span className="text-sm italic">{field.state.value}</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    name={field.name}
                    value={[field.state.value]}
                    onValueChange={([val]) => field.handleChange(val)}
                    className="w-full"
                    disabled={isBusy}
                  />
                </>
              )}
            </form.Field>
          </div>
          <div className="grid gap-3">
            <form.Field name="maxGenLen">
              {(field) => (
                <>
                  <div className="flex justify-between items-baseline">
                    <Label htmlFor={field.name}>Max generation length</Label>
                    <span className="text-sm italic">{field.state.value}</span>
                  </div>
                  <Slider
                    min={1}
                    max={2048}
                    step={1}
                    name={field.name}
                    value={[field.state.value]}
                    onValueChange={([val]) => field.handleChange(val)}
                    className="w-full"
                    disabled={isBusy}
                  />
                </>
              )}
            </form.Field>
          </div>
        </div>
      </div>
      <ScrollArea className="h-[438px] border border-muted rounded-md">
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
          {messages.map((msg, idx) => (
            <Message key={`${idx}-${msg.role}`} msg={msg} />
          ))}
          {isBusy && <Thinking />}
          {/* <Message
            msg={{
              role: "user",
              message:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
            }}
          />
          <Message
            msg={{
              role: "assistant",
              message:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
            }}
          />
          <Message
            msg={{
              role: "user",
              message:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
            }}
          /> */}
        </div>
      </ScrollArea>
      <div className="-mb-4 flex gap-4">
        <form.Field name="userInput">
          {(field) => (
            <Textarea
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter a message..."
              className="resize-none"
              disabled={isBusy}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isPristine]}>
          {([canSubmit, isPristine]) => (
            <Button className="h-16 md:text-lg" disabled={isPristine || !canSubmit}>
              {isBusy ? (
                <Loader2 className="animate-spin md:size-6" />
              ) : (
                <Send className="md:size-6" />
              )}
              Send
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
