import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card"

interface UsageProps {
  toolId?: string
}

// Simulated data for different endpoints
const endpointUsageData: Record<
  string,
  {
    requestsToday: number
    requestsThisMonth: number
    successRate: number
    gigsUsedToday: number
    gigsUsedThisMonth: number
    costPerGigabyte: number
  }
> = {
  "SOUTHAMERICA-WEST1": {
    requestsToday: 1200,
    requestsThisMonth: 36000,
    successRate: 98.7,
    gigsUsedToday: 2.0,
    gigsUsedThisMonth: 60.0,
    costPerGigabyte: 0.05,
  },
  "US-CENTRAL1": {
    requestsToday: 1800,
    requestsThisMonth: 54000,
    successRate: 99.2,
    gigsUsedToday: 2.8,
    gigsUsedThisMonth: 84.0,
    costPerGigabyte: 0.04,
  },
  "US-EAST1": {
    requestsToday: 1500,
    requestsThisMonth: 45000,
    successRate: 99.0,
    gigsUsedToday: 2.5,
    gigsUsedThisMonth: 75.0,
    costPerGigabyte: 0.045,
  },
  "US-EAST4": {
    requestsToday: 13080,
    requestsThisMonth: 349000,
    successRate: 98.8,
    gigsUsedToday: 20.3,
    gigsUsedThisMonth: 690.0,
    costPerGigabyte: 0.043,
  },
  "US-WEST1": {
    requestsToday: 1000,
    requestsThisMonth: 30000,
    successRate: 98.9,
    gigsUsedToday: 1.9,
    gigsUsedThisMonth: 57.0,
    costPerGigabyte: 0.06,
  },
  "EUROPE-WEST4": {
    requestsToday: 1100,
    requestsThisMonth: 33000,
    successRate: 99.1,
    gigsUsedToday: 2.1,
    gigsUsedThisMonth: 63.0,
    costPerGigabyte: 0.048,
  },
  "G-IMAGE-SERP-EUROPE-WEST1": {
    requestsToday: 900,
    requestsThisMonth: 27000,
    successRate: 97.5,
    gigsUsedToday: 1.5,
    gigsUsedThisMonth: 45.0,
    costPerGigabyte: 0.06,
  },
  "G-IMAGE-SERP-US-CENTRAL1": {
    requestsToday: 1100,
    requestsThisMonth: 33000,
    successRate: 98.0,
    gigsUsedToday: 1.8,
    gigsUsedThisMonth: 54.0,
    costPerGigabyte: 0.05,
  },
}

const Usage = ({ toolId }: UsageProps) => {
  // Case 1: No toolId provided
  if (!toolId) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">
          Usage
        </h2>
        <p className="text-muted-foreground">No endpoint specified.</p>
      </div>
    )
  }

  // Fetch usage data for the given toolId
  const usageData = endpointUsageData[toolId]

  // Case 2: toolId provided but no data available
  if (!usageData) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">
          Usage for {toolId}
        </h2>
        <p className="text-muted-foreground">No data available for this endpoint.</p>
      </div>
    )
  }

  // Case 3: Data available, display usage statistics
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">
        Usage for {toolId}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requests Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.requestsToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Daily usage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requests This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.requestsThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.successRate}%</div>
            <p className="text-xs text-muted-foreground">Request success</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gigabytes Used Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.gigsUsedToday.toFixed(1)} GB</div>
            <p className="text-xs text-muted-foreground">Daily data usage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gigabytes Used This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.gigsUsedThisMonth.toFixed(1)} GB</div>
            <p className="text-xs text-muted-foreground">Monthly data usage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost Per Gigabyte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${usageData.costPerGigabyte.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Rate per GB</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Usage
