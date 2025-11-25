import { createFileRoute } from "@tanstack/react-router"
import JobsDashboard from "../../components/JobsDashboard"

export const Route = createFileRoute("/_layout/")({
  component: JobsDashboard,
})
