import { GoogleImagesForm } from "@/components/GoogleSerpLegacy"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tools/google-images")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  return <GoogleImagesForm />
}
