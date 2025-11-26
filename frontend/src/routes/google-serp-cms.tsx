import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LuCrop,
  LuDatabase,
  LuImage,
  LuLink,
} from "react-icons/lu"

export const Route = createFileRoute("/google-serp-cms")({
  component: GoogleSerpCmsPage,
})

function GoogleSerpCmsPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google SERP CMS</h1>
          <p className="text-muted-foreground">
            Access all scraping and data tools from one place.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Google Images Tool */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LuImage className="h-6 w-6 text-primary" />
              <CardTitle>Google Images</CardTitle>
            </div>
            <CardDescription>
              Scrape images from Google Search results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/_layout/tools/google-images">Open Tool</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Data Warehouse Tool */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LuDatabase className="h-6 w-6 text-primary" />
              <CardTitle>Data Warehouse</CardTitle>
            </div>
            <CardDescription>
              Manage and process data warehouse entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/_layout/tools/data-warehouse">Open Tool</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Image Links Tool */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LuLink className="h-6 w-6 text-primary" />
              <CardTitle>Image Links</CardTitle>
            </div>
            <CardDescription>
              Process and validate image links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/_layout/tools/image-links">Open Tool</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Crop Tool */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LuCrop className="h-6 w-6 text-primary" />
              <CardTitle>Crop Tool</CardTitle>
            </div>
            <CardDescription>
              Crop and adjust images for production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/_layout/tools/crop">Open Tool</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
