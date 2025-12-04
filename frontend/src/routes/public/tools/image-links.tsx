import SubmitImageLinkForm from "@/components/SubmitImageLinkForm"
import { Button } from "@/components/ui/button"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/public/tools/image-links")({
  component: ImageLinksPage,
})

function ImageLinksPage() {
  const navigate = useNavigate()
  return (
    <div className="w-full p-4 bg-background min-h-screen text-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate({ to: "/google-serp-cms" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tools
      </Button>
      <SubmitImageLinkForm />
    </div>
  )
}
