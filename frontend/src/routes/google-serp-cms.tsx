import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { showDevUI } from "@/utils"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  LuCrop,
  LuDatabase,
  LuEraser,
  LuFileText,
  LuImage,
  LuLink,
  LuSearch,
  LuWand2,
} from "react-icons/lu"
import { useIframeEmail } from "../hooks/useIframeEmail"

export const Route = createFileRoute("/google-serp-cms")({
  component: GoogleSerpCmsPage,
})

function GoogleSerpCmsPage() {
  const iframeEmail = useIframeEmail()
  const searchParams = iframeEmail ? { sendToEmail: iframeEmail } : {}

  return (
    <div className="p-8 space-y-8">
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
              <Link to="/public/tools/google-images" search={searchParams}>
                Open Tool
              </Link>
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
              <Link to="/public/tools/data-warehouse" search={searchParams}>
                Open Tool
              </Link>
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
            <CardDescription>Process and validate image links.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/public/tools/image-links" search={searchParams}>
                Open Tool
              </Link>
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
              <Link to="/public/tools/crop" search={searchParams}>
                Open Tool
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Background Remover (Locked) */}
        <Card
          className="cursor-not-allowed bg-muted border-border text-muted-foreground"
          aria-disabled
        >
          <CardHeader>
            <div className="flex flex-row items-center gap-2">
              <LuEraser
                className="h-6 w-6 text-muted-foreground"
                strokeWidth={1.5}
              />
              <CardTitle className="text-xl font-semibold">
                Background remover
              </CardTitle>
              {showDevUI() && (
                <Badge variant="destructive" className="ml-auto">
                  DEV
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p>Remove image backgrounds. (Nano Banana)</p>
          </CardContent>
        </Card>

        {/* Image Generator (Locked) */}
        <Card
          className="cursor-not-allowed bg-muted border-border text-muted-foreground"
          aria-disabled
        >
          <CardHeader>
            <div className="flex flex-row items-center gap-2">
              <LuWand2
                className="h-6 w-6 text-muted-foreground"
                strokeWidth={1.5}
              />
              <CardTitle className="text-xl font-semibold">
                Image generator
              </CardTitle>
              {showDevUI() && (
                <Badge variant="destructive" className="ml-auto">
                  DEV
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-1">
              <p>
                Generate studio-style product photos from reference shots. (Nano
                Banana)
              </p>
              <p className="font-semibold">Convert:</p>
              <p className="m-0 p-0 pl-0 whitespace-nowrap">
                <span className="mx-2">•</span>
                Lifestyle shots <span className="mx-2">•</span> Mockups/CAD
                <span className="mx-2">•</span> Low‑quality product photos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reverse Image Search (Locked) */}
        <Card
          className="cursor-not-allowed bg-muted border-border text-muted-foreground"
          aria-disabled
        >
          <CardHeader>
            <div className="flex flex-row items-center gap-2">
              <LuSearch
                className="h-6 w-6 text-muted-foreground"
                strokeWidth={1.5}
              />
              <CardTitle className="text-xl font-semibold">
                Reverse Image Search
              </CardTitle>
              {showDevUI() && (
                <Badge variant="destructive" className="ml-auto">
                  DEV
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p>Search for images using an image as a query.</p>
          </CardContent>
        </Card>

        {/* PDF Transform Tool (Locked) */}
        <Card
          className="cursor-not-allowed bg-muted border-border text-muted-foreground"
          aria-disabled
        >
          <CardHeader>
            <div className="flex flex-row items-center gap-2">
              <LuFileText
                className="h-6 w-6 text-muted-foreground"
                strokeWidth={1.5}
              />
              <CardTitle className="text-xl font-semibold">
                PDF Transform
              </CardTitle>
              {showDevUI() && (
                <Badge variant="destructive" className="ml-auto">
                  DEV
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p>Convert and transform PDF documents.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
