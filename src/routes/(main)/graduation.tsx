import { CreateSchoolDialog } from "@/components/graduation/create-school-dialog";
import { Container } from "@/components/layouts/container";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(main)/graduation")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Container>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Graduation Sablays and Sashes</h1>
        <CreateSchoolDialog />
      </div>
    </Container>
  );
}
