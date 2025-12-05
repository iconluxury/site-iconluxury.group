import SubmitCropForm from "@/components/SubmitCropForm"
import { Button } from "@/components/ui/button"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/public/tools/crop")({
  component: CropPage,
})

function CropPage() {
  const navigate = useNavigate()
  return (
    <div className="w-full p-4 bg-background min-h-screen text-foreground">
      <SubmitCropForm
        onBack={() => navigate({ to: "/google-serp-cms" })}
      />
    </div>
  )
}
