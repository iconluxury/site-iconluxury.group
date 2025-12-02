import JobsDashboard from "@/components/JobsDashboard"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tools/google-images/")({
  component: GoogleImagesIndex,
})

function GoogleImagesIndex() {
  return <JobsDashboard filterTypeId={1} />
}
