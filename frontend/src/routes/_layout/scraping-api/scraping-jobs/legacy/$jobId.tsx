import { useQuery } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import React, { useEffect, useState } from "react"
import { FiFileText } from "react-icons/fi"
import InfiniteScroll from "react-infinite-scroll-component"
import { Badge } from "../../../../../components/ui/badge"
import { Button } from "../../../../../components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog"
import { Input } from "../../../../../components/ui/input"
import { Progress } from "../../../../../components/ui/progress"
import { ScrollArea } from "../../../../../components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../../components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../../components/ui/tabs"
import useCustomToast from "../../../../../hooks/useCustomToast"
import { EXTERNAL_API_BASE } from "../../../../../utils"

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
          `${EXTERNAL_API_BASE}/api/scraping-jobs/${job.id}/progress`,
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

// ResultsTab Component with Domain and EntryId Filtering
interface ResultsTabProps {
  job: JobDetails
  sortBy: "match" | "linesheet" | null
  domain?: string
  entryId?: string
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const ResultsTab: React.FC<ResultsTabProps> = ({
  job,
  sortBy,
  domain,
  entryId,
  searchQuery,
}) => {
  const showToast = useCustomToast()
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const query = (searchQuery || "").trim().toLowerCase()
  const filteredResults = job.results.filter((result) => {
    const matchesSearchQuery =
      (result.imageDesc || "").toLowerCase().includes(query) ||
      (result.imageSource || "").toLowerCase().includes(query) ||
      (result.aiJson || "").toLowerCase().includes(query) ||
      (result.imageUrl || "").toLowerCase().includes(query) ||
      (result.aiCaption || "").toLowerCase().includes(query) ||
      (result.aiLabel || "").toLowerCase().includes(query) ||
      (result.createTime || "").toLowerCase().includes(query) ||
      result.entryId.toString().includes(query) // Ensures entryId is searchable
    result.resultId.toString().includes(query)

    const matchesDomain = domain
      ? new URL(result.imageSource).hostname
          .replace(/^www\./, "")
          .includes(domain)
      : true

    const matchesEntryId = entryId
      ? result.entryId.toString() === entryId
      : true

    return matchesSearchQuery && matchesDomain && matchesEntryId
  })

  const [sortConfigResults, setSortConfigResults] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)
  const [currentPageResults, setCurrentPageResults] = useState(0)
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">(
    "infinite",
  )
  const [displayCount, setDisplayCount] = useState(50)
  const itemsPerPage = 5

  const handleSortResults = (key: string) => {
    setSortConfigResults((prev) => {
      if (prev && prev.key === key) {
        return {
          key,
          direction:
            prev.direction === "ascending" ? "descending" : "ascending",
        }
      }
      return { key, direction: "ascending" }
    })
    setCurrentPageResults(0)
  }

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (a.sortOrder >= 0 && b.sortOrder < 0) return -1
    if (a.sortOrder < 0 && b.sortOrder >= 0) return 1
    if (sortConfigResults) {
      const { key, direction } = sortConfigResults
      const aValue = a[key as keyof ResultItem]
      const bValue = b[key as keyof ResultItem]
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ascending" ? aValue - bValue : bValue - aValue
      }
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      return direction === "ascending"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    }
    if (sortBy === "match" && query) {
      const aScore = (a.imageDesc || "").toLowerCase().indexOf(query)
      const bScore = (b.imageDesc || "").toLowerCase().indexOf(query)
      return aScore === -1 ? 1 : bScore === -1 ? -1 : aScore - bScore
    }
    if (sortBy === "linesheet") {
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    }
    return 0
  })

  const pageCountResults = Math.ceil(sortedResults.length / itemsPerPage)
  const hasThumbnails = sortedResults.some((result) => result.imageUrlThumbnail)

  const displayedResultsPagination = sortedResults.slice(
    currentPageResults * itemsPerPage,
    (currentPageResults + 1) * itemsPerPage,
  )
  const displayedResultsInfinite = sortedResults.slice(0, displayCount)

  const totalResults = sortedResults.length

  const shortenUrl = (url: string) => {
    if (!url) return ""
    return url
  }

  return (
    <div className="p-4 bg-background">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-lg font-bold text-foreground">
          Results ({totalResults})
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "pagination" ? "default" : "outline"}
            onClick={() =>
              setViewMode(viewMode === "pagination" ? "infinite" : "pagination")
            }
            className="p-2"
          >
            <FiFileText
              className={
                viewMode === "pagination" ? "text-white" : "text-green-500"
              }
            />
          </Button>
        </div>
      </div>
      <Card className="shadow-md border bg-background">
        <CardContent className="p-0">
          {viewMode === "pagination" ? (
            <>
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    {hasThumbnails && (
                      <TableHead className="w-[60px] text-foreground">
                        Excel Picture
                      </TableHead>
                    )}
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("entryId")}
                    >
                      Entry ID{" "}
                      {sortConfigResults?.key === "entryId" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("fileId")}
                    >
                      File ID{" "}
                      {sortConfigResults?.key === "fileId" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("excelRowId")}
                    >
                      Excel Row ID{" "}
                      {sortConfigResults?.key === "excelRowId" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("productModel")}
                    >
                      Style #{" "}
                      {sortConfigResults?.key === "productModel" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("productBrand")}
                    >
                      Brand{" "}
                      {sortConfigResults?.key === "productBrand" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead className="w-[80px] text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedResultsPagination.map((result) => (
                    <TableRow key={result.resultId}>
                      <TableCell className="w-[60px]">
                        {result.imageUrlThumbnail ? (
                          <img
                            src={result.imageUrlThumbnail}
                            alt={result.imageDesc || "No description"}
                            className="max-w-[80px] max-h-[80px] object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No image
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {result.resultId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {result.entryId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] break-all">
                        <a
                          href={result.imageUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500"
                        >
                          {shortenUrl(result.imageUrl)}
                        </a>
                      </TableCell>
                      <TableCell className="w-[120px] text-foreground">
                        {result.imageDesc || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] break-all">
                        <a
                          href={result.imageSource || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500"
                        >
                          {shortenUrl(result.imageSource)}
                        </a>
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {result.sortOrder || "0"}
                      </TableCell>
                      <TableCell className="w-[80px]">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result)
                            setIsResultModalOpen(true)
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayedResultsPagination.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={hasThumbnails ? 7 : 6}
                        className="text-center text-muted-foreground"
                      >
                        No records match your search query on this page.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {pageCountResults > 1 && (
                <div className="flex justify-center mt-4 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCurrentPageResults(0)}
                    disabled={currentPageResults === 0}
                  >
                    First
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentPageResults((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={currentPageResults === 0}
                  >
                    Previous
                  </Button>
                  <span className="mx-2">
                    Page {currentPageResults + 1} of {pageCountResults}
                  </span>
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentPageResults((prev) =>
                        Math.min(prev + 1, pageCountResults - 1),
                      )
                    }
                    disabled={currentPageResults === pageCountResults - 1}
                  >
                    Next
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentPageResults(pageCountResults - 1)}
                    disabled={currentPageResults === pageCountResults - 1}
                  >
                    Last
                  </Button>
                </div>
              )}
            </>
          ) : (
            <InfiniteScroll
              dataLength={displayCount}
              next={() => setDisplayCount((prev) => prev + 50)}
              hasMore={displayCount < sortedResults.length}
              loader={
                <div className="p-4 text-center text-muted-foreground">
                  Loading more results...
                </div>
              }
              endMessage={
                <div className="p-4 text-center text-muted-foreground">
                  No more results to load.
                </div>
              }
              height={600}
            >
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    {hasThumbnails && (
                      <TableHead className="w-[60px] text-foreground">
                        Excel Picture
                      </TableHead>
                    )}
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("entryId")}
                    >
                      Entry ID{" "}
                      {sortConfigResults?.key === "entryId" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("fileId")}
                    >
                      File ID{" "}
                      {sortConfigResults?.key === "fileId" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("excelRowId")}
                    >
                      Excel Row ID{" "}
                      {sortConfigResults?.key === "excelRowId" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("productModel")}
                    >
                      Style #{" "}
                      {sortConfigResults?.key === "productModel" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortResults("productBrand")}
                    >
                      Brand{" "}
                      {sortConfigResults?.key === "productBrand" &&
                        (sortConfigResults.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead className="w-[80px] text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedResultsInfinite.map((result) => (
                    <TableRow key={result.resultId}>
                      <TableCell className="w-[60px]">
                        {result.imageUrlThumbnail ? (
                          <img
                            src={result.imageUrlThumbnail}
                            alt={result.imageDesc || "No description"}
                            className="max-w-[80px] max-h-[80px] object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No image
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {result.resultId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {result.entryId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] break-all">
                        <a
                          href={result.imageUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500"
                        >
                          {shortenUrl(result.imageUrl)}
                        </a>
                      </TableCell>
                      <TableCell className="w-[120px] text-foreground">
                        {result.imageDesc || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] break-all">
                        <a
                          href={result.imageSource || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500"
                        >
                          {shortenUrl(result.imageSource)}
                        </a>
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {result.sortOrder || "0"}
                      </TableCell>
                      <TableCell className="w-[80px]">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result)
                            setIsResultModalOpen(true)
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>
      <DetailsModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title={`Result ${selectedResult?.resultId || "Details"}`}
        data={selectedResult}
      />
    </div>
  )
}

// RecordsTab Component
interface RecordsTabProps {
  job: JobDetails
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const RecordsTab: React.FC<RecordsTabProps> = ({ job, searchQuery }) => {
  const showToast = useCustomToast()
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  const [sortConfigRecords, setSortConfigRecords] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)
  const [currentPageRecords, setCurrentPageRecords] = useState(0)
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">(
    "infinite",
  )
  const [displayCount, setDisplayCount] = useState(50)
  const itemsPerPage = 5

  const handleSortRecords = (key: string) => {
    setSortConfigRecords((prev) => {
      if (prev && prev.key === key) {
        return {
          key,
          direction:
            prev.direction === "ascending" ? "descending" : "ascending",
        }
      }
      return { key, direction: "ascending" }
    })
    setCurrentPageRecords(0)
  }

  const query = (searchQuery || "").trim().toLowerCase()
  const filteredRecords = job.records.filter(
    (record) =>
      (record.productModel || "").toLowerCase().includes(query) ||
      (record.productBrand || "").toLowerCase().includes(query) ||
      (record.productColor || "").toLowerCase().includes(query) ||
      (record.productCategory || "").toLowerCase().includes(query) ||
      record.entryId.toString().includes(query) || // Ensures entryId is searchable
      record.excelRowId.toString().includes(query),
  )
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortConfigRecords) {
      const { key, direction } = sortConfigRecords
      const aValue = a[key as keyof RecordItem]
      const bValue = b[key as keyof RecordItem]
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ascending" ? aValue - bValue : bValue - aValue
      }
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      return direction === "ascending"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    }
    return 0
  })

  const pageCountRecords = Math.ceil(sortedRecords.length / itemsPerPage)
  const displayedRecordsPagination = sortedRecords.slice(
    currentPageRecords * itemsPerPage,
    (currentPageRecords + 1) * itemsPerPage,
  )
  const displayedRecordsInfinite = sortedRecords.slice(0, displayCount)

  const totalRecords = sortedRecords.length
  const hasThumbnails = filteredRecords.some(
    (record) => record.excelRowImageRef,
  )

  return (
    <div className="p-4 bg-background">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-lg font-bold text-foreground">
          Records ({totalRecords})
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "pagination" ? "default" : "outline"}
            onClick={() =>
              setViewMode(viewMode === "pagination" ? "infinite" : "pagination")
            }
            className="p-2"
          >
            <FiFileText
              className={
                viewMode === "pagination" ? "text-white" : "text-green-500"
              }
            />
          </Button>
        </div>
      </div>
      <Card className="shadow-md border bg-background">
        <CardContent className="p-0">
          {viewMode === "pagination" ? (
            <>
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    {hasThumbnails && (
                      <TableHead className="w-[60px] text-foreground">
                        Excel Picture
                      </TableHead>
                    )}
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("entryId")}
                    >
                      Entry ID{" "}
                      {sortConfigRecords?.key === "entryId" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("fileId")}
                    >
                      File ID{" "}
                      {sortConfigRecords?.key === "fileId" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("excelRowId")}
                    >
                      Excel Row ID{" "}
                      {sortConfigRecords?.key === "excelRowId" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("productModel")}
                    >
                      Style #{" "}
                      {sortConfigRecords?.key === "productModel" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("productBrand")}
                    >
                      Brand{" "}
                      {sortConfigRecords?.key === "productBrand" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead className="w-[80px] text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRecordsPagination.map((record) => (
                    <TableRow key={record.entryId}>
                      {hasThumbnails && (
                        <TableCell className="w-[60px]">
                          {record.excelRowImageRef ? (
                            <img
                              src={record.excelRowImageRef}
                              alt={
                                record.productModel ||
                                `Record ID ${record.entryId}`
                              }
                              className="max-w-[80px] max-h-[80px] object-cover cursor-pointer"
                              onClick={() => {
                                if (record.excelRowImageRef)
                                  window.open(record.excelRowImageRef, "_blank")
                              }}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No picture
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="w-[80px] text-foreground">
                        {record.entryId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {record.fileId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {record.excelRowId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] text-foreground">
                        {record.productModel || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] text-foreground">
                        {record.productBrand || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px]">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record)
                            setIsRecordModalOpen(true)
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayedRecordsPagination.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={hasThumbnails ? 7 : 6}
                        className="text-center text-muted-foreground"
                      >
                        No records match your search query on this page.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {pageCountRecords > 1 && (
                <div className="flex justify-center mt-4 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCurrentPageRecords(0)}
                    disabled={currentPageRecords === 0}
                  >
                    First
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentPageRecords((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={currentPageRecords === 0}
                  >
                    Previous
                  </Button>
                  <span className="mx-2">
                    Page {currentPageRecords + 1} of {pageCountRecords}
                  </span>
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentPageRecords((prev) =>
                        Math.min(prev + 1, pageCountRecords - 1),
                      )
                    }
                    disabled={currentPageRecords === pageCountRecords - 1}
                  >
                    Next
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentPageRecords(pageCountRecords - 1)}
                    disabled={currentPageRecords === pageCountRecords - 1}
                  >
                    Last
                  </Button>
                </div>
              )}
            </>
          ) : (
            <InfiniteScroll
              dataLength={displayCount}
              next={() => setDisplayCount((prev) => prev + 50)}
              hasMore={displayCount < sortedRecords.length}
              loader={
                <div className="p-4 text-center text-muted-foreground">
                  Loading more records...
                </div>
              }
              endMessage={
                <div className="p-4 text-center text-muted-foreground">
                  No more records to load.
                </div>
              }
            >
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    {hasThumbnails && (
                      <TableHead className="w-[60px] text-foreground">
                        Excel Picture
                      </TableHead>
                    )}
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("entryId")}
                    >
                      Entry ID{" "}
                      {sortConfigRecords?.key === "entryId" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("fileId")}
                    >
                      File ID{" "}
                      {sortConfigRecords?.key === "fileId" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("excelRowId")}
                    >
                      Excel Row ID{" "}
                      {sortConfigRecords?.key === "excelRowId" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("productModel")}
                    >
                      Style #{" "}
                      {sortConfigRecords?.key === "productModel" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer text-foreground"
                      onClick={() => handleSortRecords("productBrand")}
                    >
                      Brand{" "}
                      {sortConfigRecords?.key === "productBrand" &&
                        (sortConfigRecords.direction === "ascending"
                          ? "↑"
                          : "↓")}
                    </TableHead>
                    <TableHead className="w-[80px] text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRecordsInfinite.map((record) => (
                    <TableRow key={record.entryId}>
                      {hasThumbnails && (
                        <TableCell className="w-[60px]">
                          {record.excelRowImageRef ? (
                            <img
                              src={record.excelRowImageRef}
                              alt={
                                record.productModel ||
                                `Record ID ${record.entryId}`
                              }
                              className="max-w-[80px] max-h-[80px] object-cover cursor-pointer"
                              onClick={() => {
                                if (record.excelRowImageRef)
                                  window.open(record.excelRowImageRef, "_blank")
                              }}
                              onError={(e) => {
                                showToast(
                                  "Image Load Failed",
                                  `Failed to load S3 image: ${record.excelRowImageRef}`,
                                  "warning",
                                )
                                e.currentTarget.style.display = "none"
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No picture
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="w-[80px] text-foreground">
                        {record.entryId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {record.fileId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px] text-foreground">
                        {record.excelRowId || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] text-foreground">
                        {record.productModel || "N/A"}
                      </TableCell>
                      <TableCell className="w-[120px] text-foreground">
                        {record.productBrand || "N/A"}
                      </TableCell>
                      <TableCell className="w-[80px]">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record)
                            setIsRecordModalOpen(true)
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayedRecordsInfinite.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={hasThumbnails ? 7 : 6}
                        className="text-center text-muted-foreground"
                      >
                        No records match your search query on this page.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>
      <DetailsModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Record ${selectedRecord?.entryId || "Details"}`}
        data={selectedRecord}
      />
    </div>
  )
}

// LogsTab Component
const LogsTab = ({ job }: { job: JobDetails }) => {
  return (
    <div className="p-4 bg-background">
      <div className="flex justify-between items-center mb-4">
        {job.logFileUrl && (
          <Button
            size="sm"
            onClick={() => window.open(job.logFileUrl as string, "_blank")}
          >
            Download Log File
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-6">
        <Card className="shadow-md border bg-background">
          <CardContent className="p-6">
            <h3 className="text-md font-semibold mb-2 text-foreground">
              Timeline Events
            </h3>
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-foreground">Event</TableHead>
                  <TableHead className="text-foreground">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-foreground">File Start</TableCell>
                  <TableCell className="text-foreground">
                    {new Date(job.fileStart).toLocaleString()}
                  </TableCell>
                </TableRow>
                {job.fileEnd && (
                  <TableRow>
                    <TableCell className="text-foreground">
                      File Roughly
                    </TableCell>
                    <TableCell className="text-foreground">
                      {new Date(job.fileEnd).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="text-foreground">Image Start</TableCell>
                  <TableCell className="text-foreground">
                    {new Date(job.imageStart).toLocaleString()}
                  </TableCell>
                </TableRow>
                {job.imageEnd && (
                  <TableRow>
                    <TableCell className="text-foreground">Image End</TableCell>
                    <TableCell className="text-foreground">
                      {new Date(job.imageEnd).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="shadow-md border bg-background">
          <CardContent className="p-6">
            <h3 className="text-md font-semibold mb-2 text-foreground">
              Log File Preview
            </h3>
            <LogDisplay logUrl={job.logFileUrl} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// SearchRowsTab Component with Search, Pagination, and Infinite Scroll
const SearchRowsTab: React.FC<SearchRowsTabProps> = ({ job, searchQuery }) => {
  const showToast = useCustomToast()
  const [showFileDetails, setShowFileDetails] = useState(true)
  const [showResultDetails, setShowResultDetails] = useState(false)
  const [numImages, setNumImages] = useState(1)
  const [hideEmptyRows, setHideEmptyRows] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: string | null
    direction: "ascending" | "descending"
  }>({ key: null, direction: "ascending" })
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">(
    "infinite",
  )
  const [currentPage, setCurrentPage] = useState(0)
  const [displayCount, setDisplayCount] = useState(50)
  const itemsPerPage = 5

  const query = (searchQuery || "").trim().toLowerCase()
  console.log("Search Query:", searchQuery, "Processed Query:", query) // Debugging

  const filteredRecords = job.records.filter(
    (record) =>
      (record.productModel || "").toLowerCase().includes(query) ||
      (record.productBrand || "").toLowerCase().includes(query) ||
      (record.productColor || "").toLowerCase().includes(query) ||
      (record.productCategory || "").toLowerCase().includes(query) ||
      record.entryId.toString().includes(query) ||
      record.excelRowId.toString().includes(query),
  )
  console.log("Filtered Records:", filteredRecords) // Debugging

  useEffect(() => {
    const maxImages = showResultDetails ? 1 : 5
    setNumImages((prev) => (prev > maxImages ? maxImages : prev))
  }, [showResultDetails])

  const getImagesForEntry = (entryId: number, limit: number): ResultItem[] => {
    const filteredResults = job.results.filter(
      (r) => r.entryId === entryId && r.sortOrder > 0,
    )
    return [...filteredResults]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, limit)
  }

  const getPositiveSortCountForEntry = (entryId: number): number => {
    return job.results.filter((r) => r.entryId === entryId && r.sortOrder > 0)
      .length
  }

  const getTotalImageCountForEntry = (entryId: number): number => {
    return job.results.filter((r) => r.entryId === entryId).length
  }

  const shortenUrl = (url: string): string => {
    if (!url) return ""
    return url
  }

  const googleSearch = (model: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(model || "")}&udm=2`
  const googleSearchBrandModelUrl = (model: string, brand: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(
      `${brand || ""} ${model || ""}`,
    )}&udm=2`

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    url: string,
  ) => {
    e.preventDefault()
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleIncreaseImages = () => {
    setShowResultDetails(false)
    const maxImages = showResultDetails ? 1 : 5
    setNumImages((prev) => Math.min(prev + 1, maxImages))
  }

  const handleDecreaseImages = () => {
    setNumImages((prev) => Math.max(prev - 1, 1))
  }

  const handleRowIdClick = (
    e: React.MouseEvent<HTMLElement, MouseEvent>,
    entryId: number,
  ) => {
    e.preventDefault()
    const url = `${
      window.location.pathname
    }?activeTab=1&search=${encodeURIComponent(entryId.toString() || "")}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      const newDirection =
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending"
      return { key, direction: newDirection }
    })
    setCurrentPage(0)
  }

  const displayedRecords = hideEmptyRows
    ? filteredRecords.filter(
        (record) => getPositiveSortCountForEntry(record.entryId) > 0,
      )
    : filteredRecords

  const sortedRecords = [...displayedRecords].sort((a, b) => {
    if (!sortConfig.key) return 0
    let aValue: any
    let bValue: any
    if (sortConfig.key === "positiveSortCount") {
      aValue = getPositiveSortCountForEntry(a.entryId)
      bValue = getPositiveSortCountForEntry(b.entryId)
    } else if (sortConfig.key === "totalImageCount") {
      aValue = getTotalImageCountForEntry(a.entryId)
      bValue = getTotalImageCountForEntry(b.entryId)
    } else {
      aValue = a[sortConfig.key as keyof RecordItem] || ""
      bValue = b[sortConfig.key as keyof RecordItem] || ""
    }
    if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1
    return 0
  })

  const pageCount = Math.ceil(sortedRecords.length / itemsPerPage)
  const displayedRecordsPagination = sortedRecords.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  )
  const displayedRecordsInfinite = sortedRecords.slice(0, displayCount)

  const hasThumbnails = sortedRecords.some((record) => record.excelRowImageRef)

  const renderTable = (records: RecordItem[]) => (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead
            className="w-[90px] cursor-pointer text-foreground"
            onClick={() => handleSort("excelRowId")}
          >
            Row #{" "}
            {sortConfig.key === "excelRowId" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </TableHead>

          {showFileDetails && (
            <TableHead className="w-[120px] cursor-pointer">
              Color Name{" "}
              {sortConfig.key === "productColor" &&
                (sortConfig.direction === "ascending" ? "↑" : "↓")}
            </TableHead>
          )}
          {showFileDetails && (
            <TableHead
              className="w-[120px] cursor-pointer bg-gray-200 text-foreground"
              onClick={() => handleSort("productCategory")}
            >
              Category{" "}
              {sortConfig.key === "productCategory" &&
                (sortConfig.direction === "ascending" ? "↑" : "↓")}
            </TableHead>
          )}
          {showFileDetails && hasThumbnails && (
            <TableHead className="w-[100px] bg-gray-200 text-foreground">
              Excel Picture
            </TableHead>
          )}
          {Array.from({ length: numImages }).map((_, index) => (
            <React.Fragment key={`header-${index}`}>
              <TableHead className="w-[100px] text-foreground">
                Picture {index + 1}
              </TableHead>
              {showResultDetails && (
                <TableHead className="w-[200px] bg-gray-200 text-foreground">
                  Picture Detail {index + 1}
                </TableHead>
              )}
            </React.Fragment>
          ))}
          <TableHead
            className="w-[150px] cursor-pointer text-foreground"
            onClick={() => handleSort("productModel")}
          >
            Style #{" "}
            {sortConfig.key === "productModel" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </TableHead>
          <TableHead
            className="w-[150px] cursor-pointer text-foreground"
            onClick={() => handleSort("productBrand")}
          >
            Brand{" "}
            {sortConfig.key === "productBrand" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </TableHead>
          <TableHead
            className="w-[100px] cursor-pointer text-foreground"
            onClick={() => handleSort("totalImageCount")}
          >
            Total Image{" "}
            {sortConfig.key === "totalImageCount" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </TableHead>
          <TableHead
            className="w-[100px] cursor-pointer text-foreground"
            onClick={() => handleSort("positiveSortCount")}
          >
            Positive Count{" "}
            {sortConfig.key === "positiveSortCount" &&
              (sortConfig.direction === "ascending" ? "↑" : "↓")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const imagedetails = getImagesForEntry(record.entryId, numImages)
          const totalImageCount = getTotalImageCountForEntry(record.entryId)
          const positiveSortCount = getPositiveSortCountForEntry(record.entryId)
          return (
            <TableRow
              key={record.entryId}
              className={`hover:bg-muted/30 ${
                positiveSortCount === 0 && !hideEmptyRows ? "opacity-80" : ""
              }`}
            >
              <TableCell className="w-[90px]">
                <span
                  className="cursor-pointer text-green-500 hover:underline"
                  onClick={(e) => handleRowIdClick(e, record.entryId)}
                >
                  {record.excelRowId}
                </span>
              </TableCell>
              {showFileDetails && (
                <TableCell className="w-[120px] bg-muted/30">
                  {record.productCategory || (
                    <span className="text-xs text-muted-foreground">
                      No category
                    </span>
                  )}
                </TableCell>
              )}
              {showFileDetails && (
                <TableCell className="w-[120px] bg-muted/30">
                  {record.productColor || (
                    <span className="text-xs text-muted-foreground">
                      No color
                    </span>
                  )}
                </TableCell>
              )}
              {showFileDetails && hasThumbnails && (
                <TableCell className="w-[80px] bg-muted/30">
                  {record.excelRowImageRef ? (
                    <img
                      src={record.excelRowImageRef}
                      alt={record.productModel || `Record ID ${record.entryId}`}
                      className="max-w-[80px] max-h-[80px] object-cover cursor-pointer"
                      onClick={() => {
                        if (record.excelRowImageRef)
                          window.open(record.excelRowImageRef, "_blank")
                      }}
                      onError={(e) => {
                        showToast(
                          "Image Load Failed",
                          `Failed to load S3 image: ${record.excelRowImageRef}`,
                          "warning",
                        )
                        e.currentTarget.style.display = "none"
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No picture
                    </span>
                  )}
                </TableCell>
              )}
              {imagedetails.map((image, index) => (
                <React.Fragment key={index}>
                  <TableCell className="w-[80px]">
                    <img
                      src={image.imageUrlThumbnail}
                      alt={image.imageDesc || "No description"}
                      className="max-w-[80px] max-h-[80px] object-cover"
                      onError={() =>
                        showToast(
                          "Image Error",
                          `Failed to load image ${index + 1} for record ${
                            record.entryId
                          }`,
                          "error",
                        )
                      }
                    />
                  </TableCell>
                  {showResultDetails && (
                    <TableCell className="w-[200px] bg-muted/30">
                      <div className="break-all">
                        <p className="text-xs">
                          <a
                            href={googleSearch(image.imageDesc)}
                            onClick={(e) =>
                              handleLinkClick(e, googleSearch(image.imageDesc))
                            }
                            style={{ color: "#1a73e8" }}
                          >
                            {image.imageDesc || "N/A"}
                          </a>
                        </p>
                        <p className="text-xs text-green-500">
                          <a
                            href={image.imageSource}
                            onClick={(e) =>
                              handleLinkClick(e, image.imageSource)
                            }
                          >
                            {shortenUrl(image.imageSource)}
                          </a>
                        </p>
                        <p className="text-xs text-green-500">
                          <a
                            href={image.imageUrl}
                            onClick={(e) => handleLinkClick(e, image.imageUrl)}
                          >
                            {shortenUrl(image.imageUrl)}
                          </a>
                        </p>
                        {image.aiCaption && (
                          <p className="text-xs text-muted-foreground">
                            AI Caption: {image.aiCaption}
                          </p>
                        )}
                        {image.aiLabel && (
                          <p className="text-xs text-muted-foreground">
                            AI Label: {image.aiLabel}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  )}
                </React.Fragment>
              ))}
              {Array.from({ length: numImages - imagedetails.length }).map(
                (_, index) => (
                  <React.Fragment key={`empty-${record.entryId}-${index}`}>
                    <TableCell className="w-[80px]">
                      <span className="text-xs text-muted-foreground">
                        No picture
                      </span>
                    </TableCell>
                    {showResultDetails && (
                      <TableCell className="w-[200px] bg-muted/30">
                        <span className="text-xs text-muted-foreground">
                          No picture detail
                        </span>
                      </TableCell>
                    )}
                  </React.Fragment>
                ),
              )}
              <TableCell className="w-[150px]">
                {record.productModel ? (
                  <a
                    href={googleSearch(record.productModel)}
                    onClick={(e) =>
                      handleLinkClick(e, googleSearch(record.productModel))
                    }
                  >
                    <span className="text-green-500">
                      {record.productModel}
                    </span>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No style
                  </span>
                )}
              </TableCell>
              <TableCell className="w-[150px]">
                {record.productBrand ? (
                  <a
                    href={googleSearchBrandModelUrl(
                      record.productModel,
                      record.productBrand,
                    )}
                    onClick={(e) =>
                      handleLinkClick(
                        e,
                        googleSearchBrandModelUrl(
                          record.productModel,
                          record.productBrand,
                        ),
                      )
                    }
                  >
                    <span className="text-green-500">
                      {record.productBrand}
                    </span>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No brand
                  </span>
                )}
              </TableCell>
              <TableCell className="w-[100px]">
                {totalImageCount === 0 ? (
                  <span className="text-xs text-muted-foreground">0</span>
                ) : (
                  <span className="text-foreground">{totalImageCount}</span>
                )}
              </TableCell>
              <TableCell className="w-[100px]">
                {positiveSortCount === 0 ? (
                  <span className="text-xs text-muted-foreground">0</span>
                ) : (
                  <span className="text-foreground">{positiveSortCount}</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  return (
    <div className="p-4 bg-background">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-background z-10 py-5 border-b border-border">
        <h3 className="text-lg font-bold text-foreground">
          File Rows ({sortedRecords.length})
        </h3>
        <div className="flex gap-3 justify-end">
          <Button
            size="sm"
            onClick={() => setShowResultDetails(!showResultDetails)}
          >
            {showResultDetails ? "- Picture Details" : "+ Picture Details"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowFileDetails(!showFileDetails)}
          >
            {showFileDetails ? "- File Details" : "+ File Details"}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              job.records.length > 0 && setHideEmptyRows(!hideEmptyRows)
            }
            variant={job.records.length === 0 ? "outline" : "default"}
          >
            {hideEmptyRows ? "Show All Rows" : "Hide Empty Rows"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleDecreaseImages}
              disabled={numImages <= 1}
            >
              -
            </Button>
            <span className="text-foreground">{numImages}</span>
            <Button
              size="sm"
              onClick={handleIncreaseImages}
              disabled={numImages >= (showResultDetails ? 1 : 5)}
            >
              +
            </Button>
          </div>
          <Button
            size="sm"
            className={
              viewMode === "pagination"
                ? "bg-green-500"
                : "bg-background border border-border"
            }
            onClick={() =>
              setViewMode(viewMode === "pagination" ? "infinite" : "pagination")
            }
          >
            <FiFileText
              className={
                viewMode === "pagination" ? "text-white" : "text-green-500"
              }
            />
          </Button>
        </div>
      </div>

      <Card className="shadow-md border bg-background">
        <CardContent className="p-0">
          {viewMode === "pagination" ? (
            <>
              {renderTable(displayedRecordsPagination)}
              {pageCount > 1 && (
                <div className="flex justify-center mt-4 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                  >
                    First
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="mx-2">
                    Page {currentPage + 1} of {pageCount}
                  </span>
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, pageCount - 1),
                      )
                    }
                    disabled={currentPage === pageCount - 1}
                  >
                    Next
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentPage(pageCount - 1)}
                    disabled={currentPage === pageCount - 1}
                  >
                    Last
                  </Button>
                </div>
              )}
            </>
          ) : (
            <InfiniteScroll
              dataLength={displayCount}
              next={() => setDisplayCount((prev) => prev + 50)}
              hasMore={displayCount < sortedRecords.length}
              loader={
                <div className="p-4 text-center text-muted-foreground">
                  Loading more rows...
                </div>
              }
              endMessage={
                <div className="p-4 text-center text-muted-foreground">
                  No more rows to load.
                </div>
              }
            >
              {renderTable(displayedRecordsInfinite)}
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
// JobsDetailPage Component
const JobsDetailPage = () => {
  const { jobId } = useParams({
    from: "/_layout/scraping-api/scraping-jobs/$jobId",
  }) as { jobId: string }
  const searchParams = useSearch({
    from: "/_layout/scraping-api/scraping-jobs/$jobId",
  }) as {
    search?: string
    activeTab?: string
    domain?: string
    entryId?: string
  }
  const initialTab = searchParams.activeTab
    ? Number.parseInt(searchParams.activeTab, 10)
    : 0
  const initialSearch = Array.isArray(searchParams.search)
    ? searchParams.search[0]
    : searchParams.search || ""
  const [activeTab, setActiveTab] = useState<number>(
    Number.isNaN(initialTab) || initialTab < 0 || initialTab > 5
      ? 4
      : initialTab,
  )
  const [sortBy, setSortBy] = useState<"match" | "linesheet" | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>(String(initialSearch))
  const showToast = useCustomToast()

  const fetchJobData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const apiUrl = `${EXTERNAL_API_BASE}/api/scraping-jobs/${jobId}`
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok)
        throw new Error(
          `Failed to fetch job data: ${response.status} - ${response.statusText}`,
        )
      const data: JobDetails = await response.json()
      setJobData(data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred"
      showToast("Fetch Error", errorMessage, "error")
      setError(errorMessage)
      setJobData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJobData()
  }, [jobId])

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 bg-background">
        <div className="flex justify-center items-center h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-green-500" />
        </div>
      </div>
    )
  }

  if (error || !jobData) {
    return (
      <div className="container mx-auto py-6 bg-background">
        <p className="text-red-500">{error || "Job data not available"}</p>
      </div>
    )
  }

  const tabsConfig = [
    {
      title: "Overview",
      component: () => (
        <OverviewTab
          job={jobData}
          sortBy={sortBy}
          setSortBy={setSortBy}
          fetchJobData={fetchJobData}
          setActiveTab={setActiveTab}
        />
      ),
    },
    {
      title: "Results",
      component: () => (
        <ResultsTab
          job={jobData}
          sortBy={sortBy}
          domain={searchParams.domain}
          entryId={searchParams.entryId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      ),
    },
    {
      title: "Records",
      component: () => (
        <RecordsTab
          job={jobData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      ),
    },
    { title: "Logs", component: () => <LogsTab job={jobData} /> },
    {
      title: "File Rows",
      component: () => (
        <SearchRowsTab job={jobData} searchQuery={searchQuery} />
      ),
    }, // Pass searchQuery
  ]

  return (
    <div className="container mx-auto p-6 bg-background">
      <div className="flex items-center justify-between py-6 flex-wrap gap-4">
        <div className="text-left flex-1">
          <h1 className="text-xl font-bold text-foreground">Job: {jobId}</h1>
          <p className="text-sm text-muted-foreground">
            Details and results for scraping job {jobData.inputFile}.
          </p>
        </div>
      </div>
      <Tabs
        value={tabsConfig[activeTab].title}
        onValueChange={(value) => {
          const index = tabsConfig.findIndex((tab) => tab.title === value)
          if (index !== -1) setActiveTab(index)
        }}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b-2 border-green-200 mb-4">
          <TabsList className="bg-transparent p-0 h-auto">
            {tabsConfig.map((tab) => (
              <TabsTrigger
                key={tab.title}
                value={tab.title}
                className="data-[state=active]:bg-background data-[state=active]:text-green-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none border-b-2 border-transparent px-4 py-2 text-muted-foreground"
              >
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[300px] border-green-300 focus:border-green-300 text-foreground bg-background ml-auto"
          />
        </div>
        {tabsConfig.map((tab) => (
          <TabsContent key={tab.title} value={tab.title}>
            {tab.component()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export const Route = createFileRoute(
  "/_layout/scraping-api/scraping-jobs/legacy/$jobId",
)({ component: JobsDetailPage })

export default JobsDetailPage
