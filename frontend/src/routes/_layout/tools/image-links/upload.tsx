import { createFileRoute, useNavigate } from "@tanstack/react-router"
import SubmitImageLinkForm from "../../../../components/SubmitImageLinkForm"

export const Route = createFileRoute("/_layout/tools/image-links/upload")({
  component: ImageLinksPage,
})

function ImageLinksPage() {
  const navigate = useNavigate()
  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
      <SubmitImageLinkForm onBack={() => navigate({ to: ".." })} />
    </div>
  )
}
