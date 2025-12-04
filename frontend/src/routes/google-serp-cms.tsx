import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
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
import { OpenAPI } from "../client"
import { useIframeEmail } from "../hooks/useIframeEmail"

export const Route = createFileRoute("/google-serp-cms")({
  component: GoogleSerpCmsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      environment: search.environment as string | undefined,
    }
  },
})

function GoogleSerpCmsPage() {
  const { theme, setTheme } = useTheme()
  const iframeEmail = useIframeEmail()
  const { environment } = Route.useSearch()

  useEffect(() => {
    if (environment === "dev") {
      const devUrl = "https://dev-external.iconluxury.today"
      OpenAPI.BASE = devUrl
    }
  }, [environment])

  const searchParams = {
    ...(iframeEmail ? { sendToEmail: iframeEmail } : {}),
    ...(environment === "dev" ? { environment: "dev" } : {}),
  }

  return (
    <div className="bg-background min-h-screen text-foreground p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {environment === "dev" && (
            <Card className="bg-yellow-100 border-yellow-400 text-yellow-800 px-4 py-2 flex items-center">
              <span className="font-bold text-sm">DEV ENVIRONMENT</span>
            </Card>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <a
            href="https://cms.rtsplusdev.com/webadmin/ImageScraperList.asp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <LuFileText className="h-4 w-4" />
              Jobs History
            </Button>
          </a>
          <a
            href="https://cms.rtsplusdev.com/webadmin/IconWarehouse.asp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <LuDatabase className="h-4 w-4" />
              Search Warehouse
            </Button>
          </a>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Google Images Tool */}
        <Link
          to="/public/tools/google-images"
          search={searchParams}
          className="block h-full"
        >
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
        <Link
          to="/public/tools/data-warehouse"
          search={searchParams}
          className="block h-full"
        >
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
        <Link
          to="/public/tools/image-links"
          search={searchParams}
          className="block h-full"
        >
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LuLink className="h-6 w-6 text-primary" />
                <CardTitle>Image Links</CardTitle>
              </div>
              <CardDescription>
                Process and validate image links.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Crop Tool */}
        <Link
          to="/public/tools/crop"
          search={searchParams}
          className="block h-full"
        >
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
            <CardDescription>
              New tools currently in development.
            </CardDescription>
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

      <footer className="mt-auto py-6 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex gap-4">
            <a
              href="https://dashboard.iconluxury.group/google-serp-cms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Want to access legacy upload?
            </a>
            <span>|</span>
            <a
              href="https://dashboard.iconluxury.group/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Scraper Admin
            </a>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Icon Luxury Group. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
