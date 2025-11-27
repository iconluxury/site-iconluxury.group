import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/_layout/tools/data-warehouse/")({
  component: DataWarehouseIndex,
})

function DataWarehouseIndex() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Data Warehouse Tool</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Manage and process data warehouse entries.</p>
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
        <Link to="/tools/data-warehouse/upload">Go to Upload</Link>
      </Button>
    </div>
  )
}
