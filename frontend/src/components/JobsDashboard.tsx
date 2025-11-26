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
import { useTheme } from "next-themes"
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
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

  // Chart Data
  const statusData = [
    { name: "Completed", value: completedJobs, color: "#22c55e" },
    { name: "In Progress", value: inProgressJobs, color: "#3b82f6" },
    { name: "Pending", value: pendingJobs, color: "#f59e0b" },
  ]

  // Jobs per day (mock logic or real if dates exist)
  const jobsPerDay = jobs.reduce(
    (acc, job) => {
      const date = job.imageStart
        ? new Date(job.imageStart).toLocaleDateString()
        : "Unknown"
      if (date !== "Unknown") {
        acc[date] = (acc[date] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const barChartData = Object.entries(jobsPerDay)
    .map(([date, count]) => ({
      date,
      count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7) // Last 7 days

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of scraping jobs state and history
          </p>
        </div>
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

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Jobs Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barChartData}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
                <Bar
                  dataKey="count"
                  fill="currentColor"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
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
                      <TableRow key={job.id}>
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
                              <Button variant="ghost" size="icon" asChild>
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
                              <Button variant="ghost" size="icon" asChild>
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
  )
}
