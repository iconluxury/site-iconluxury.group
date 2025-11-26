import { Button } from "./ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Card, CardContent } from "./ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import { Download, Loader2, RefreshCw } from "lucide-react"
import { Link } from "@tanstack/react-router"
import debounce from "lodash/debounce"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import useCustomToast from "./../hooks/useCustomToast"

interface LogFile {
  fileId: string
  fileName: string
  url: string | null
  lastModified: string
  entries: LogEntry[] | null
}

interface LogEntry {
  timestamp: string
  endpoint: string
  query: string
  status: "success" | "error"
  responseTime: number
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

const LogFiles: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
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

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">
          Log Files
        </h2>
        <div className="flex gap-2">
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
          <Button
            size="sm"
            asChild
          >
            <Link to="/scraping-api/log-details">
              View Details
            </Link>
          </Button>
        </div>
      </div>

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
                {logFiles.map((file) => (
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
      )}
    </div>
  )
}

export default LogFiles
