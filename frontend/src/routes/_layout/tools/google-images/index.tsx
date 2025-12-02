import JobsDashboard from "@/components/JobsDashboard"
import { Button } from "@/components/ui/button"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/_layout/tools/google-images/")({
  component: GoogleImagesIndex,
})

function GoogleImagesIndex() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col">
      <div className="px-8 pt-8 pb-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      <JobsDashboard filterTypeId={1} showWelcome={false} showToolsShortcuts={false} />
    </div>
  )
}
