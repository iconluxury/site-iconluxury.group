import { createFileRoute } from "@tanstack/react-router"
import SubmitCropForm from "../../../../components/SubmitCropForm"

export const Route = createFileRoute("/_layout/tools/crop/upload")({
  component: CropPage,
})

function CropPage() {
  return (
    <div className="container mx-auto max-w-7xl p-4 bg-white text-black">
      <SubmitCropForm />
    </div>
  )
}
