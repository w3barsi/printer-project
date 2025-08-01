import { Container } from "@/components/layouts/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  downloadCardAttachmentsServerFn,
  getCardAttachmentsServerFn,
  getListCards,
} from "@/server/trello"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import fileSaver from "file-saver"
import JSZip from "jszip"
import { RefreshCwIcon } from "lucide-react"
import { Suspense } from "react"
import { toast } from "sonner"

type ImagesFromCard = {
  src: string
  contentType: string
  name: string
}

export const Route = createFileRoute("/(main)/trello/$listId")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery({
      queryKey: ["listCards", params.listId],
      queryFn: () => getListCards({ data: { listId: params.listId } }),
    })
  },
})

function RouteComponent() {
  return (
    <Container className="flex flex-col">
      <Suspense fallback={<CardListSkeleton />}>
        <CardList />
      </Suspense>
    </Container>
  )
}

function CardListSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Button variant="ghost" size="icon" disabled>
          <RefreshCwIcon className="animate-spin" />
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="pb-0">
            <CardContent>
              <Skeleton className="h-6 w-full" />
            </CardContent>
            <CardFooter className="p-0">
              <Button className="w-full rounded-t-none" disabled>
                <Skeleton className="h-4 w-32" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}

function CardList() {
  const { listId } = Route.useParams()
  const {
    data: cards,
    refetch,
    isRefetching,
  } = useSuspenseQuery({
    queryKey: ["listCards", listId],
    queryFn: () => getListCards({ data: { listId } }),
  })

  const getCardAttachments = useMutation({
    mutationFn: getCardAttachmentsServerFn,
  })

  const downloadCardAttachments = useMutation({
    mutationFn: downloadCardAttachmentsServerFn,
  })

  const getAttachments = async (cardId: string) => {
    const data = await getCardAttachments.mutateAsync({ data: { id: cardId } })
    const i = data.map((d) => ({ url: d.url, name: d.name }))
    const results = await downloadCardAttachments.mutateAsync({ data: i })
    const images: ImagesFromCard[] = results.map((result) => ({
      src: `data:${result.contentType};base64,${result.base64Image}`,
      contentType: result.contentType,
      name: result.name,
    }))

    const zip = new JSZip()

    await Promise.all(
      images.map(async (image) => {
        try {
          const res = await fetch(image.src)
          const blob = await res.blob()
          zip.file(image.name, blob)
          console.log(zip)
        } catch (e) {
          console.log(e)
        }
      }),
    )

    zip.generateAsync({ type: "blob" }).then(function (content) {
      // Use FileSaver.js to trigger the download
      fileSaver.saveAs(content, "attachments.zip")
    })
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">List Cards</h1>

        <Button
          variant="ghost"
          size="icon"
          onClick={async () => await refetch()}
          disabled={isRefetching}
        >
          <RefreshCwIcon className={isRefetching ? "animate-spin" : ""} />
        </Button>
      </div>
      {cards.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="pb-0">
              <CardContent>{card.name}</CardContent>
              <CardFooter className="p-0">
                <Button
                  className="w-full rounded-t-none"
                  onClick={() =>
                    toast.promise(getAttachments(card.id), {
                      loading: "Downloading attachments...",
                      success: "Attachments downloaded successfully!",
                      error: "Error downloading attachments!",
                    })
                  }
                >
                  Download Attachments
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mx-auto">No cards found on this list!</div>
      )}
    </>
  )
}
