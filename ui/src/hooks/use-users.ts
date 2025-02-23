import { getUsers } from "@/api";
import { useQuery } from "@tanstack/react-query";

export function useUsers() {
  const query = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  });

  return query;
}
