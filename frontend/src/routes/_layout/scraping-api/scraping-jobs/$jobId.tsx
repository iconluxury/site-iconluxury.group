import { useQuery } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import React, { useEffect, useState } from "react"
import { FiFileText } from "react-icons/fi"
import InfiniteScroll from "react-infinite-scroll-component"
import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog"
import { Input } from "../../../../components/ui/input"
import { Progress } from "../../../../components/ui/progress"
import { ScrollArea } from "../../../../components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs"
import useCustomToast from "../../../../hooks/useCustomToast"

// Interfaces
interface JobDetails {
  id: number
  inputFile: string
  fileLocationUrl: string
  fileLocationURLComplete?: string
  imageStart: string
  imageEnd?: string
  fileStart: string
  fileEnd?: string
  userId?: number
  userEmail?: string
  logFileUrl: string | null
  userHeaderIndex?: string
  user: string
  rec: number
  img: number
  apiUsed: string
  resultFile: string
  results: ResultItem[]
  records: RecordItem[]
}

// Interface for the progress data from the API
interface ProgressData {
  fileId: number
  totalRecords: number
  step1Completed: number
  step1Progress: number
  step2Completed: number
  step2Progress: number
  step3Completed: number
  step3Progress: number
  step4Completed: number
  step4Progress: number
}

interface ResultItem {
  resultId: number
  entryId: number
  imageUrl: string
  imageDesc: string
  imageSource: string
  createTime: string
  imageUrlThumbnail: string
  sortOrder: number
  imageIsFashion: number
  aiCaption: string | null
  aiJson: string | null
  aiLabel: string | null
}

interface RecordItem {
  entryId: number
  fileId: number
  excelRowId: number
  productModel: string
  productBrand: string
  createTime: string
  step1: string | null
  step2: string | null
  step3: string | null
  step4: string | null
  completeTime: string | null
  productColor: string
  productCategory: string
  excelRowImageRef: string | null
}

interface LogDisplayProps {
  logUrl: string | null
}

interface DetailsModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  data: Record<string, any> | null
}

interface SearchRowsTabProps {
  job: JobDetails
  searchQuery: string // Added to support search functionality
}

// LogDisplay Component
const LogDisplay: React.FC<LogDisplayProps> = ({ logUrl }) => {
  const [logContent, setLogContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useCustomToast()

  useEffect(() => {
    const fetchLog = async () => {
      if (!logUrl) return
      setIsLoading(true)
      try {
        const response = await fetch(logUrl)
        if (!response.ok) throw new Error("Failed to fetch log")
        const text = await response.text()
        setLogContent(text)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred"
        setError(errorMessage)
        showToast("Log Fetch Error", errorMessage, "error")
      } finally {
        setIsLoading(false)
      }
    }
    fetchLog()
  }, [logUrl, showToast])

  if (isLoading)
    return <Loader2 className="h-4 w-4 animate-spin text-green-500" />
  if (error) return <p className="text-red-500">{error}</p>
  if (!logContent)
    return <p className="text-muted-foreground">No log content available</p>

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30 text-foreground">
      <pre className="whitespace-pre-wrap break-words m-0 text-xs">
        {logContent}
      </pre>
    </ScrollArea>
  )
}

// OverviewTab Component
interface OverviewTabProps {
  job: JobDetails
  sortBy: "match" | "linesheet" | null
  setSortBy: (value: "match" | "linesheet" | null) => void
  fetchJobData: () => Promise<void>
  setActiveTab: (index: number) => void
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  job,
  fetchJobData,
  setActiveTab,
}) => {
  const navigate = useNavigate()
  const [isRestarting, setIsRestarting] = useState(false)
  const [isCreatingXLS, setIsCreatingXLS] = useState(false)
  const [isMatchAISort, setIsMatchAISort] = useState(false)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [isInitialSort, setIsInitialSort] = useState(false)
  const [isSearchSort, setIsSearchSort] = useState(false)
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const showToast = useCustomToast()
  const [progressData, setProgressData] = useState<ProgressData | null>(null)

  // Effect to poll for job progress if the job is not yet complete
  useEffect(() => {
    if (job.fileEnd || !job.id) {
      setProgressData(null) // Clear progress if job is done
      return
    }

    let isCancelled = false

    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `https://external.iconluxury.group/api/scraping-jobs/${job.id}/progress`,
        )
        if (response.ok) {
          const data: ProgressData = await response.json()
          if (!isCancelled) {
            setProgressData(data)
          }
        } else {
          console.error("Failed to fetch job progress:", response.statusText)
        }
      } catch (error) {
        console.error("Error fetching job progress:", error)
      }
    }

    fetchProgress() // Initial fetch
    const intervalId = setInterval(fetchProgress, 5000) // Poll every 5 seconds

    return () => {
      isCancelled = true
      clearInterval(intervalId) // Cleanup on component unmount or dependency change
    }
  }, [job.id, job.fileEnd])

  const [sortConfig, setSortConfig] = useState<{
    key: "domain" | "totalResults" | "positiveSortOrderCount"
    direction: "ascending" | "descending"
  }>({
    key: "positiveSortOrderCount",
    direction: "descending",
  })

  const getDomain = (url: string): string => {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, "")
    } catch {
      return "unknown"
    }
  }

  const domainData = job.results.reduce(
    (acc, result) => {
      const domain = getDomain(result.imageSource)
      if (!acc[domain]) {
        acc[domain] = {
          totalResults: 0,
          positiveSortOrderCount: 0,
          entryIds: new Set<number>(),
        }
      }
      acc[domain].totalResults += 1
      if (result.sortOrder > 0) {
        acc[domain].positiveSortOrderCount += 1
        acc[domain].entryIds.add(result.entryId)
      }
      return acc
    },
    {} as Record<
      string,
      {
        totalResults: number
        positiveSortOrderCount: number
        entryIds: Set<number>
      }
    >,
  )

  const topDomains = Object.entries(domainData)
    .map(([domain, data]) => ({
      domain,
      totalResults: data.totalResults,
      positiveSortOrderCount: data.positiveSortOrderCount,
      entryIds: Array.from(data.entryIds),
    }))
    .sort((a, b) => b.positiveSortOrderCount - a.positiveSortOrderCount)
    .slice(0, 20)

  const sortedTopDomains = [...topDomains].sort((a, b) => {
    if (sortConfig.key === "domain") {
      const aValue = a.domain.toLowerCase()
      const bValue = b.domain.toLowerCase()
      return sortConfig.direction === "ascending"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    if (sortConfig.key === "totalResults") {
      return sortConfig.direction === "ascending"
        ? a.totalResults - b.totalResults
        : b.totalResults - a.totalResults
    }
    if (sortConfig.key === "positiveSortOrderCount") {
      return sortConfig.direction === "ascending"
        ? a.positiveSortOrderCount - b.positiveSortOrderCount
        : b.positiveSortOrderCount - a.positiveSortOrderCount
    }
    return 0
  })

  const handleSort = (
    key: "domain" | "totalResults" | "positiveSortOrderCount",
  ) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction:
            prev.direction === "ascending" ? "descending" : "ascending",
        }
      }
      return { key, direction: "ascending" }
    })
  }

  const handleDomainClick = (domain: string, entryId: number) => {
    navigate({
      to: "/scraping-api/scraping-jobs/$jobId",
      params: { jobId: String(job.id) },
      search: { activeTab: "2", domain, entryId: String(entryId) },
    })
    setActiveTab(2) // Switch to "Results" tab
  }

  const handleApiCall = async (
    url: string,
    method: "GET" | "POST",
    setLoading: (value: boolean) => void,
    successMessage: string,
    file_id?: string, // Consider making this required if the API always needs it
  ) => {
    setLoading(true)
    try {
      const headers: Record<string, string> = { Accept: "application/json" }
      if (method === "POST") headers["Content-Type"] = "application/json"

      // Ensure file_id_db is included and valid (match API expectation)
      if (!file_id) {
        throw new Error("file_id is required but was not provided")
      }
      const urlWithParams = `${url}?file_id=${file_id}` // Use file_id_db instead of file_id

      const response = await fetch(urlWithParams, {
        method,
        headers,
        body:
          method === "POST" ? JSON.stringify({ file_id: file_id }) : undefined, // Include body for POST
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`,
        )
      }

      const data = await response.json()
      setLoading(false)
      showToast(
        "Success",
        `${successMessage}: ${data.message || "Completed"}`,
        "success",
      )
      fetchJobData()
    } catch (error) {
      setLoading(false)
      showToast(
        "Error",
        `Failed to ${successMessage.toLowerCase()}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      )
    }
  }
  const handleInitialSort = () =>
    handleApiCall(
      "https://dev-image-distro.popovtech.com/initial_sort/",
      "GET",
      setIsInitialSort,
      "Initial Sort",
      job.id.toString(),
    )

  const handleSearchSort = () =>
    handleApiCall(
      "https://dev-image-distro.popovtech.com/search_sort/",
      "GET",
      setIsSearchSort,
      "Search Sort",
      job.id.toString(),
    )

  const handleRestartClick = () =>
    handleApiCall(
      "https://dev-image-distro.popovtech.com/restart-failed-batch/",
      "POST",
      setIsRestarting,
      "Restart Failed Batch",
      job.id.toString(),
    )
  const handleGenerateDownload = () =>
    handleApiCall(
      "https://dev-image-distro.popovtech.com/generate-download-file/",
      "POST",
      setIsGeneratingDownload,
      "Generate Download File",
      job.id.toString(),
    )

  const handleProcessAI = () =>
    handleApiCall(
      "https://dev-image-distro.popovtech.com/process-ai-analysis/",
      "POST",
      setIsProcessingAI,
      "Process AI Analysis",
      job.id.toString(),
    )

  const progressSteps = [
    {
      label: "Step 1: Data Fetching",
      completed: progressData?.step1Completed,
      progress: progressData?.step1Progress,
    },
    //  { label: "Step 2: Image Validatio", completed: progressData?.step2Completed, progress: progressData?.step2Progress },
    //  { label: "Step 3: AI Processing", completed: progressData?.step3Completed, progress: progressData?.step3Progress },
    //  { label: "Step 4: Finalizing", completed: progressData?.step4Completed, progress: progressData?.step4Progress },
  ]

  return (
    <div className="p-4 bg-background">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-3 justify-end flex-wrap">
          <DetailsModal
            isOpen={isFileModalOpen}
            onClose={() => setIsFileModalOpen(false)}
            title={`File ${job.id}`}
            data={{
              ID: job.id,
              FileName: job.inputFile,
              FileLocationUrl: job.fileLocationUrl,
              FileLocationURLComplete: job.fileLocationURLComplete,
              ImageStartTime: job.imageStart,
              ImageCompleteTime: job.imageEnd,
              CreateFileStartTime: job.fileStart,
              CreateFileCompleteTime: job.fileEnd,
              UserID: job.userId,
              UserEmail: job.userEmail,
              LogFileURL: job.logFileUrl,
              UserHeaderIndex: job.userHeaderIndex,
            }}
          />
        </div>
      </div>

      {/* --- Progress Bar Section --- */}
      {progressData && !job.fileEnd && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {progressSteps.map((step, index) => (
                <div key={index}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-foreground">
                      {step.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {step.completed} / {progressData.totalRecords} records
                    </span>
                  </div>
                  <Progress value={step.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Input File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={job.fileLocationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-green-500 hover:underline break-all"
            >
              {job.inputFile}
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={job.fileEnd ? "default" : "secondary"}>
              {job.fileEnd ? "Completed" : "In Progress"}
            </Badge>
          </CardContent>
        </Card>
        {job.fileEnd && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Processing Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {(
                  (new Date(job.fileEnd).getTime() -
                    new Date(job.fileStart).getTime()) /
                  1000 /
                  60
                ).toFixed(2)}{" "}
                minutes
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {job.results.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Button size="sm" onClick={() => setIsFileModalOpen(true)}>
        File Metadata
      </Button>

      {job.results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2 text-foreground">
            Top Domains by Positive Sort Orders (Top 20)
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead
                    onClick={() => handleSort("domain")}
                    className="cursor-pointer text-foreground"
                  >
                    Domain{" "}
                    {sortConfig.key === "domain" &&
                      (sortConfig.direction === "ascending" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("totalResults")}
                    className="cursor-pointer text-foreground"
                  >
                    Total Results{" "}
                    {sortConfig.key === "totalResults" &&
                      (sortConfig.direction === "ascending" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("positiveSortOrderCount")}
                    className="cursor-pointer text-foreground"
                  >
                    Positive Sort Orders Count{" "}
                    {sortConfig.key === "positiveSortOrderCount" &&
                      (sortConfig.direction === "ascending" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTopDomains.map(
                  ({
                    domain,
                    totalResults,
                    positiveSortOrderCount,
                    entryIds,
                  }) => (
                    <TableRow key={domain}>
                      <TableCell>
                        <span
                          className="text-green-500 cursor-pointer hover:underline"
                          onClick={() =>
                            handleDomainClick(domain, entryIds[0] || 0)
                          }
                        >
                          {domain}
                        </span>
                      </TableCell>
                      <TableCell>{totalResults}</TableCell>
                      <TableCell>{positiveSortOrderCount}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

// DetailsModal Component
const DetailsModal: React.FC<DetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
}) => {
  const capitalizeKey = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()

  const renderValue = (key: string, value: any) => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground">N/A</span>
    let displayValue = value
    if (
      typeof value === "string" &&
      (key.toLowerCase().includes("description") ||
        key.toLowerCase().includes("aicaption"))
    ) {
      displayValue = value.replace(/\\u0026/g, "&").replace(/\\'/g, "'")
    }
    if (key.toLowerCase().includes("json") && value) {
      const jsonValue = typeof value === "string" ? JSON.parse(value) : value
      return (
        <ScrollArea className="max-h-[500px] bg-muted/30 p-3 rounded-md border border-border text-xs">
          <pre className="m-0 whitespace-pre-wrap text-blue-600">
            {JSON.stringify(jsonValue, null, 2)}
          </pre>
        </ScrollArea>
      )
    }
    if (
      typeof displayValue === "string" &&
      /^(https?:\/\/[^\s]+)$/.test(displayValue)
    ) {
      return (
        <a
          href={displayValue}
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {displayValue}
        </a>
      )
    }
    return <span>{displayValue}</span>
  }

  if (!data) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[90vw] max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="text-md text-muted-foreground">No data available</div>
        </DialogContent>
      </Dialog>
    )
  }

  const modalTitle = data.id ? `${title} (ID: ${data.id})` : title

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableBody>
            {Object.entries(data)
              .filter(([key]) => key.toLowerCase() !== "id")
              .map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium text-muted-foreground w-1/4 align-top">
                    {capitalizeKey(key)}
                  </TableCell>
                  <TableCell className="text-foreground break-words">
                    {renderValue(key, value)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}

