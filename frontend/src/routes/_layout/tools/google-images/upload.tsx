import { GoogleImagesUploadForm } from "@/components/google-serp/GoogleImagesUploadForm"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tools/google-images/upload")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  const navigate = useNavigate()
  return (
    <div className="bg-background min-h-full">
      <GoogleImagesUploadForm
        onBack={() => navigate({ to: ".." })}
        backLabel="Back to Tools"
      />
    </div>
  )
}
