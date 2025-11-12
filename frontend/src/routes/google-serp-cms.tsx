import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/google-serp-cms')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/google-serp-cms"!</div>
}
