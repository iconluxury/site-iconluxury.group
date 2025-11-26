import { createFileRoute } from "@tanstack/react-router"
import { GoogleImagesForm } from "@/components/GoogleSerpLegacy"

export const Route = createFileRoute("/_layout/tools/google-images")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  return <GoogleImagesForm />
}
