import { createFileRoute } from "@tanstack/react-router"
import SubmitCropForm from "../components/SubmitCropForm"

export const Route = createFileRoute("/submit-crop")({
  component: SubmitCropForm,
})
