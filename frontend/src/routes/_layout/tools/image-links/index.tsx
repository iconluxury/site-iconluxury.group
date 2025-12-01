import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tools/image-links/")({
  component: ImageLinksIndex,
})

function ImageLinksIndex() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Image Links Tool</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Process and validate image links.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No history available.</p>
        </CardContent>
      </Card>
      <Button asChild>
        <Link to="/tools/image-links/upload">Go to Upload</Link>
      </Button>
    </div>
  )
}
