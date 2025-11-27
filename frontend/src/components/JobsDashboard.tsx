import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { CheckCircle, Clock, File, Moon, RefreshCw, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"
import {
  LuCrop,
  LuDatabase,
  LuLayoutGrid,
  LuLink,
  LuSearch,
} from "react-icons/lu"
import { Button } from "./ui/button"
import Changelog from "./Changelog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"

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
    "https://external.iconluxury.group/api/scraping-jobs?page=1&page_size=10",
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

export default function JobsDashboard() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobSummary[]>({
    queryKey: ["scraperJobs"],
    queryFn: fetchJobs,
  })

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
  const totalJobs = jobs.length
  const completedJobs = jobs.filter(
    (job) => getStatus(job) === "Completed",
  ).length
  const inProgressJobs = jobs.filter((job) =>
    ["In Progress", "Processing"].includes(getStatus(job)),
  ).length
  const pendingJobs = jobs.filter((job) => getStatus(job) === "Pending").length

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString()
  }

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

      {/* Tools Access Card */}
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
          <Button onClick={() => navigate({ to: "/google-serp-cms" })}>
            <LuLayoutGrid className="mr-2 h-4 w-4" />
            Open Tools & Reports
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Middle Content (Feed) */}
        <div className="lg:col-span-3 space-y-8">
          {/* KPI Cards */}
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
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
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

          {/* Tools Shortcuts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => navigate({ to: "/tools/google-images" } as any)}
            >
              <CardHeader>
                <div className="flex flex-row items-center gap-2">
                  <LuSearch
                    className="h-6 w-6 text-gray-600"
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
                    className="h-6 w-6 text-gray-600"
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
                    className="h-6 w-6 text-gray-600"
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
                    className="h-6 w-6 text-gray-600"
                    strokeWidth={1.75}
                  />
                  <CardTitle className="text-xl font-semibold">
                    Image crop
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Need Help? */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => navigate({ to: "/support-ticket" })}
              >
                Submit Ticket
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Changelog />
        </div>
      </div>
    </div>
  )
}
