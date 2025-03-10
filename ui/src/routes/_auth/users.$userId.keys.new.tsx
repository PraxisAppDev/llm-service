import { createUserKey } from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUsers } from "@/hooks/use-users";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, formatISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_auth/users/$userId/keys/new")({
  component: CreateKey,
});

const createKeySchema = z.object({
  keyExpiresAt: z
    .string()
    .datetime({ message: "Key expires at must be a valid ISO 8601 datetime", offset: true }),
});
type CreateKeyParams = z.infer<typeof createKeySchema>;

function CreateKey() {
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const goBack = useCallback(() => {
    setTimeout(() => void navigate({ from: Route.fullPath, to: "../../..", replace: true }), 150);
  }, [navigate]);
  const [open, setOpen] = useState(true);
  const [expires, setExpires] = useState<Date | undefined>(undefined);
  const { data } = useUsers();
  const [validParams, user] = useMemo(() => {
    if (!data) return [undefined, undefined];
    const user = data.users.find((u) => u.id === userId);
    if (!user) {
      return [false, undefined];
    }
    return [true, user];
  }, [userId, data]);
  const mutation = useMutation({
    mutationKey: ["createUserKey"],
    mutationFn: (params: CreateKeyParams) => {
      return createUserKey(userId, params);
    },
    onError: (error) => {
      console.error(`Create user key failed: ${error.message}`);
    },
    onSuccess: (data) => {
      console.info(`Create user key successful! ${userId} -> ${data.id}`);
      toast.success("New API key created successfully!");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      goBack();
    },
  });
  const form = useForm<CreateKeyParams>({
    defaultValues: {
      keyExpiresAt: "",
    },
    validators: {
      onChange: createKeySchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(value);
    },
  });

  if (!data || validParams === undefined) return null;

  if (!validParams || !user) {
    // invalid user
    return (
      <AlertDialog
        defaultOpen
        onOpenChange={(open) => {
          if (!open) goBack();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid action</AlertDialogTitle>
            <AlertDialogDescription>The selected API user does not exist.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const isBusy = form.state.isSubmitting || mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) goBack();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new API key</DialogTitle>
          <DialogDescription>
            Create a new API key for user{" "}
            <span className="font-semibold text-foreground">
              {user.name} &lt;{user.email}&gt;
            </span>
            . Their new API key will be emailed to them automatically!
          </DialogDescription>
        </DialogHeader>
        <form
          id="newuserform"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <form.Field name="keyExpiresAt">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>API key expiration</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expires && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expires ? format(expires, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={expires}
                          onSelect={(date) => {
                            if (!date) return;
                            setExpires(date);

                            field.handleChange(formatISO(date));
                          }}
                          disabled={(date) => date < addDays(new Date(), 1)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      type="hidden"
                      required
                      disabled
                    />
                  </>
                )}
              </form.Field>
            </div>
          </div>
          {mutation.isError && (
            <div className="bg-destructive mt-4 p-1 rounded text-center text-sm text-destructive-foreground">
              {mutation.error.message}
            </div>
          )}
        </form>
        <DialogFooter>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isPristine]}>
            {([canSubmit, isPristine]) => (
              <Button
                type="submit"
                form="newuserform"
                disabled={isPristine || isBusy || !canSubmit}
              >
                {isBusy ? "Creating..." : "Create"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
