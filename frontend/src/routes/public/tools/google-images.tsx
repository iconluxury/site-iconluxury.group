import { GoogleImagesForm } from "@/components/GoogleSerpLegacy"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/public/tools/google-images")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  return <GoogleImagesForm />
}
