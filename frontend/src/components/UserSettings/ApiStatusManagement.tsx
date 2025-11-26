import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

// Define the shape of API status settings
type ApiStatusSettings = {
  isActive: boolean
  isLimited: boolean
  isDeactivated: boolean
}

// Define API services for dev, prod, and beta
const API_SERVICES = [
  "dev-service-distro-image",
  "prod-service-distro-image",
  "beta-service-distro-image",
] as const
type ApiServiceType = (typeof API_SERVICES)[number]

const STORAGE_KEY = "apiStatusSettings" // Key for localStorage

const ApiStatusManagement = () => {
  const queryClient = useQueryClient()

  // Load API status settings with React Query
  const { data: apiStatusSettings, refetch } = useQuery({
    queryKey: ["apiStatusSettings"],
    queryFn: () => {
      const storedSettings = localStorage.getItem(STORAGE_KEY)
      return storedSettings ? JSON.parse(storedSettings) : {}
    },
    staleTime: Number.POSITIVE_INFINITY,
  })

  // Store API status settings locally for UI updates
  const [settings, setSettings] = useState<
    Record<ApiServiceType, ApiStatusSettings>
  >(() =>
    API_SERVICES.reduce(
      (acc, service) => {
        acc[service] = apiStatusSettings?.[service] || {
          isActive: true,
          isLimited: false,
          isDeactivated: false,
        }
        return acc
      },
      {} as Record<ApiServiceType, ApiStatusSettings>,
    ),
  )

  // Sync React Query Data into State
  useEffect(() => {
    setSettings((prevSettings) =>
      API_SERVICES.reduce(
        (acc, service) => {
          acc[service] = apiStatusSettings?.[service] || prevSettings[service]
          return acc
        },
        {} as Record<ApiServiceType, ApiStatusSettings>,
      ),
    )
  }, [apiStatusSettings])

  // Update settings locally and sync with localStorage & React Query
  const updateSettings = (
    service: ApiServiceType,
    newSettings: ApiStatusSettings,
  ) => {
    const updatedSettings = { ...apiStatusSettings, [service]: newSettings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings))
    queryClient.setQueryData(["apiStatusSettings"], updatedSettings)
    refetch() // Ensure UI updates reflect instantly
  }

  // Determine status badge properties
  const getStatusBadge = (service: ApiServiceType) => {
    const { isActive, isLimited, isDeactivated } = settings[service]
    if (isDeactivated) return { text: "Down", variant: "destructive" as const }
    if (isLimited) return { text: "Limited", variant: "secondary" as const }
    if (isActive) return { text: "Active", variant: "default" as const }
    return { text: "Unknown", variant: "destructive" as const }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Status Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {API_SERVICES.map((service) => {
          const status = getStatusBadge(service)
          return (
            <div key={service} className="p-4 border rounded-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{service}</h3>
                <Badge variant={status.variant}>{status.text}</Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${service}-active`}>Active</Label>
                  <Switch
                    id={`${service}-active`}
                    checked={settings[service].isActive}
                    onCheckedChange={(checked) =>
                      updateSettings(service, {
                        ...settings[service],
                        isActive: checked,
                        isDeactivated: !checked, // If active, not deactivated
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${service}-limited`}>Limited</Label>
                  <Switch
                    id={`${service}-limited`}
                    checked={settings[service].isLimited}
                    onCheckedChange={(checked) =>
                      updateSettings(service, {
                        ...settings[service],
                        isLimited: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${service}-deactivated`}>Deactivated</Label>
                  <Switch
                    id={`${service}-deactivated`}
                    checked={settings[service].isDeactivated}
                    onCheckedChange={(checked) =>
                      updateSettings(service, {
                        ...settings[service],
                        isDeactivated: checked,
                        isActive: !checked, // If deactivated, not active
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default ApiStatusManagement
