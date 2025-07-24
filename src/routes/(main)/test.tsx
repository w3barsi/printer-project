import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "@convex/_generated/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { Suspense, useState } from "react"

export const Route = createFileRoute("/(main)/test")({
  component: RouteComponent,
})

function TestComponent() {
  const [page, setPage] = useState(1)
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.jo.getWithPages, { page }),
  )

  const { page: jos, total } = data
  const hasMore = total > page * 10

  return (
    <>
      {jos.map((jo) => (
        <div key={jo._id} className="flex gap-4 border-b">
          <span>{jo.joNumber}</span>
          <span>{jo.name}</span>
        </div>
      ))}

      <div className="mx-auto flex gap-2 pt-4">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ArrowLeftIcon />
          Prev
        </Button>
        <Button disabled={!hasMore} onClick={() => setPage(page + 1)}>
          Next
          <ArrowRightIcon />
        </Button>
      </div>
    </>
  )
}

function RouteComponent() {
  return (
    <Container className="flex flex-col">
      <Suspense fallback="loading">
        <TestComponent />
      </Suspense>
    </Container>
  )
}
