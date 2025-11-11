import { createFileRoute } from "@tanstack/react-router";
import SubmitImageLinkForm from "../../components/SubmitImageLinkForm";

export const Route = createFileRoute("/_layout/submit-image-link")({
  component: SubmitImageLinkForm,
});
