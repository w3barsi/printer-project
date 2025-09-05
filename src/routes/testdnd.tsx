import { Container } from "@/components/layouts/container";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createFileRoute } from "@tanstack/react-router";
import { useId, type ComponentPropsWithRef } from "react";

export const Route = createFileRoute("/testdnd")({
  component: RouteComponent,
});

function RouteComponent() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );

  return (
    <Container className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        onDragStart={(event) => console.log("Drag started", event)}
        onDragEnd={(event) => console.log("Drag ended", event)}
        onDragOver={(event) => console.log("Drag over", event.over, event.active)}
      >
        <Draggable />
        <Droppable></Droppable>
      </DndContext>
    </Container>
  );
}

function Draggable() {
  const id = useId();
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
  } = useDraggable({
    id: `${id}-drag`,
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
  };
  return (
    <div
      style={style}
      ref={setDraggableRef}
      className="h-24 w-24 bg-red-200 select-none"
      {...listeners}
      {...attributes}
    >
      Draggable
    </div>
  );
}

function Droppable() {
  const id = useId();
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `${id}-drop`,
  });

  return (
    <div ref={setDroppableRef} className="h-24 w-24 bg-blue-200 select-none">
      Droppable
    </div>
  );
}

function Wrapper({ className }: ComponentPropsWithRef<"div">) {}
