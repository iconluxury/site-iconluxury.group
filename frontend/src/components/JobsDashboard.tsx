import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  File,
  Plus,
  RefreshCw,
} from "lucide-react"
import * as React from "react"
import {
  LuCrop,
  LuDatabase,
  LuLayoutGrid,
  LuLink,
  LuSearch,
} from "react-icons/lu"
import Changelog from "./Changelog"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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

// Interface matching the user"s data requirement and likely API response
interface JobSummary {
  id: number
  inputFile: string // FileName
  fileLocationUrl: string
  fileLocationURLComplete?: string
  imageStart?: string // ImageStartTime
  imageEnd?: string // ImageCompleteTime
  fileStart?: string // CreateFileStartTime
  fileEnd?: string // CreateFileCompleteTime
  userId?: number
  userEmail?: string
  logFileUrl?: string
  userHeaderIndex?: number
  fileTypeId?: number
  inputConfigUrl?: string
  rec: number
  img: number
  user: string
}

const JOB_TYPES: Record<number, string> = {
  1: "Google Scrape",
  2: "Crop Batch",
  3: "Warehouse Batch",
}

const getJobTypeName = (id?: number) => {
  if (!id) return "Unknown"
  return JOB_TYPES[id] || `Type ${id}`
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token")
}

async function fetchJobs(): Promise<JobSummary[]> {
  const token = getAuthToken()
  const response = await fetch(
    "https://dev-external.iconluxury.today/api/scraping-jobs?page=1&page_size=10",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  )
  if (!response.ok) throw new Error(`Failed to fetch jobs: ${response.status}`)
  return response.json()
}

export default function JobsDashboard({
  filterTypeId,
  showChangelog = true,
  showToolsShortcuts = true,
  showWelcome = true,
  showMetrics = true,
  children,
}: {
  filterTypeId?: number
  showChangelog?: boolean
  showToolsShortcuts?: boolean
  showWelcome?: boolean
  showMetrics?: boolean
  children?: React.ReactNode
}) {
  const navigate = useNavigate()
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobSummary[]>({
    queryKey: ["scraperJobs"],
    queryFn: fetchJobs,
  })

  const sortedJobs = React.useMemo(() => {
    let result = [...jobs]
    if (filterTypeId) {
      result = result.filter((job) => job.fileTypeId === filterTypeId)
    }
    return result.sort((a, b) => b.id - a.id)
  }, [jobs, filterTypeId])

  const getStatus = (job: JobSummary) => {
    if (job.fileEnd || job.fileLocationURLComplete) return "Completed"
    if (job.imageStart && !job.imageEnd) return "In Progress"
    if (job.imageEnd && !job.fileEnd) return "Processing"
    return "Pending"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "default" // or a specific green variant if available
      case "In Progress":
        return "secondary"
      case "Processing":
        return "secondary"
      case "Pending":
        return "outline"
      case "Failed":
        return "destructive"
      default:
        return "secondary"
    }
  }

  // Metrics
  const totalJobs = sortedJobs.length
  const completedJobs = sortedJobs.filter(
    (job) => getStatus(job) === "Completed",
  ).length
  const inProgressJobs = sortedJobs.filter((job) =>
    ["In Progress", "Processing"].includes(getStatus(job)),
  ).length
  const pendingJobs = sortedJobs.filter(
    (job) => getStatus(job) === "Pending",
  ).length

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-8 space-y-8">
      {/* Tools Access Card */}
      {showWelcome && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">All Tools</CardTitle>
              <CardDescription>
                Access scraping tools, data warehouse, and analytics.
                {inProgressJobs > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {inProgressJobs} Jobs Running
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={() => navigate({ to: "/cms" })}>
              <LuLayoutGrid className="mr-2 h-4 w-4" />
              Open Tools & Reports
            </Button>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Middle Content (Feed) */}
        <div
          className={
            showChangelog
              ? "lg:col-span-3 space-y-8"
              : "lg:col-span-4 space-y-8"
          }
        >
          {/* KPI Cards */}
          {showMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Jobs
                  </CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalJobs}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedJobs}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    In Progress
                  </CardTitle>
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressJobs}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingJobs}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tools Shortcuts */}
          {showToolsShortcuts && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate({ to: "/tools/google-images" } as any)}
              >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuSearch
                      className="h-6 w-6 text-foreground"
                      strokeWidth={1.75}
                    />
                    <CardTitle className="text-xl font-semibold">
                      Google Images
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate({ to: "/tools/data-warehouse" } as any)}
              >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuDatabase
                      className="h-6 w-6 text-foreground"
                      strokeWidth={1.75}
                    />
                    <CardTitle className="text-xl font-semibold">
                      Data Warehouse
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate({ to: "/tools/image-links" } as any)}
              >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuLink
                      className="h-6 w-6 text-foreground"
                      strokeWidth={1.75}
                    />
                    <CardTitle className="text-xl font-semibold">
                      Image URL Download
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => navigate({ to: "/tools/crop" } as any)}
              >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuCrop
                      className="h-6 w-6 text-foreground"
                      strokeWidth={1.75}
                    />
                    <CardTitle className="text-xl font-semibold">
                      Image crop
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>
            </div>
          )}

          {children}
        </div>

        {/* Right Sidebar */}
        {showChangelog && (
          <div className="space-y-6">
            <Changelog />
          </div>
        )}
      </div>
    </div>
  )
}
