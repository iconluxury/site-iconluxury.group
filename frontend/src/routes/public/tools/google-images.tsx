import { GoogleImagesUploadForm } from "@/components/google-serp/GoogleImagesUploadForm"
import JobsDashboard from "@/components/JobsDashboard"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/public/tools/google-images")({
  component: GoogleImagesPage,
})

function GoogleImagesPage() {
  return (
    <JobsDashboard
      filterTypeId={1}
      showChangelog={false}
      showToolsShortcuts={false}
      showWelcome={false}
      showMetrics={false}
    >
      <GoogleImagesUploadForm />
    </JobsDashboard>
  )
}
