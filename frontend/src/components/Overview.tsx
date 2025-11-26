import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Button } from "./ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import { Loader2, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

interface Query {
  query: string
  count: number
  category?: string
  avgLatencyMs?: number
  lastRun?: string
  errorRate?: number
}

interface TimeSeries {
  date: string
  requests: number
  successRate: number
  cost: number
  latencyAvgMs: number
}

interface EndpointData {
  endpoint: string
  requestsToday: number
  totalQueries: number
  successRate: number
  queries?: Query[]
  gigsUsedToday: number
  costToday: number
  timeSeries: TimeSeries[]
}

interface OverviewProps {
  endpointId: string
}

// Define interfaces for chart data
interface ChartItem {
  name: string
  value: number
  compareValue?: number
}

interface QueryDistributionItem {
  name: string
  value: number
}

interface CostItem {
  name: string
  value: number
  compareValue: number
}

// Index signature for chartData
interface ChartData {
  requests: ChartItem[]
  successRate: ChartItem[]
  latency: ChartItem[]
  queryDistribution: QueryDistributionItem[]
  cost: CostItem[]
  [key: string]: ChartItem[] | QueryDistributionItem[] | CostItem[]
}

const chartOptions = [
  { key: "requests", label: "Requests", color: "#6366F1", yLabel: "Requests" },
  {
    key: "successRate",
    label: "Success vs Error",
    color: "#34D399",
    yLabel: "Percentage (%)",
  },
  {
    key: "latency",
    label: "Avg Latency",
    color: "#F59E0B",
    yLabel: "Latency (ms)",
  },
  {
    key: "queryDistribution",
    label: "Query Distribution",
    color: "#EF4444",
    yLabel: "Count",
  },
  { key: "cost", label: "Cost Trend", color: "#0EA5E9", yLabel: "Cost ($)" },
]

const PIE_COLORS = [
  "#6366F1",
  "#34D399",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#A855F7",
  "#14B8A6",
  "#64748B",
]
const COMPARE_COLORS = ["#6366F1", "#EF4444"]

const Overview: React.FC<OverviewProps> = ({ endpointId }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allEndpoints, setAllEndpoints] = useState<EndpointData[]>([])
  const [endpointData, setEndpointData] = useState<EndpointData | null>(null)
  const [compareEndpointData, setCompareEndpointData] =
    useState<EndpointData | null>(null)
  const [selectedChart, setSelectedChart] = useState("requests")
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [compareEndpointId, setCompareEndpointId] = useState<string>("")

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        "https://s3.us-east-1.amazonaws.com/iconluxury.group/endpoint-overview.json",
        { cache: "no-store" },
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: EndpointData[] = await response.json()
      setAllEndpoints(data)
      const primaryData = data.find((item) => item.endpoint === endpointId)
      if (!primaryData) {
        throw new Error(`Endpoint ${endpointId} not found in the data`)
      }
      setEndpointData(primaryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      setEndpointData(null)
      setAllEndpoints([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [endpointId])

  useEffect(() => {
    if (compareEndpointId) {
      const compareData = allEndpoints.find(
        (item) => item.endpoint === compareEndpointId,
      )
      setCompareEndpointData(compareData || null)
    } else {
      setCompareEndpointData(null)
    }
  }, [compareEndpointId, allEndpoints])

  useEffect(() => {
    setSelectedQuery(null)
  }, [selectedChart])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-destructive">{error}</p>
        <Button className="mt-2" onClick={fetchData}>
          Retry
        </Button>
      </div>
    )
  }

  if (!endpointId || !endpointData) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Overview</h2>
        <p className="text-muted-foreground">No endpoint specified or data available.</p>
      </div>
    )
  }

  const calculateMetrics = (data: EndpointData) => {
    const processedRequests = Math.round((data.requestsToday || 0) * 0.9)
    const failedRequests = (data.requestsToday || 0) - processedRequests
    const avgLatency =
      (data.queries || []).reduce((sum, q) => sum + (q.avgLatencyMs || 0), 0) /
      ((data.queries || []).length || 1)
    return { processedRequests, failedRequests, avgLatency }
  }

  const primaryMetrics = calculateMetrics(endpointData)
  const compareMetrics = compareEndpointData
    ? calculateMetrics(compareEndpointData)
    : null

  const chartData: ChartData = {
    requests: [
      {
        name: "Total Requests",
        value: endpointData.requestsToday || 0,
        compareValue: compareEndpointData?.requestsToday || 0,
      },
      {
        name: "Processed",
        value: primaryMetrics.processedRequests || 0,
        compareValue: compareMetrics?.processedRequests || 0,
      },
      {
        name: "Failed",
        value: primaryMetrics.failedRequests || 0,
        compareValue: compareMetrics?.failedRequests || 0,
      },
    ],
    successRate: [
      {
        name: "Success Rate",
        value: endpointData.successRate || 0,
        compareValue: compareEndpointData?.successRate || 0,
      },
      {
        name: "Error Rate",
        value: 100 - (endpointData.successRate || 0),
        compareValue: compareEndpointData
          ? 100 - (compareEndpointData.successRate || 0)
          : 0,
      },
    ],
    latency: [
      {
        name: "Avg Latency",
        value: primaryMetrics.avgLatency || 0,
        compareValue: compareMetrics?.avgLatency || 0,
      },
    ],
    queryDistribution: (endpointData.queries || [])
      .reduce((acc: QueryDistributionItem[], q) => {
        const existing = acc.find(
          (item) => item.name === (q.category || "Uncategorized"),
        )
        if (existing) {
          existing.value += q.count || 0
        } else {
          acc.push({ name: q.category || "Uncategorized", value: q.count || 0 })
        }
        return acc
      }, [])
      .filter((item) => item.value > 0),
    cost: (endpointData.timeSeries || []).map((ts) => ({
      name: ts.date,
      value: ts.cost || 0,
      compareValue:
        compareEndpointData?.timeSeries?.find((cts) => cts.date === ts.date)
          ?.cost || 0,
    })),
  }

  const topQueries = [...(endpointData.queries || [])]
    .filter((q) => (q.count || 0) > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10)

  const renderSummary = () => {
    const stats = getSummaryStats(selectedChart)
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-2xl font-bold">{stat.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const getSummaryStats = (selectedChart: string) => {
    const data = chartData[selectedChart] || []
    if (selectedChart === "cost") {
      if (data.length === 0) return []
      const latestPrimary = (data as CostItem[])[data.length - 1]?.value || 0
      const latestCompare = compareEndpointData
        ? (data as CostItem[])[data.length - 1]?.compareValue || 0
        : null
      const totalPrimary = (data as CostItem[]).reduce(
        (sum: number, item: CostItem) => sum + (item.value || 0),
        0,
      )
      const totalCompare = compareEndpointData
        ? (data as CostItem[]).reduce(
            (sum: number, item: CostItem) => sum + (item.compareValue || 0),
            0,
          )
        : null
      const avgPrimary = totalPrimary / data.length
      const avgCompare = compareEndpointData
        ? (totalCompare || 0) / data.length
        : null
      let trendPrimary = "Stable"
      let trendCompare = compareEndpointData ? "Stable" : null // Ensure trendCompare is null if no comparison
      if (data.length > 1) {
        const prevPrimary =
          (data as CostItem[])
            .slice(0, -1)
            .reduce(
              (sum: number, item: CostItem) => sum + (item.value || 0),
              0,
            ) /
          (data.length - 1)
        trendPrimary = latestPrimary > prevPrimary ? "Increasing" : "Decreasing"
        if (compareEndpointData) {
          const prevCompare =
            (data as CostItem[])
              .slice(0, -1)
              .reduce(
                (sum: number, item: CostItem) => sum + (item.compareValue || 0),
                0,
              ) /
            (data.length - 1)
          trendCompare =
            (latestCompare || 0) > prevCompare ? "Increasing" : "Decreasing"
        }
      }
      // Updated formatValue to accept undefined
      const formatValue = (
        primary: number | string,
        compare: number | string | null | undefined,
      ) => (compare != null ? `${primary} / ${compare}` : primary)
      return [
        {
          label: "Latest Cost",
          value: formatValue(
            latestPrimary.toLocaleString(),
            latestCompare?.toLocaleString(),
          ),
        },
        {
          label: "Total Cost",
          value: formatValue(
            totalPrimary.toLocaleString(),
            totalCompare?.toLocaleString(),
          ),
        },
        {
          label: "Avg Daily Cost",
          value: formatValue(avgPrimary.toFixed(2), avgCompare?.toFixed(2)),
        },
        { label: "Trend", value: formatValue(trendPrimary, trendCompare) },
      ]
    }

    if (selectedChart === "queryDistribution") {
      const total = (data as QueryDistributionItem[]).reduce(
        (sum: number, item: QueryDistributionItem) => sum + item.value,
        0,
      )
      return (data as QueryDistributionItem[]).map(
        (item: QueryDistributionItem) => ({
          label: item.name,
          value: `${item.value.toLocaleString()} (${(
            (item.value / total) *
            100
          ).toFixed(1)}%)`,
        }),
      )
    }

    return (data as ChartItem[]).map((item: ChartItem) => ({
      label: item.name,
      value: compareEndpointData
        ? `${(item.value || 0).toLocaleString()} / ${(
            item.compareValue || 0
          ).toLocaleString()}`
        : (item.value || 0).toLocaleString(),
    }))
  }

  const selectedOption =
    chartOptions.find((opt) => opt.key === selectedChart) || chartOptions[0]

  const renderChart = () => {
    const data = chartData[selectedChart] || []
    if (!data.length) return <p className="text-muted-foreground">No data available for this chart</p>

    const chartProps = {
      margin: {
        top: 20,
        right: 20,
        bottom: showLabels ? 60 : 20,
        left: showLabels ? 40 : 20,
      },
      children: [
        <CartesianGrid key="grid" stroke="var(--border)" />,
        <XAxis
          key="xaxis"
          dataKey="name"
          stroke="var(--foreground)"
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          tickMargin={10}
          angle={selectedChart === "cost" ? -45 : 0}
          textAnchor={selectedChart === "cost" ? "end" : "middle"}
          label={
            showLabels
              ? {
                  value: selectedChart === "cost" ? "Date" : "Metrics",
                  position: "insideBottom",
                  offset: -20,
                  fill: "var(--foreground)",
                }
              : undefined
          }
        />,
        <YAxis
          key="yaxis"
          stroke="var(--foreground)"
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          tickMargin={10}
          label={
            showLabels
              ? {
                  value: selectedOption.yLabel,
                  angle: -45,
                  position: "insideLeft",
                  offset: -20,
                  fill: "var(--foreground)",
                }
              : undefined
          }
        />,
        <RechartsTooltip
          key="tooltip"
          contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />,
        <Legend key="legend" verticalAlign="top" height={36} />,
      ],
    }

    switch (selectedChart) {
      case "requests":
      case "successRate":
      case "latency":
        return (
          <BarChart {...chartProps} data={data}>
            {chartProps.children}
            <Bar dataKey="value" fill={COMPARE_COLORS[0]} name={endpointId} />
            {compareEndpointData && (
              <Bar
                dataKey="compareValue"
                fill={COMPARE_COLORS[1]}
                name={compareEndpointData.endpoint}
              />
            )}
          </BarChart>
        )
      case "queryDistribution":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={
                showLabels ? ({ name, value }) => `${name}: ${value}` : false
              }
              labelLine={true}
            >
              {(data as QueryDistributionItem[]).map((_, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        )
      case "cost":
        return (
          <LineChart {...chartProps} data={data}>
            {chartProps.children}
            <Line
              type="monotone"
              dataKey="value"
              stroke={COMPARE_COLORS[0]}
              name={endpointId}
            />
            {compareEndpointData && (
              <Line
                type="monotone"
                dataKey="compareValue"
                stroke={COMPARE_COLORS[1]}
                name={compareEndpointData.endpoint}
              />
            )}
          </LineChart>
        )
      default:
        return <p>Unknown chart type</p>
    }
  }

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold">
          Overview for {endpointId}
        </h2>
        <div className="flex items-center gap-2">
          <Select
            value={compareEndpointId}
            onValueChange={setCompareEndpointId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Compare to..." />
            </SelectTrigger>
            <SelectContent>
              {allEndpoints
                .filter((item) => item.endpoint !== endpointId)
                .map((item) => (
                  <SelectItem key={item.endpoint} value={item.endpoint}>
                    {item.endpoint}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-1">
            {chartOptions.map((option) => (
              <TooltipProvider key={option.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedChart === option.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedChart(option.key)}
                      className={selectedChart === option.key ? "" : "text-muted-foreground"}
                      style={selectedChart === option.key ? { backgroundColor: option.color, borderColor: option.color } : {}}
                    >
                      {option.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View {option.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={fetchData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh overview data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowLabels(!showLabels)}
                >
                  {showLabels ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle chart labels</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-md font-semibold mb-2">
            {selectedOption.label}
          </h3>
          <div className="h-[400px] rounded-md overflow-hidden shadow-md bg-card border">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="text-md font-semibold mb-2">
            {selectedQuery
              ? "Query Details"
              : `${selectedOption.label} Summary`}
            {compareEndpointData && ` (vs ${compareEndpointData.endpoint})`}
          </h3>
          <Card className="relative">
            <CardContent className="pt-6">
                {selectedQuery && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setSelectedQuery(null)}
                >
                    <X className="h-4 w-4" />
                </Button>
                )}
                {renderSummary()}
            </CardContent>
          </Card>
        </div>
      </div>

      {topQueries.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">
            Top Queries
          </h3>
          <div className="rounded-md border shadow-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQueries.map((query, index) => (
                  <TableRow
                    key={index}
                    onClick={() => setSelectedQuery(query)}
                    className={`cursor-pointer ${selectedQuery?.query === query.query ? "bg-muted" : ""}`}
                  >
                    <TableCell>{query.query || "N/A"}</TableCell>
                    <TableCell>{query.category || "N/A"}</TableCell>
                    <TableCell className="text-right">{(query.count || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Overview
