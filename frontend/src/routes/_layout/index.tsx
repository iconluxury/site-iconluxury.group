import JobsDashboard from "../../components/JobsDashboard"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/")({
  component: JobsDashboard,
})
