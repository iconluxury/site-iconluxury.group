import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Moon } from "lucide-react"
import Changelog from "@/components/Changelog"
import { LuCrop, LuDatabase, LuEraser, LuFileText, LuImage, LuLink, LuSearch, LuWand2 } from "react-icons/lu"
import { useIframeEmail } from "../hooks/useIframeEmail"

export const Route = createFileRoute("/cms")({
  component: CmsPage,
})

function CmsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const iframeEmail = useIframeEmail()
  const searchParams = iframeEmail ? { sendToEmail: iframeEmail } : {}

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-end items-center">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Middle Content (Tools Grid) */}
        <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Changelog />
        </div>
      </div>
    </div>
  )
}
