import { Container } from "@/components/layouts/container";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(main)/testtrello")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useQuery(convexQuery(api.trello.getJosWithTrelloId, {}));
  return (
    <Container>
      {data?.map((jo) => (
        <div key={jo._id}>
          {jo.name} | {jo.trelloId}|{" "}
          <Button onClick={() => console.log(jo._id)}>Delete</Button>
        </div>
      ))}
    </Container>
  );
}
