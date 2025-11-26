import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"
import { Button } from "./ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Download, Loader2 } from "lucide-react"
import debounce from "lodash/debounce"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import useCustomToast from "./../hooks/useCustomToast"

interface LogEntry {
  timestamp: string
  endpoint: string
  query: string
  status: "success" | "error"
  responseTime: number
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
  const lines = content.split("\n").filter((line) => line.trim())
  return lines
    .map((line) => {
      const parts = line.split(" ")
      return {
        timestamp: parts[0] || new Date().toISOString(),
        endpoint: parts[1] || "Unknown",
        query: parts.slice(2, -2).join(" ") || "N/A",
        status: (parts[parts.length - 2] === "SUCCESS" ? "success" : "error") as
          | "success"
          | "error",
        responseTime: Number.parseInt(parts[parts.length - 1]) || 0,
      }
    })
    .filter((entry) => entry.timestamp && entry.endpoint && entry.query)
}

const LogsGSerp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [filter, setFilter] = useState<"all" | "success" | "error">("all")
  const showToast = useCustomToast()

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
      const url: string = file.url
      const response = await fetch(url, { cache: "no-store" })
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

  const handleDownload = (url: string | null) => {
    if (url) {
      window.open(url, "_blank")
      showToast(
        "File Opened",
        `Opened ${url.split("/").pop()} in new tab`,
        "info",
      )
    }
  }

  useEffect(() => {
    initializeLogFiles()
  }, [])

  const getFilteredEntries = (entries: LogEntry[] | null) => {
    if (!entries) return []
    return entries.filter((log) => filter === "all" || log.status === filter)
  }

  return (
    <div className="p-4 w-full">
      {isLoading ? (
        <div className="flex justify-center items-center h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="ml-4 text-muted-foreground">Loading log files...</span>
        </div>
      ) : logFiles.length === 0 ? (
        <div className="text-center text-muted-foreground">
          No log files available.
        </div>
      ) : (
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="download">Download</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="download">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logFiles.slice(0, 5).map((file) => (
                      <TableRow key={file.fileId}>
                        <TableCell>{file.fileName}</TableCell>
                        <TableCell>
                          {new Date(file.lastModified).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {file.url ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(file.url)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No file
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="details">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Log Details</h2>
              <div className="w-[150px]">
                <Select
                  value={filter}
                  onValueChange={(value) =>
                    setFilter(value as "all" | "success" | "error")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success Only</SelectItem>
                    <SelectItem value="error">Errors Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Timestamp</TableHead>
                                  <TableHead>Endpoint</TableHead>
                                  <TableHead>Query</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Response Time</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getFilteredEntries(file.entries).map(
                                  (log, index) => (
                                    <TableRow
                                      key={index}
                                      className={
                                        log.status === "error"
                                          ? "bg-red-50 dark:bg-red-900/20"
                                          : ""
                                      }
                                    >
                                      <TableCell>
                                        {new Date(
                                          log.timestamp,
                                        ).toLocaleString()}
                                      </TableCell>
                                      <TableCell>{log.endpoint}</TableCell>
                                      <TableCell>{log.query}</TableCell>
                                      <TableCell>
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
                                      <TableCell>
                                        {log.responseTime} ms
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                                {getFilteredEntries(file.entries).length ===
                                  0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={5}
                                      className="text-center text-muted-foreground"
                                    >
                                      No logs match the current filter.
                                    </TableCell>
                                  </TableRow>
                                )}
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default LogsGSerp
