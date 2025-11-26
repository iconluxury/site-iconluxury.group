import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart } from "recharts"
import { Loader2, RefreshCw } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useCustomToast from "@/hooks/useCustomToast"

// Interfaces
interface TimeSeries {
  hour: string
  count: number
}

interface Query {
  id: number
  query: string
  count: number
  featured: boolean
  category: string
  type: string
  timeSeries?: TimeSeries[]
  endpointDetails?: { endpoint: string; count: number }[]
}

interface EndpointData {
  endpoint: string
  requestsToday: number
  successRate: number
  queries: Query[]
}

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
})

const chartConfig = {
  requests: {
    label: "Requests",
    color: "hsl(var(--chart-1))",
  },
  queries: {
    label: "Queries",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

function InsightsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [endpointData, setEndpointData] = useState<EndpointData[]>([])
  const showToast = useCustomToast()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        "https://s3.us-east-1.amazonaws.com/iconluxury.group/google-serp-overview.json",
      )
      if (!response.ok) throw new Error("Failed to fetch data")
      const data: EndpointData[] = await response.json()
      setEndpointData(data)
    } catch (error) {
      console.error("Error fetching data:", error)
      showToast("Data Fetch Error", error instanceof Error ? error.message : "Unknown error", "error")
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalRequests = useMemo(() => {
    return endpointData.reduce((sum, ep) => sum + ep.requestsToday, 0)
  }, [endpointData])

  const requestsOverTime = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
        const hour = `${i}:00`
        const total = endpointData
          .flatMap((ep) => ep.queries)
          .reduce(
            (sum, q) =>
              sum + (q.timeSeries?.find((ts) => ts.hour === hour)?.count || 0),
            0,
          )
        return { hour, requests: total }
      })
  }, [endpointData])

  const topQueries = useMemo(() => {
      const queryMap = new Map<string, any>()
      endpointData.flatMap(ep => ep.queries).forEach(q => {
          if (queryMap.has(q.query)) {
              queryMap.get(q.query).count += q.count
          } else {
              queryMap.set(q.query, { ...q })
          }
      })
      return Array.from(queryMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
  }, [endpointData])

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
            <p className="text-muted-foreground">Analytics for all apps and services</p>
        </div>
        <Button onClick={fetchData} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{endpointData.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Requests Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={requestsOverTime}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Queries</CardTitle>
            <CardDescription>Most frequent search queries</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topQueries.map((query) => (
                    <TableRow key={query.query}>
                      <TableCell className="font-medium">{query.query}</TableCell>
                      <TableCell className="text-right">{query.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
