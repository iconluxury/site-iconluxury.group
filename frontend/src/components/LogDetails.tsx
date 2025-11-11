import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Checkbox,
  Flex,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import debounce from "lodash/debounce"
// src/components/LogDetails.tsx
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import useCustomToast from "./../hooks/useCustomToast"

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
    // Fetch entries for the first log file immediately
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
    <Box p={4} width="100%">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold">
          Log Details
        </Text>
        <Flex gap={2} flexWrap="wrap" justify="flex-end">
          <Select
            size="sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as "all" | "success" | "error")
            }}
            width="150px"
          >
            <option value="all">All</option>
            <option value="success">Success Only</option>
            <option value="error">Errors Only</option>
          </Select>
          <Checkbox
            size="sm"
            isChecked={wrapLongLines}
            onChange={(event) => setWrapLongLines(event.target.checked)}
          >
            Wrap long lines
          </Checkbox>
          <Checkbox
            size="sm"
            isChecked={reverseChronological}
            onChange={(event) => setReverseChronological(event.target.checked)}
          >
            Reverse order
          </Checkbox>
          <Checkbox
            size="sm"
            isChecked={showTimestamps}
            onChange={(event) => setShowTimestamps(event.target.checked)}
          >
            Show timestamps
          </Checkbox>
          <Tooltip label="Refresh log files">
            <Button
              size="sm"
              colorScheme="blue"
              onClick={debouncedFetchLogFiles}
              isLoading={isLoading}
            >
              Refresh
            </Button>
          </Tooltip>
          <Button
            size="sm"
            colorScheme="teal"
            as={Link}
            to="/scraping-api/log-files"
          >
            Back to Log Files
          </Button>
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" color="blue.500" />
          <Text ml={4}>Loading log files...</Text>
        </Flex>
      ) : logFiles.length === 0 ? (
        <Text color="gray.500" textAlign="center">
          No log files available.
        </Text>
      ) : (
        <Box shadow="md" borderWidth="1px" borderRadius="md" overflowX="auto">
          <Accordion allowMultiple defaultIndex={[0]}>
            {" "}
            {/* Expand first log by default */}
            {logFiles.map((file) => (
              <AccordionItem key={file.fileId}>
                <AccordionButton onClick={() => fetchLogEntries(file)}>
                  <Box flex="1" textAlign="left">
                    <Text fontWeight="bold">{file.fileName}</Text>
                    <Text fontSize="sm" color="gray.500">
                      Last Modified:{" "}
                      {new Date(file.lastModified).toLocaleString()} | Entries:{" "}
                      {file.entries ? file.entries.length : "Not loaded"}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  {file.entries === null ? (
                    <Flex justify="center" align="center" py={4}>
                      <Spinner size="sm" color="blue.500" />
                      <Text ml={2}>Loading entries...</Text>
                    </Flex>
                  ) : (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          {showTimestamps && <Th>Timestamp</Th>}
                          <Th>Endpoint</Th>
                          <Th>Query</Th>
                          <Th>Status</Th>
                          <Th>Response Time</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(() => {
                          const displayEntries = getDisplayEntries(file.entries)
                          const wrappingCellProps = wrapLongLines
                            ? {
                                whiteSpace: "pre-wrap" as const,
                                wordBreak: "break-word" as const,
                                overflowWrap: "anywhere" as const,
                              }
                            : {
                                whiteSpace: "nowrap" as const,
                                wordBreak: "normal" as const,
                                overflowWrap: "normal" as const,
                              }

                          if (displayEntries.length === 0) {
                            return (
                              <Tr>
                                <Td
                                  colSpan={showTimestamps ? 5 : 4}
                                  textAlign="center"
                                >
                                  <Text color="gray.500">
                                    No logs match the current filter.
                                  </Text>
                                </Td>
                              </Tr>
                            )
                          }

                          return displayEntries.map((log, index) => (
                            <Tr
                              key={index}
                              bg={
                                log.status === "error" ? "red.900" : "transparent"
                              }
                            >
                              {showTimestamps && (
                                <Td {...wrappingCellProps}>
                                  {formatTimestamp(log.timestamp)}
                                </Td>
                              )}
                              <Td {...wrappingCellProps}>{log.endpoint}</Td>
                              <Td {...wrappingCellProps}>{log.query}</Td>
                              <Td {...wrappingCellProps}>{log.status}</Td>
                              <Td {...wrappingCellProps}>{log.responseTime} ms</Td>
                            </Tr>
                          ))
                        })()}
                      </Tbody>
                    </Table>
                  )}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
      )}
    </Box>
  )
}

export default LogsDetails
