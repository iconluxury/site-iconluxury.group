import JobsDashboard from "@/components/JobsDashboard"
import { GoogleImagesUploadForm } from "@/components/google-serp/GoogleImagesUploadForm"
import { Button } from "@/components/ui/button"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/public/tools/google-images")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col bg-background min-h-screen text-foreground">
      <div className="pt-4 pb-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/google-serp-cms" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Button>
      </div>
      <JobsDashboard
        filterTypeId={1}
        showChangelog={false}
        showToolsShortcuts={false}
        showWelcome={false}
        showMetrics={false}
      >
        <GoogleImagesUploadForm />
      </JobsDashboard>
    </div>
  )
}
