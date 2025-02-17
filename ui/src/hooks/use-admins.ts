import { getAdmins } from "@/api";
import { useQuery } from "@tanstack/react-query";

export function useAdmins() {
  const query = useQuery({
    queryKey: ["admins"],
    queryFn: getAdmins,
    staleTime: 5 * 60 * 1000,
  });

  return query;
}
