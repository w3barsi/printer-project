import { queryOptions } from "@tanstack/react-query";
import { $fetchAuth } from "./functions";

export const authQueryOptions = () =>
  queryOptions({
    queryKey: ["user"],
    queryFn: ({ signal }) => $fetchAuth({ signal }),
    staleTime: 1 * 60,
  });

export type AuthQueryResult = Awaited<ReturnType<typeof $fetchAuth>>;
