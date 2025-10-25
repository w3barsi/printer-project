import { queryOptions } from "@tanstack/react-query";
import { $fetchAuth } from "./functions";

export const authQueryOptions = () =>
  queryOptions({
    queryKey: ["user"],
    queryFn: ({ signal }) => $fetchAuth({ signal }),
  });

export type AuthQueryResult = Awaited<ReturnType<typeof $fetchAuth>>;
