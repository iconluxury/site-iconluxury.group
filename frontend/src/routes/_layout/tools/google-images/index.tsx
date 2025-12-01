import LogsGSerp from "@/components/LogsGSerp"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tools/google-images/")({
  component: GoogleImagesIndex,
})

function GoogleImagesIndex() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Google Images Tool</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Scrape images from Google Search results.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <LogsGSerp />
        </CardContent>
      </Card>
      <Button asChild>
        <Link to="/tools/google-images/upload">Go to Upload</Link>
      </Button>
    </div>
  )
}
