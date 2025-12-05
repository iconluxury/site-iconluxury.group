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
      <SubmitImageLinkForm
        onBack={() => navigate({ to: "/google-serp-cms" })}
      />
    </div>
  )
}
