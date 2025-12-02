import { GoogleImagesForm } from "@/components/GoogleSerpLegacy"
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
      <GoogleImagesForm />
    </JobsDashboard>
  )
}
