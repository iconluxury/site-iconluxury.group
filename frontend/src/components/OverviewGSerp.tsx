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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import { Badge } from "./ui/badge"
import { Loader2, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { debounce } from "lodash"
import useCustomToast from "../hooks/useCustomToast"

// Interfaces for TypeScript type safety
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

interface ChartDataItem {
  name?: string
  hour?: string
  value: number
}

// Chart options with labels and colors
const chartOptions = [
  {
    key: "requestsOverTime",
    label: "Requests Over Time",
    color: "#805AD5",
    yAxisLabel: "Requests",
  },
  {
    key: "categoryDistribution",
    label: "Category Distribution",
    color: "#38A169",
    yAxisLabel: "Total Queries",
  },
  {
    key: "topQueries",
    label: "Top Queries",
    color: "#DD6B20",
    yAxisLabel: "Query Count",
  },
  {
    key: "successRate",
    label: "Success Rate",
    color: "#C53030",
    yAxisLabel: "Percentage (%)",
  },
  {
    key: "keyMetrics",
    label: "Key Metrics",
    color: "#D69E2E",
    yAxisLabel: "Value",
  },
]

// Comparison options for each chart type
const compareOptions: {
  [key: string]: { value: string; label: string; color: string }[]
} = {
  requestsOverTime: [
    { value: "totalRequests", label: "Total Requests", color: "#805AD5" },
    { value: "avgHourly", label: "Avg Hourly Requests", color: "#9F7AEA" },
    { value: "maxHourly", label: "Max Hourly Requests", color: "#B794F4" },
    { value: "minHourly", label: "Min Hourly Requests", color: "#D6BCFA" },
  ],
  categoryDistribution: [
    { value: "totalQueries", label: "Total Queries", color: "#38A169" },
    { value: "avgPerCategory", label: "Avg Per Category", color: "#68D391" },
    { value: "maxCategory", label: "Max Category Count", color: "#9AE6B4" },
    { value: "uniqueCategories", label: "Unique Categories", color: "#C6F6D5" },
  ],
  topQueries: [
    { value: "queryCount", label: "Query Count", color: "#DD6B20" },
    { value: "avgQueryCount", label: "Avg Query Count", color: "#F6AD55" },
    { value: "maxQuery", label: "Max Query Count", color: "#FBD38D" },
    { value: "featuredQueries", label: "Featured Queries", color: "#FEEBC8" },
  ],
  successRate: [
    { value: "successRate", label: "Success Rate", color: "#C53030" },
    { value: "errorRate", label: "Error Rate", color: "#F56565" },
    { value: "avgSuccess", label: "Avg Success Rate", color: "#FC8181" },
    { value: "variance", label: "Success Variance", color: "#FEB2B2" },
  ],
  keyMetrics: [
    { value: "totalRequests", label: "Total Requests", color: "#D69E2E" },
    { value: "successRate", label: "Success Rate", color: "#ECC94B" },
    { value: "endpoints", label: "Endpoints", color: "#F6E05E" },
    { value: "avgRequests", label: "Avg Requests", color: "#FAF089" },
  ],
}

const OverviewGSerp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedChart, setSelectedChart] = useState("requestsOverTime")
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [endpointData, setEndpointData] = useState<EndpointData[]>([])
  const [chartData, setChartData] = useState<{
    [key: string]: ChartDataItem[]
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [compares, setCompares] = useState<{ [key: string]: string[] }>({
    requestsOverTime: [],
    categoryDistribution: [],
    topQueries: [],
    successRate: [],
    keyMetrics: [],
  })
  const showToast = useCustomToast()

  const totalRequests = useMemo(() => {
    return endpointData.reduce((sum, ep) => sum + ep.requestsToday, 0)
  }, [endpointData])

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    setError(null)
    try {
      const response = await fetch(
        "https://s3.us-east-1.amazonaws.com/iconluxury.group/google-serp-overview.json",
      )
      if (!response.ok) throw new Error("Failed to fetch data")
      const data: EndpointData[] = await response.json()

      if (
        !Array.isArray(data) ||
        !data.every((ep) => "endpoint" in ep && "queries" in ep)
      ) {
        throw new Error("Invalid data format")
      }

      const enhancedData = data.map((endpoint) => ({
        ...endpoint,
        queries: endpoint.queries.map((query) => ({
          ...query,
          endpointDetails: data
            .filter((ep) => ep.queries.some((q) => q.query === query.query))
            .map((ep) => ({
              endpoint: ep.endpoint,
              count: ep.queries.find((q) => q.query === query.query)!.count,
            })),
        })),
      }))

      setEndpointData(enhancedData)

      const totalSuccess = enhancedData.reduce(
        (sum, ep) => sum + ep.requestsToday * ep.successRate,
        0,
      )
      const overallSuccessRate =
        totalRequests > 0 ? totalSuccess / totalRequests : 0

      const requestsOverTime = Array.from({ length: 24 }, (_, i) => {
        const hour = `${i}:00`
        const total = enhancedData
          .flatMap((ep) => ep.queries)
          .reduce(
            (sum, q) =>
              sum + (q.timeSeries?.find((ts) => ts.hour === hour)?.count || 0),
            0,
          )
        return { hour, value: total }
      })

      const categoryMap = new Map<string, number>()
      for (const query of enhancedData.flatMap((ep) => ep.queries)) {
        categoryMap.set(
          query.category,
          (categoryMap.get(query.category) || 0) + query.count,
        )
      }
      const categoryDistribution = Array.from(categoryMap.entries()).map(
        ([category, count]) => ({
          name: category,
          value: count,
        }),
      )

      const queryMap = new Map<string, number>()
      for (const query of enhancedData.flatMap((ep) => ep.queries)) {
        queryMap.set(
          query.query,
          (queryMap.get(query.query) || 0) + query.count,
        )
      }
      const topQueriesChart = Array.from(queryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ name: query, value: count }))

      const successRate = enhancedData.map((ep) => ({
        name: ep.endpoint,
        value: ep.successRate * 100,
      }))

      const keyMetrics = [
        { name: "Total Requests", value: totalRequests },
        { name: "Success Rate", value: overallSuccessRate * 100 },
        { name: "Endpoints", value: enhancedData.length },
      ]

      setChartData({
        requestsOverTime,
        categoryDistribution,
        topQueries: topQueriesChart,
        successRate,
        keyMetrics,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      setEndpointData([])
      setChartData({})
      setError(error instanceof Error ? error.message : "Unknown error")
      showToast("Data Fetch Error", error instanceof Error ? error.message : "Unknown error", "error")
    } finally {
      setIsLoading(false)
    }
  }, [totalRequests, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setSelectedQuery(null)
  }, [selectedChart])

  const updateChartData = useMemo(() => {
    const updatedData = { ...chartData }
    for (const chartKey of Object.keys(compares)) {
      const selectedCompares = compares[chartKey]
      const baseData = chartData[chartKey] || []
      const additionalData: ChartDataItem[] = []
      if (chartKey === "requestsOverTime") {
        const avgHourly = baseData.reduce((sum, d) => sum + d.value, 0) / 24
        const maxHourly = Math.max(...baseData.map((d) => d.value))
        const minHourly = Math.min(...baseData.map((d) => d.value))
        for (const compare of selectedCompares) {
          additionalData.push({
            name: compareOptions[chartKey].find((opt) => opt.value === compare)!
              .label,
            value:
              compare === "totalRequests"
                ? totalRequests
                : compare === "avgHourly"
                  ? avgHourly
                  : compare === "maxHourly"
                    ? maxHourly
                    : minHourly,
          })
        }
        updatedData[chartKey] = selectedCompares.length
          ? additionalData
          : baseData
      } else if (chartKey === "categoryDistribution") {
        const totalQueries = baseData.reduce((sum, d) => sum + d.value, 0)
        const avgPerCategory = totalQueries / baseData.length
        const maxCategory = Math.max(...baseData.map((d) => d.value))
        const uniqueCategories = baseData.length
        for (const compare of selectedCompares) {
          additionalData.push({
            name: compareOptions[chartKey].find((opt) => opt.value === compare)!
              .label,
            value:
              compare === "totalQueries"
                ? totalQueries
                : compare === "avgPerCategory"
                  ? avgPerCategory
                  : compare === "maxCategory"
                    ? maxCategory
                    : uniqueCategories,
          })
        }
        updatedData[chartKey] = [...baseData, ...additionalData]
      } else if (chartKey === "topQueries") {
        const totalQueryCount = baseData.reduce((sum, d) => sum + d.value, 0)
        const avgQueryCount = totalQueryCount / baseData.length
        const maxQuery = Math.max(...baseData.map((d) => d.value))
        const featuredQueries = endpointData
          .flatMap((ep) => ep.queries)
          .filter((q) => q.featured).length
        for (const compare of selectedCompares) {
          additionalData.push({
            name: compareOptions[chartKey].find((opt) => opt.value === compare)!
              .label,
            value:
              compare === "queryCount"
                ? totalQueryCount
                : compare === "avgQueryCount"
                  ? avgQueryCount
                  : compare === "maxQuery"
                    ? maxQuery
                    : featuredQueries,
          })
        }
        updatedData[chartKey] = [...baseData, ...additionalData]
      } else if (chartKey === "successRate") {
        const overallSuccessRate =
          totalRequests > 0
            ? (endpointData.reduce(
                (sum, ep) => sum + ep.requestsToday * ep.successRate,
                0,
              ) /
                totalRequests) *
              100
            : 0
        const avgSuccess =
          baseData.reduce((sum, d) => sum + d.value, 0) / baseData.length
        const variance = Math.sqrt(
          baseData.reduce((sum, d) => sum + (d.value - avgSuccess) ** 2, 0) /
            baseData.length,
        )
        for (const compare of selectedCompares) {
          additionalData.push({
            name: compareOptions[chartKey].find((opt) => opt.value === compare)!
              .label,
            value:
              compare === "successRate"
                ? overallSuccessRate
                : compare === "errorRate"
                  ? 100 - overallSuccessRate
                  : compare === "avgSuccess"
                    ? avgSuccess
                    : variance,
          })
        }
        updatedData[chartKey] = [...baseData, ...additionalData]
      } else if (chartKey === "keyMetrics") {
        const avgRequests = totalRequests / endpointData.length
        for (const compare of selectedCompares) {
          additionalData.push({
            name: compareOptions[chartKey].find((opt) => opt.value === compare)!
              .label,
            value:
              compare === "totalRequests"
                ? totalRequests
                : compare === "successRate"
                  ? baseData.find((d) => d.name === "Success Rate")?.value || 0
                  : compare === "endpoints"
                    ? endpointData.length
                    : avgRequests,
          })
        }
        updatedData[chartKey] = [...baseData, ...additionalData]
      }
    }
    return updatedData
  }, [chartData, compares, endpointData, totalRequests])

  const queryAggregation = new Map<
    string,
    {
      count: number
      id: number
      featured: boolean
      category: string
      type: string
      endpointDetails: { endpoint: string; count: number }[]
    }
  >()
  endpointData.forEach((ep) => {
    ep.queries.forEach((q) => {
      const existing = queryAggregation.get(q.query) || {
        count: 0,
        id: q.id,
        featured: q.featured,
        category: q.category,
        type: q.type,
        endpointDetails: [],
      }
      queryAggregation.set(q.query, {
        count: existing.count + q.count,
        id: existing.id,
        featured: existing.featured,
        category: existing.category,
        type: existing.type,
        endpointDetails: [
          ...existing.endpointDetails,
          { endpoint: ep.endpoint, count: q.count },
        ],
      })
    })
  })
  const topQueries = Array.from(queryAggregation.entries())
    .map(([query, data]) => ({
      id: data.id,
      query,
      count: data.count,
      featured: data.featured,
      category: data.category,
      type: data.type,
      endpointDetails: data.endpointDetails,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const getSummaryStats = (selectedChart: string) => {
    const data = chartData[selectedChart] || []
    if (!data.length) return []
    switch (selectedChart) {
      case "requestsOverTime": {
        const avgHourly = data.reduce((sum, d) => sum + d.value, 0) / 24
        const maxHourly = Math.max(...data.map((d) => d.value))
        const minHourly = Math.min(...data.map((d) => d.value))
        return [
          { label: "Total Requests", value: totalRequests.toLocaleString() },
          { label: "Avg Hourly Requests", value: avgHourly.toFixed(2) },
          { label: "Max Hourly Requests", value: maxHourly.toLocaleString() },
          { label: "Min Hourly Requests", value: minHourly.toLocaleString() },
        ]
      }
      case "categoryDistribution": {
        const totalQueries = data.reduce((sum, d) => sum + d.value, 0)
        const avgPerCategory = totalQueries / data.length
        const maxCategory = Math.max(...data.map((d) => d.value))
        const uniqueCategories = data.length
        return [
          { label: "Total Queries", value: totalQueries.toLocaleString() },
          { label: "Avg Per Category", value: avgPerCategory.toFixed(2) },
          { label: "Max Category Count", value: maxCategory.toLocaleString() },
          {
            label: "Unique Categories",
            value: uniqueCategories.toLocaleString(),
          },
        ]
      }
      case "topQueries": {
        const totalQueryCount = data.reduce((sum, d) => sum + d.value, 0)
        const avgQueryCount = totalQueryCount / data.length
        const maxQuery = Math.max(...data.map((d) => d.value))
        const featuredQueries = endpointData
          .flatMap((ep) => ep.queries)
          .filter((q) => q.featured).length
        return [
          { label: "Query Count", value: totalQueryCount.toLocaleString() },
          { label: "Avg Query Count", value: avgQueryCount.toFixed(2) },
          { label: "Max Query Count", value: maxQuery.toLocaleString() },
          {
            label: "Featured Queries",
            value: featuredQueries.toLocaleString(),
          },
        ]
      }
      case "successRate": {
        const overallSuccessRate =
          totalRequests > 0
            ? (endpointData.reduce(
                (sum, ep) => sum + ep.requestsToday * ep.successRate,
                0,
              ) /
                totalRequests) *
              100
            : 0
        const avgSuccess =
          data.reduce((sum, d) => sum + d.value, 0) / data.length
        const variance = Math.sqrt(
          data.reduce((sum, d) => sum + (d.value - avgSuccess) ** 2, 0) /
            data.length,
        )
        return [
          {
            label: "Overall Success Rate",
            value: `${overallSuccessRate.toFixed(2)}%`,
          },
          {
            label: "Error Rate",
            value: `${(100 - overallSuccessRate).toFixed(2)}%`,
          },
          { label: "Avg Success Rate", value: `${avgSuccess.toFixed(2)}%` },
          { label: "Success Variance", value: variance.toFixed(2) },
        ]
      }
      case "keyMetrics": {
        const avgRequests = totalRequests / endpointData.length
        return [
          { label: "Total Requests", value: totalRequests.toLocaleString() },
          {
            label: "Success Rate",
            value: `${
              data.find((d) => d.name === "Success Rate")?.value.toFixed(2) || 0
            }%`,
          },
          { label: "Endpoints", value: endpointData.length.toLocaleString() },
          { label: "Avg Requests", value: avgRequests.toFixed(2) },
        ]
      }
      default:
        return []
    }
  }

  const renderSummary = () => {
    const stats = getSummaryStats(selectedChart)
    const summaryContent = selectedQuery ? (
      <div className="space-y-2">
        <p>
          <strong>Query:</strong> {selectedQuery.query}
        </p>
        <p>
          <strong>Total Count:</strong> {selectedQuery.count}
        </p>
        <p>
          <strong>Category:</strong> {selectedQuery.category}
        </p>
        <p>
          <strong>Type:</strong> {selectedQuery.type}
        </p>
        <p>
          <strong>Featured:</strong> {selectedQuery.featured ? "Yes" : "No"}
        </p>
        {selectedQuery.endpointDetails && (
          <div className="mt-2">
            <p className="text-sm font-semibold">
              Endpoint Breakdown:
            </p>
            {selectedQuery.endpointDetails.map((detail, idx) => (
              <p key={idx} className="text-sm">
                {detail.endpoint}: {detail.count}
              </p>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-xl font-bold">{stat.value}</span>
          </div>
        ))}
      </div>
    )

    return (
      <>
        <h3 className="text-md font-semibold mb-2">
          {selectedQuery
            ? "Query Details"
            : `${
                chartOptions.find((opt) => opt.key === selectedChart)!.label
              } Summary`}
        </h3>
        <Card className="relative min-h-[150px]">
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
            {summaryContent}
          </CardContent>
        </Card>
      </>
    )
  }

  const toggleCompare = useCallback((chartKey: string, value: string) => {
    setCompares((prev) => ({
      ...prev,
      [chartKey]: prev[chartKey].includes(value)
        ? prev[chartKey].filter((v) => v !== value)
        : [...prev[chartKey], value],
    }))
  }, [])

  const selectedOption = chartOptions.find((opt) => opt.key === selectedChart)!
  const selectedColor = selectedOption.color
  const yAxisLabel = selectedOption.yAxisLabel

  type CompareOption = { value: string; label: string; color: string }

  const chunkArray = (
    array: CompareOption[],
    size: number,
  ): CompareOption[][] => {
    const result: CompareOption[][] = []
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size))
    }
    return result
  }
  const compareRows = chunkArray(compareOptions[selectedChart], 4)

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold">
          OverviewGSerp
        </h2>
        <div className="flex items-center gap-2 ml-auto">
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
                  size="sm"
                  variant="default"
                  onClick={() => {
                    const debouncedFetch = debounce(fetchData, 500)
                    debouncedFetch()
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Refresh Now
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh overview data immediately</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={showLabels ? "default" : "outline"}
                  onClick={() => setShowLabels(!showLabels)}
                >
                  {showLabels ? <ToggleRight className="h-4 w-4 mr-2" /> : <ToggleLeft className="h-4 w-4 mr-2" />}
                  {showLabels ? "Labels: On" : "Labels: Off"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle chart labels</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[200px] flex-col gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p>Loading SERP data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
            <div>
              <h3 className="text-md font-semibold mb-2">
                {selectedOption.label}
              </h3>
              <div className="h-[400px] rounded-md overflow-hidden shadow-md bg-card border">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={updateChartData[selectedChart]}
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: showLabels ? 60 : 20,
                      left: showLabels ? 40 : 20,
                    }}
                  >
                    <CartesianGrid stroke="var(--border)" />
                    <XAxis
                      dataKey={
                        selectedChart === "requestsOverTime" &&
                        !compares[selectedChart].length
                          ? "hour"
                          : "name"
                      }
                      stroke="var(--foreground)"
                      tick={{ fill: "var(--foreground)", fontSize: 12, dy: 10 }}
                      tickMargin={10}
                      interval="preserveStartEnd"
                      label={
                        showLabels
                          ? {
                              value:
                                selectedChart === "requestsOverTime" &&
                                !compares[selectedChart].length
                                  ? "Time (Hour)"
                                  : selectedChart === "keyMetrics"
                                    ? "Metrics"
                                    : selectedChart === "categoryDistribution"
                                      ? "Categories"
                                      : selectedChart === "successRate"
                                        ? "Endpoints"
                                        : "Queries",
                              position: "insideBottom",
                              offset: -20,
                              fill: "var(--foreground)",
                              fontSize: 14,
                            }
                          : undefined
                      }
                    />
                    <YAxis
                      stroke="var(--foreground)"
                      tick={{ fill: "var(--foreground)", fontSize: 12 }}
                      tickMargin={10}
                      domain={
                        selectedChart === "successRate" ? [0, 100] : undefined
                      }
                      label={
                        showLabels
                          ? {
                              value: yAxisLabel,
                              angle: -45,
                              position: "insideLeft",
                              offset: -20,
                              fill: "var(--foreground)",
                              fontSize: 14,
                            }
                          : undefined
                      }
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                    <Bar dataKey="value" fill={selectedColor} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              {renderSummary()}
              {selectedChart !== "requestsOverTime" && (
                <div className="mt-6">
                  <h3 className="text-md font-semibold mb-2">
                    Compare To
                  </h3>
                  <div className="flex flex-col gap-2">
                    {compareRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-1 flex-wrap">
                        {row.map((option) => (
                          <Button
                            key={option.value}
                            variant={compares[selectedChart].includes(option.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              toggleCompare(selectedChart, option.value)
                            }
                            style={compares[selectedChart].includes(option.value) ? { backgroundColor: option.color, borderColor: option.color } : {}}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">
              Top Search Queries
            </h3>
            <div className="rounded-md border shadow-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Featured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topQueries.map((query, index) => (
                    <TableRow
                      key={index}
                      onClick={() => setSelectedQuery(query)}
                      className={`cursor-pointer ${selectedQuery?.query === query.query ? "bg-muted" : ""}`}
                    >
                      <TableCell>{query.query}</TableCell>
                      <TableCell>{query.count}</TableCell>
                      <TableCell>{query.category}</TableCell>
                      <TableCell>{query.type}</TableCell>
                      <TableCell>
                        {query.featured ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default OverviewGSerp
