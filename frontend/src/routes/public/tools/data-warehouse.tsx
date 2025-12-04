import { DataWarehouseForm } from "@/components/google-serp/DataWarehouseForm"
import {
  DATA_WAREHOUSE_MODE_CONFIG,
  SERVER_URL as INITIAL_SERVER_URL,
} from "@/components/google-serp/constants"
import type { DataWarehouseMode } from "@/components/google-serp/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { LuDatabase } from "react-icons/lu"

export const Route = createFileRoute("/public/tools/data-warehouse")({
  component: DataWarehousePage,
})

function DataWarehousePage() {
  const [mode, setMode] = useState<DataWarehouseMode | null>(null)
  const [serverUrl, setServerUrl] = useState(INITIAL_SERVER_URL)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  if (mode) {
    return (
      <DataWarehouseForm
        mode={mode}
        onBack={() => setMode(null)}
        backLabel="Back to Data Warehouse options"
      />
    )
  }

  return (
    <div className="w-full p-4 bg-background text-foreground min-h-screen">
      <div className="flex flex-col gap-6 items-stretch">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/google-serp-cms" })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tools
              </Button>
              <h1 className="text-xl font-bold">Data Warehouse</h1>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Server</Label>
                <Select value={serverUrl} onValueChange={setServerUrl}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Server" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="https://external.iconluxury.group">
                      Production
                    </SelectItem>
                    <SelectItem value="https://dev-external.iconluxury.today">
                      Development
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(`${serverUrl}/jobs`, "_blank")}
              >
                Jobs History
              </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.keys(DATA_WAREHOUSE_MODE_CONFIG) as DataWarehouseMode[]).map(
            (key) => {
              const config = DATA_WAREHOUSE_MODE_CONFIG[key]
              const Icon = config.icon
              return (
                <Card
                  key={key}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setMode(key)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-6 w-6" />
                      {config.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      {config.description}
                    </p>
                  </CardContent>
                </Card>
              )
            },
          )}
        </div>
      </div>
    </div>
  )
}
