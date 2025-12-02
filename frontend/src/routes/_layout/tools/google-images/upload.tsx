import { DataWarehouseForm } from "@/components/google-serp/DataWarehouseForm"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tools/google-images/upload")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  const navigate = useNavigate()
  return (
    <div className="bg-background min-h-full">
      <DataWarehouseForm
        mode="imagesAndMsrp"
        onBack={() => navigate({ to: ".." })}
        backLabel="Back to Tools"
      />
    </div>
  )
}
