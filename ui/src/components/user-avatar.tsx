import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/contexts/auth";
import { cn } from "@/lib/utils";
import { ComponentProps, useMemo } from "react";

export function UserAvatar({
  user,
  className,
  ...props
}: { user: User } & ComponentProps<typeof Avatar>) {
  const { avatarLabel, avatarHash } = useMemo(() => {
    if (!user) return { avatarLabel: "??", avatarHash: "0000000000000000" };
    return {
      avatarLabel: user.name
        .trim()
        .split(" ")
        .map((v) => (v.length > 0 ? v.charAt(0) : ""))
        .join(""),
      avatarHash: user.id,
    };
  }, [user]);

  return (
    <Avatar className={cn("size-8 rounded-lg", className)} {...props}>
      <AvatarImage
        src={`https://api.dicebear.com/9.x/identicon/svg?backgroundColor=eaf1ff&seed=${avatarHash}`}
        alt={user.email}
      />
      <AvatarFallback className="rounded-lg">{avatarLabel}</AvatarFallback>
    </Avatar>
  );
}
