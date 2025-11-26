import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CheckCircle,
  Clock,
  Download,
  File,
  FileText,
  Moon,
  RefreshCw,
  Sun,
} from "lucide-react"
import {
  LuCrop,
  LuDatabase,
  LuLink,
  LuSearch,
  LuLayoutGrid, // Add this import
} from "react-icons/lu"
import { useTheme } from "next-themes"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { useNavigate } from "@tanstack/react-router"
import Changelog from "./Changelog"

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
    "https://external.iconluxury.group/api/scraping-jobs?page=1&page_size=100",
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your scraping jobs and view system status.
          </p>
        </div>
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
            <CardTitle className="text-xl">Google SERP CMS</CardTitle>
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
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
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
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
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
                    <LuSearch className="h-6 w-6 text-gray-600" strokeWidth={1.75} />
                    <CardTitle className="text-xl font-semibold">
                      Google Images
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Search and collect images from Google.</p>
                </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" 
              onClick={() => navigate({ to: "/tools/data-warehouse" } as any)}
            >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuDatabase className="h-6 w-6 text-gray-600" strokeWidth={1.75} />
                    <CardTitle className="text-xl font-semibold">
                      Data Warehouse
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Internal product database jobs.</p>
                </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" 
              onClick={() => navigate({ to: "/tools/image-links" } as any)}
            >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuLink className="h-6 w-6 text-gray-600" strokeWidth={1.75} />
                    <CardTitle className="text-xl font-semibold">
                      Image URL Download
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Convert image links to excel pictures.</p>
                </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" 
              onClick={() => navigate({ to: "/tools/crop" } as any)}
            >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <LuCrop className="h-6 w-6 text-gray-600" strokeWidth={1.75} />
                    <CardTitle className="text-xl font-semibold">
                      Image crop
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Remove whitespace from Excel pictures.</p>
                </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>
                A list of your recent scraping jobs and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Completion Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : jobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                          No jobs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      jobs.map((job) => {
                        const status = getStatus(job)
                        return (
                          <TableRow
                            key={job.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              navigate({
                                to: `/scraping-api/scraping-jobs/${job.id}`,
                              })
                            }
                          >
                            <TableCell className="font-medium">{job.id}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{job.inputFile}</span>
                                <a
                                  href={job.fileLocationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-muted-foreground hover:underline truncate max-w-[200px]"
                                >
                                  Original File
                                </a>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(status) as any}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {job.img} / {job.rec}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{job.user}</span>
                                <span className="text-xs text-muted-foreground">
                                  {job.userEmail}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDate(job.imageStart)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDate(job.fileEnd)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {job.fileLocationURLComplete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <a
                                      href={job.fileLocationURLComplete}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Download Result"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {job.logFileUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <a
                                      href={job.logFileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="View Log"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Changelog) */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Submit a support ticket for any issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate({ to: "/support-ticket" })}>
                Contact Support
              </Button>
            </CardContent>
          </Card>
          <Changelog />
        </div>
      </div>
    </div>
  )
}
