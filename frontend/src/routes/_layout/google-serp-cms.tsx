import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { useIframeEmail } from "../../hooks/useIframeEmail"

export const Route = createFileRoute("/_layout/google-serp-cms")({
  component: GoogleSerpCmsPage,
})

function GoogleSerpCmsPage() {
  const iframeEmail = useIframeEmail()
  const searchParams = iframeEmail ? { sendToEmail: iframeEmail } : {}

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Google Images Tool */}
        <Link to="/public/tools/google-images" search={searchParams} className="block h-full">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LuImage className="h-6 w-6 text-primary" />
                <CardTitle>Google Images</CardTitle>
              </div>
              <CardDescription>
                Scrape images from Google Search results.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Data Warehouse Tool */}
        <Link to="/public/tools/data-warehouse" search={searchParams} className="block h-full">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LuDatabase className="h-6 w-6 text-primary" />
                <CardTitle>Data Warehouse</CardTitle>
              </div>
              <CardDescription>
                Manage and process data warehouse entries.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Image Links Tool */}
        <Link to="/public/tools/image-links" search={searchParams} className="block h-full">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LuLink className="h-6 w-6 text-primary" />
                <CardTitle>Image Links</CardTitle>
              </div>
              <CardDescription>Process and validate image links.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Crop Tool */}
        <Link to="/public/tools/crop" search={searchParams} className="block h-full">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LuCrop className="h-6 w-6 text-primary" />
                <CardTitle>Crop Tool</CardTitle>
              </div>
              <CardDescription>
                Crop and adjust images for production.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Coming Soon */}
        <Card className="bg-muted/50 border-dashed h-full">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>New tools currently in development.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <LuEraser className="h-5 w-5" />
              <span>Background Remover</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <LuWand2 className="h-5 w-5" />
              <span>Image Generator</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <LuSearch className="h-5 w-5" />
              <span>Reverse Image Search</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <LuFileText className="h-5 w-5" />
              <span>PDF Transform</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
