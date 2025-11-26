import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  DataWarehouseForm,
  DATA_WAREHOUSE_MODE_CONFIG,
  DataWarehouseMode,
} from "@/components/GoogleSerpLegacy"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/_layout/tools/data-warehouse")({
  component: DataWarehousePage,
})

function DataWarehousePage() {
  const [mode, setMode] = useState<DataWarehouseMode | null>(null)

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
    <div className="container mx-auto max-w-7xl p-4 bg-white text-black">
      <h1 className="text-2xl font-bold mb-6">Data Warehouse Tool</h1>
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
