import { DataWarehouseForm } from "@/components/google-serp/DataWarehouseForm"
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
      <DataWarehouseForm mode="imagesAndMsrp" />
    </JobsDashboard>
  )
}
