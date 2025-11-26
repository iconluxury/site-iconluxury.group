import { Link } from "@tanstack/react-router"
import debounce from "lodash/debounce"
import { Loader2, RefreshCw } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import useCustomToast from "./../hooks/useCustomToast"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

interface LogEntry {
  timestamp: string
  endpoint: string
  query: string
  status: "success" | "error"
  responseTime: number
  originalIndex: number
}

interface LogFile {
  fileId: string
  fileName: string
  url: string | null
  lastModified: string
  entries: LogEntry[] | null
}

const logFileUrls = [
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_3.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_4.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_5.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_21.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_47.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_57.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_63.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_70.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_72.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_73.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_75.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_76.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_77.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_78.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_79.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_80.log",
  "https://iconluxurygroup-s3.s3.us-east-2.amazonaws.com/job_logs/job_82.log",
]

const parseLogContent = (content: string): LogEntry[] => {
  const fallbackTimestamp = new Date().toISOString()
  const lines = content.split("\n").filter((line) => line.trim())

  return lines
    .map((line, index) => {
      const parts = line.split(/\s+/)
      const timestampCandidate = parts[0] ?? fallbackTimestamp
      const statusCandidate = parts[parts.length - 2] ?? ""
      const responseCandidate = parts[parts.length - 1] ?? "0"

      const status: LogEntry["status"] =
        statusCandidate.toUpperCase() === "SUCCESS" ? "success" : "error"

      const responseTime = Number.parseInt(responseCandidate, 10)

      return {
        timestamp: timestampCandidate || fallbackTimestamp,
        endpoint: parts[1] || "Unknown",
        query: parts.slice(2, -2).join(" ") || line,
        status,
        responseTime: Number.isNaN(responseTime) ? 0 : responseTime,
        originalIndex: index,
      }
    })
    .filter((entry) => entry.timestamp && entry.endpoint && entry.query)
}

const LogsDetails: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [filter, setFilter] = useState<"all" | "success" | "error">("all")
  const [wrapLongLines, setWrapLongLines] = useState(false)
  const [reverseChronological, setReverseChronological] = useState(false)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const showToast = useCustomToast()

  const formatTimestamp = useCallback((value: string) => {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
  }, [])

  const initializeLogFiles = () => {
    const initialLogFiles = logFileUrls.map((url, index) => {
      const jobId = Number.parseInt(
        url?.split("/").pop()?.replace("job_", "").replace(".log", "") ||
          `${index + 3}`,
        10,
      )
      const fileName = url
        ? url.split("/").pop() || `job_${jobId}.log`
        : `job_${jobId}.log`
      const fileId = fileName.replace(".log", "")
      return {
        fileId,
        fileName,
        url,
        lastModified: new Date(Date.now() - index * 86400000).toISOString(),
        entries: null,
      }
    })
    setLogFiles(initialLogFiles)
    setIsLoading(false)
    if (initialLogFiles.length > 0) {
      fetchLogEntries(initialLogFiles[0])
    }
  }

  const fetchLogEntries = async (file: LogFile) => {
    if (!file.url || file.entries !== null) return

    try {
      const response = await fetch(file.url, { cache: "no-store" })
      if (!response.ok)
        throw new Error(
          `Failed to fetch ${file.fileName}: ${response.statusText}`,
        )
      const content = await response.text()
      const entries = parseLogContent(content)

      setLogFiles((prev) =>
        prev.map((f) => (f.fileId === file.fileId ? { ...f, entries } : f)),
      )
    } catch (err) {
      showToast(
        "Log Fetch Error",
        `Failed to load ${file.fileName}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error",
      )
      setLogFiles((prev) =>
        prev.map((f) => (f.fileId === file.fileId ? { ...f, entries: [] } : f)),
      )
    }
  }

  const debouncedFetchLogFiles = useCallback(
    debounce(() => {
      setIsLoading(true)
      setLogFiles([])
      initializeLogFiles()
    }, 500),
    [],
  )

  useEffect(() => {
    initializeLogFiles()
  }, [])

  const getDisplayEntries = useCallback(
    (entries: LogEntry[] | null) => {
      if (!entries) return []
      const filtered = entries.filter(
        (log) => filter === "all" || log.status === filter,
      )

      if (!reverseChronological) return filtered

      return [...filtered].sort((a, b) => {
        const timeA = Date.parse(a.timestamp)
        const timeB = Date.parse(b.timestamp)

        const hasTimeA = !Number.isNaN(timeA)
        const hasTimeB = !Number.isNaN(timeB)

        if (hasTimeA && hasTimeB) return timeB - timeA
        if (hasTimeA) return -1
        if (hasTimeB) return 1

        return b.originalIndex - a.originalIndex
      })
    },
    [filter, reverseChronological],
  )

  return (
    <div className="p-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-lg font-bold">Log Details</h2>
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <div className="w-[150px]">
            <Select
              value={filter}
              onValueChange={(value) =>
                setFilter(value as "all" | "success" | "error")
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="error">Errors Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="wrap-lines"
              checked={wrapLongLines}
              onCheckedChange={(checked) =>
                setWrapLongLines(checked as boolean)
              }
            />
            <label
              htmlFor="wrap-lines"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Wrap long lines
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reverse-order"
              checked={reverseChronological}
              onCheckedChange={(checked) =>
                setReverseChronological(checked as boolean)
              }
            />
            <label
              htmlFor="reverse-order"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Reverse order
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-timestamps"
              checked={showTimestamps}
              onCheckedChange={(checked) =>
                setShowTimestamps(checked as boolean)
              }
            />
            <label
              htmlFor="show-timestamps"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show timestamps
            </label>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={debouncedFetchLogFiles}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="sr-only">Refresh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh log files</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" asChild>
            <Link to="/scraping-api/log-files">Back to Log Files</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="ml-4 text-muted-foreground">
            Loading log files...
          </span>
        </div>
      ) : logFiles.length === 0 ? (
        <div className="text-center text-muted-foreground">
          No log files available.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Accordion type="multiple" defaultValue={[logFiles[0]?.fileId]}>
              {logFiles.map((file) => (
                <AccordionItem key={file.fileId} value={file.fileId}>
                  <AccordionTrigger
                    onClick={() => fetchLogEntries(file)}
                    className="px-4"
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="font-bold">{file.fileName}</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        Last Modified:{" "}
                        {new Date(file.lastModified).toLocaleString()} |
                        Entries:{" "}
                        {file.entries ? file.entries.length : "Not loaded"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {file.entries === null ? (
                      <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                        <span>Loading entries...</span>
                      </div>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {showTimestamps && (
                                <TableHead>Timestamp</TableHead>
                              )}
                              <TableHead>Endpoint</TableHead>
                              <TableHead>Query</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Response Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const displayEntries = getDisplayEntries(
                                file.entries,
                              )
                              const wrappingClass = wrapLongLines
                                ? "whitespace-pre-wrap break-all"
                                : "whitespace-nowrap"

                              if (displayEntries.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell
                                      colSpan={showTimestamps ? 5 : 4}
                                      className="text-center text-muted-foreground"
                                    >
                                      No logs match the current filter.
                                    </TableCell>
                                  </TableRow>
                                )
                              }

                              return displayEntries.map((log, index) => (
                                <TableRow
                                  key={index}
                                  className={
                                    log.status === "error"
                                      ? "bg-red-50 dark:bg-red-900/20"
                                      : ""
                                  }
                                >
                                  {showTimestamps && (
                                    <TableCell className={wrappingClass}>
                                      {formatTimestamp(log.timestamp)}
                                    </TableCell>
                                  )}
                                  <TableCell className={wrappingClass}>
                                    {log.endpoint}
                                  </TableCell>
                                  <TableCell className={wrappingClass}>
                                    {log.query}
                                  </TableCell>
                                  <TableCell className={wrappingClass}>
                                    <Badge
                                      variant={
                                        log.status === "success"
                                          ? "default"
                                          : "destructive"
                                      }
                                    >
                                      {log.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={wrappingClass}>
                                    {log.responseTime} ms
                                  </TableCell>
                                </TableRow>
                              ))
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default LogsDetails
