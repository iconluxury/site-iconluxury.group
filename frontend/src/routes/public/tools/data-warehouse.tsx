import { DataWarehouseForm } from "@/components/google-serp/DataWarehouseForm"
import { DATA_WAREHOUSE_MODE_CONFIG } from "@/components/google-serp/constants"
import type { DataWarehouseMode } from "@/components/google-serp/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/public/tools/data-warehouse")({
  component: DataWarehousePage,
})

function DataWarehousePage() {
  const [mode, setMode] = useState<DataWarehouseMode | null>(null)
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
    <div className="container mx-auto max-w-7xl p-4 bg-[#FFFFFF] text-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate({ to: "/google-serp-cms" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tools
      </Button>
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
                  <p className="text-sm text-gray-500">{config.description}</p>
                </CardContent>
              </Card>
            )
          },
        )}
      </div>
    </div>
  )
}
