import { getModels } from "@/api";
import { useQuery } from "@tanstack/react-query";

export function useModels() {
  const query = useQuery({
    queryKey: ["models"],
    queryFn: getModels,
    staleTime: 5 * 60 * 1000,
  });

  return query;
}
