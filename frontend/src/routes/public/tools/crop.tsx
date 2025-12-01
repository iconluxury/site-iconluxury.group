import SubmitCropForm from "@/components/SubmitCropForm"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/public/tools/crop")({
  component: CropPage,
})

function CropPage() {
  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
      <SubmitCropForm />
    </div>
  )
}
