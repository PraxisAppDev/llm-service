import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sha256 } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Ellipsis } from "lucide-react";
import { ComponentProps } from "react";

export function UserAvatar({
  userId,
  userName,
  className,
  ...props
}: { userId: string; userName: string } & ComponentProps<typeof Avatar>) {
  const { isPending, isError, data } = useQuery({
    queryKey: ["userAvatar", userId],
    queryFn: async () => {
      const hash = await sha256(userId);
      const label = userName
        .trim()
        .split(" ")
        .map((v) => (v.length > 0 ? v.charAt(0) : ""))
        .join("");

      return { hash, label };
    },
    staleTime: Infinity,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (isPending) {
    return (
      <span
        className={cn(
          "flex justify-center items-center bg-accent text-accent-foreground size-8 rounded-lg shrink-0 overflow-hidden",
          className,
        )}
        {...props}
      >
        <Ellipsis className="size-4" />
      </span>
    );
  } else if (isError) {
    return (
      <span
        className={cn(
          "flex justify-center items-center bg-destructive text-destructive-foreground size-8 rounded-lg shrink-0 overflow-hidden",
          className,
        )}
        {...props}
      >
        <CircleAlert className="size-4" />
      </span>
    );
  }

  return (
    <Avatar className={cn("size-8 rounded-lg", className)} {...props}>
      <AvatarImage
        src={`https://api.dicebear.com/9.x/identicon/svg?backgroundColor=eaf1ff&seed=${data.hash}`}
        alt={userName}
      />
      <AvatarFallback className="rounded-lg">{data.label}</AvatarFallback>
    </Avatar>
  );
}
