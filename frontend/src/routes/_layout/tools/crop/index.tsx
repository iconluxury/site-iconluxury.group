import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/_layout/tools/crop/")({
  component: CropToolIndex,
})

function CropToolIndex() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Crop Tool</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This tool allows you to crop and adjust images for production.</p>
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
        <Link to="/tools/crop/upload">Go to Upload</Link>
      </Button>
    </div>
  )
}
