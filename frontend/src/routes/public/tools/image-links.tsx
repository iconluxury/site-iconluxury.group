import { createFileRoute } from "@tanstack/react-router"
import SubmitImageLinkForm from "@/components/SubmitImageLinkForm"

export const Route = createFileRoute("/public/tools/image-links")({
  component: ImageLinksPage,
})

function ImageLinksPage() {
  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
      <SubmitImageLinkForm />
    </div>
  )
}
