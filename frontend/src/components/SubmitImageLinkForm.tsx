import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Info,
  X,
} from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"
import { useIframeEmail } from "../hooks/useIframeEmail"
import { SERVER_URL as INITIAL_SERVER_URL, showDevUI } from "../utils"
import { CurlDisplay } from "./CurlDisplay"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
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

// Keep server URL consistent with other tools

// Types
type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = { style: number | null; link: number | null }
type SheetConfig = {
  name: string
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
}

// UI constants (match mapping UI style used elsewhere)
const MAX_PREVIEW_ROWS = 20
const MAX_FILE_SIZE_MB = 50

// Helpers (kept consistent with Google Images form)
const getDisplayValue = (value: any): string => {
  if (value == null) return ""
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === "object") {
    if ((value as any).error) return (value as any).error
    if ((value as any).result !== undefined)
      return getDisplayValue((value as any).result)
    if ((value as any).text) return (value as any).text
    if ((value as any).link) return (value as any).text || (value as any).link
    return JSON.stringify(value)
  }
  return String(value)
}

const indexToColumnLetter = (index: number): string => {
  let column = ""
  let temp = index
  while (temp >= 0) {
    column = String.fromCharCode((temp % 26) + 65) + column
    temp = Math.floor(temp / 26) - 1
  }
  return column
}

const detectHeaderRow = (rows: CellValue[][]): number => {
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    link: /(link|url|image|photo|picture|img)/i,
  }
  let bestIndex = 0
  let maxNonEmpty = 0
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map((cell) => String(cell ?? "").trim())
      .filter((v) => v !== "") as string[]
    const count = rowValues.length
    if (count < 2) continue
    const hasHeaderMatch = rowValues.some((v) =>
      Object.values(patterns).some((p) => p.test(v)),
    )
    if (hasHeaderMatch || count > maxNonEmpty) {
      bestIndex = i
      maxNonEmpty = count
      if (hasHeaderMatch) break
    }
  }
  return bestIndex
}

const getColumnPreview = (
  columnIndex: number | null,
  rows: CellValue[][],
): string => {
  if (
    columnIndex === null ||
    columnIndex < 0 ||
    columnIndex >= (rows[0]?.length ?? 0)
  )
    return "No values"
  const values = rows
    .map((row) => getDisplayValue(row[columnIndex]))
    .filter((v) => v.trim() !== "")
    .slice(0, 3)
  return values.length ? values.join(", ") : "No values"
}

const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = { style: null, link: null }
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    link: /(link|url|image|photo|picture|img)/i,
  }
  headers.forEach((header, index) => {
    const h = header.trim()
    if (!h) return
    if (patterns.style.test(h) && mapping.style === null) mapping.style = index
    else if (patterns.link.test(h) && mapping.link === null)
      mapping.link = index
  })
  return mapping
}

// Component
const SubmitImageLinkForm: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<"upload" | "preview" | "map" | "submit">(
    "upload",
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [activeMappingField, setActiveMappingField] = useState<
    keyof ColumnMapping | null
  >(null)
  const [serverUrl, setServerUrl] = useState(INITIAL_SERVER_URL)
  const isDev = serverUrl.includes("dev") || serverUrl.includes("localhost")
  const activeSheet = sheetConfigs[activeSheetIndex] ?? null
  const excelData = activeSheet?.excelData ?? { headers: [], rows: [] }
  const rawData = activeSheet?.rawData ?? []
  const headerIndex = activeSheet?.headerIndex ?? 0
  const columnMapping = activeSheet?.columnMapping ?? {
    style: null,
    link: null,
  }
  const hasMultipleSheets = sheetConfigs.length > 1

  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const isEmailValid = useMemo(() => {
    const trimmed = sendToEmail
    if (!trimmed) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }, [sendToEmail])
  const showToast = useCustomToast()

  const updateSheetConfig = useCallback(
    (index: number, transform: (sheet: SheetConfig) => SheetConfig) => {
      setSheetConfigs((prev) => {
        if (!prev[index]) return prev
        const next = [...prev]
        next[index] = transform(prev[index])
        return next
      })
    },
    [],
  )

  const handleActiveSheetChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= sheetConfigs.length) return
      setActiveSheetIndex(index)
      setActiveMappingField(null)
    },
    [sheetConfigs.length],
  )

  // Show Image Link first, then Anchor/Target (style)
  const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["link", "style"]

  const headersAreValid = useMemo(
    () => excelData.headers.some((header) => String(header).trim() !== ""),
    [excelData.headers],
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0]
      if (!selectedFile) {
        showToast("File Error", "No file selected", "error")
        setSheetConfigs([])
        setUploadedFile(null)
        return
      }
      if (
        ![
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ].includes(selectedFile.type)
      ) {
        showToast(
          "File Error",
          "Please upload an Excel file (.xlsx or .xls)",
          "error",
        )
        return
      }
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(
          "File Error",
          `File size exceeds ${MAX_FILE_SIZE_MB}MB`,
          "error",
        )
        return
      }

      setUploadedFile(selectedFile)
      setIsLoading(true)
      setStep("upload")
      setActiveMappingField(null)
      try {
        const data = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(data, { type: "array" })
        const newSheetConfigs: SheetConfig[] = []
        const headerWarningPattern = {
          style:
            /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          link: /(link|url|image|photo|picture|img)/i,
        }

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          if (!worksheet) return
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: true,
            defval: "",
          }) as CellValue[][]
          if (jsonData.length === 0) return

          const detectedHeaderIndex = detectHeaderRow(jsonData)
          const headers = (jsonData[detectedHeaderIndex] as any[]).map((cell) =>
            String(cell ?? ""),
          )
          if (
            detectedHeaderIndex === 0 &&
            !headers.some(
              (cell) =>
                headerWarningPattern.style.test(cell) ||
                headerWarningPattern.link.test(cell),
            )
          ) {
            showToast(
              "Warning",
              `Sheet "${sheetName}" has no clear header row detected; using first row. Please verify in the Header Selection step.`,
              "warning",
            )
          }
          const rows = jsonData.slice(detectedHeaderIndex + 1) as CellValue[][]
          newSheetConfigs.push({
            name: sheetName,
            rawData: jsonData,
            headerIndex: detectedHeaderIndex,
            excelData: { headers, rows },
            columnMapping: autoMapColumns(headers),
          })
        })

        if (newSheetConfigs.length === 0) throw new Error("Excel file is empty")

        setSheetConfigs(newSheetConfigs)
        setActiveSheetIndex(0)
        setStep("preview")
        if (newSheetConfigs.length > 1) {
          showToast(
            "Multiple Sheets Detected",
            `Detected ${newSheetConfigs.length} sheets. Each will be processed as an individual job.`,
            "success",
          )
        }
      } catch (error) {
        showToast(
          "File Processing Error",
          error instanceof Error ? error.message : "Unknown error",
          "error",
        )
        setSheetConfigs([])
        setUploadedFile(null)
        setStep("upload")
      } finally {
        setIsLoading(false)
        event.target.value = ""
      }
    },
    [showToast],
  )

  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (!activeSheet) return
      if (newHeaderIndex < 0 || newHeaderIndex >= activeSheet.rawData.length)
        return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const headers = sheet.rawData[newHeaderIndex].map((cell) =>
          String(cell ?? ""),
        )
        const rows = sheet.rawData.slice(newHeaderIndex + 1) as CellValue[][]
        return {
          ...sheet,
          headerIndex: newHeaderIndex,
          excelData: { headers, rows },
          columnMapping: autoMapColumns(headers),
        }
      })
      setActiveMappingField(null)
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleColumnMap = useCallback(
    (index: number, field: keyof ColumnMapping) => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping: ColumnMapping = { ...sheet.columnMapping }
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (newMapping[key] === index) newMapping[key] = null
        })
        newMapping[field] = index
        return { ...sheet, columnMapping: newMapping }
      })
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleColumnMapFromGrid = useCallback(
    (index: number) => {
      if (activeMappingField === null) return
      handleColumnMap(index, activeMappingField)
      setActiveMappingField(null)
    },
    [activeMappingField, handleColumnMap],
  )

  const handleClearMapping = useCallback(
    (index: number) => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping: ColumnMapping = { ...sheet.columnMapping }
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (newMapping[key] === index) newMapping[key] = null
        })
        return { ...sheet, columnMapping: newMapping }
      })
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const mappedColumnsForHighlight = useMemo(() => {
    const set = new Set<number>()
    ;(["style", "link"] as (keyof ColumnMapping)[]).forEach((k) => {
      const v = columnMapping[k]
      if (typeof v === "number") set.add(v)
    })
    return set
  }, [columnMapping])

  const selectedColumnIndex =
    activeMappingField !== null ? columnMapping[activeMappingField] : null

  const validateForm = useMemo(() => {
    if (!activeSheet) {
      return { isValid: false, missing: REQUIRED_FIELDS }
    }
    const missing = REQUIRED_FIELDS.filter((f) => columnMapping[f] === null)
    return {
      isValid:
        missing.length === 0 && excelData.rows.length > 0 && headersAreValid,
      missing,
    }
  }, [activeSheet, columnMapping, excelData.rows.length, headersAreValid])

  const sheetValidationResults = useMemo(
    () =>
      sheetConfigs.map((sheet, index) => {
        const mapping = sheet.columnMapping
        const missing = REQUIRED_FIELDS.filter((f) => mapping[f] === null)
        const headersValid = sheet.excelData.headers.some(
          (h) => String(h).trim() !== "",
        )
        return {
          sheetIndex: index,
          missing,
          isValid:
            missing.length === 0 &&
            sheet.excelData.rows.length > 0 &&
            headersValid,
        }
      }),
    [REQUIRED_FIELDS, sheetConfigs],
  )

  const activeSheetValidation = sheetValidationResults[activeSheetIndex] ?? null
  const activeSheetIsReady = Boolean(activeSheetValidation?.isValid)
  const activeSheetMissingColumns = activeSheetValidation?.missing ?? []
  const activeSheetStatusLabel = activeSheetIsReady ? "Ready" : "Needs mapping"
  const ActiveSheetStatusIcon = activeSheetIsReady ? Check : AlertTriangle
  const activeSheetStatusColor = activeSheetIsReady
    ? "text-green-500"
    : "text-yellow-500"
  const activeSheetStatusTooltip = activeSheetIsReady
    ? "All required columns are mapped."
    : activeSheetMissingColumns.length > 0
      ? `Missing required columns: ${activeSheetMissingColumns.join(", ")}`
      : "Map all required columns before submitting."

  const renderSheetButtons = useCallback(
    (size: "xs" | "sm" | "md" = "sm") => (
      <div className="flex flex-wrap gap-2">
        {sheetConfigs.map((sheet, index) => {
          const isActive = index === activeSheetIndex
          const validation = sheetValidationResults[index]
          const isComplete = validation?.isValid
          const hasMissing = (validation?.missing ?? []).length > 0
          const icon = isComplete ? (
            <Check className="h-3 w-3 ml-2" />
          ) : (
            <AlertTriangle className="h-3 w-3 ml-2" />
          )
          const sheetLabel = sheet.name || `Sheet ${index + 1}`
          const tooltipLabel = isComplete
            ? "Mapping ready"
            : hasMissing
              ? `Missing: ${(validation?.missing ?? []).join(", ")}`
              : "Map required columns"
          return (
            <TooltipProvider key={sheet.name || index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size={
                      size === "xs" ? "sm" : size === "md" ? "default" : size
                    }
                    variant={isActive ? "default" : "ghost"}
                    className={`${
                      isActive
                        ? ""
                        : isComplete
                          ? "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                          : "bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                    } ${isActive ? "font-bold" : "font-semibold"}`}
                    onClick={() => handleActiveSheetChange(index)}
                  >
                    {sheetLabel}
                    {icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tooltipLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    ),
    [
      activeSheetIndex,
      handleActiveSheetChange,
      sheetConfigs,
      sheetValidationResults,
    ],
  )

  const handleSubmit = useCallback(async () => {
    if (sheetConfigs.length === 0) {
      showToast(
        "No Data",
        "Upload an Excel workbook before submitting.",
        "warning",
      )
      return
    }
    const invalidSheet = sheetValidationResults.find((r) => !r.isValid)
    if (invalidSheet) {
      const sheetName =
        sheetConfigs[invalidSheet.sheetIndex]?.name ||
        `Sheet ${invalidSheet.sheetIndex + 1}`
      showToast(
        "Validation Error",
        `Missing required columns in ${sheetName}: ${invalidSheet.missing.join(
          ", ",
        )}`,
        "warning",
      )
      setActiveSheetIndex(invalidSheet.sheetIndex)
      setStep("map")
      return
    }
    if (!sendToEmail) {
      showToast(
        "Recipient Email Required",
        "Add an email query parameter (sendToEmail, email, or userEmail) to the iframe URL before submitting.",
        "warning",
      )
      return
    }
    if (!isEmailValid) {
      showToast(
        "Invalid Email",
        "The email supplied via URL parameters isn't valid. Update the iframe URL with a valid email before submitting.",
        "warning",
      )
      return
    }

    setIsLoading(true)
    try {
      for (const [index, sheet] of sheetConfigs.entries()) {
        const mapping = sheet.columnMapping
        if (mapping.style === null || mapping.link === null) {
          throw new Error(
            `Sheet "${
              sheet.name || `Sheet ${index + 1}`
            }" is missing required mappings.`,
          )
        }

        const baseName = uploadedFile?.name
          ? uploadedFile.name.replace(/\.xlsx?$/i, "")
          : "image-links"
        const sheetLabel = (sheet.name || `sheet-${index + 1}`)
          .replace(/\s+/g, "-")
          .toLowerCase()
        const fileName = `${baseName}-${sheetLabel}.xlsx`
        if (!uploadedFile) {
          throw new Error(
            "Original file missing. Please re-upload your workbook.",
          )
        }
        const originalType =
          uploadedFile.type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        // Preserve the original workbook so formatting and formulas stay intact.
        const renamedFile = new File([uploadedFile], fileName, {
          type: originalType,
        })
        const formData = new FormData()
        formData.append("fileUploadLink", renamedFile)
        formData.append("searchColLink", indexToColumnLetter(mapping.style))
        formData.append("linkColumn", indexToColumnLetter(mapping.link))
        formData.append("header_index", String(sheet.headerIndex + 1))
        formData.append("sendToEmail", sendToEmail)
        formData.append("sheetName", sheet.name || `Sheet ${index + 1}`)
        formData.append("sheetIndex", String(index + 1))

        const response = await fetch(`${serverUrl}/submitImageLink`, {
          method: "POST",
          body: formData,
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Server error for sheet "${sheet.name || `Sheet ${index + 1}`}" (${
              response.status
            }): ${errorText || response.statusText}`,
          )
        }
      }

      showToast(
        "Success",
        `${sheetConfigs.length} job(s) submitted successfully`,
        "success",
      )
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      console.error("Submission Error:", error)
      showToast(
        "Submission Error",
        error instanceof Error ? error.message : "Failed to submit",
        "error",
      )
      setStep("map")
    } finally {
      setIsLoading(false)
    }
  }, [
    isEmailValid,
    sendToEmail,
    sheetConfigs,
    sheetValidationResults,
    showToast,
    uploadedFile,
  ])


  return (
    <div className="container mx-auto p-4 bg-[#FFFFFF] text-foreground">
      <div className="space-y-6">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setStep("upload")
              onBack()
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tools
          </Button>
        )}

        <div
          className={`rounded-md p-4 ${
            isDev ? "bg-red-50 border border-red-200 dark:bg-red-900/20" : ""
          }`}
        >
          {isDev && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Developer Mode</AlertTitle>
              <AlertDescription>Not for production use.</AlertDescription>
            </Alert>
          )}

          {/* Backend Selector */}
          <div className="flex justify-end mb-4 items-center gap-2">
            <Label>Server</Label>
            <Select value={serverUrl} onValueChange={setServerUrl}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Server" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="https://external.iconluxury.group">
                  Production
                </SelectItem>
                <SelectItem value="https://dev-external.iconluxury.today">
                  Development
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stepper */}
          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-md mb-4">
            <div className="flex space-x-4">
              {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
                <span
                  key={s}
                  className={`cursor-pointer ${
                    step ===
                    s.toLowerCase().replace("header selection", "preview")
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  } ${
                    i < ["upload", "preview", "map", "submit"].indexOf(step)
                      ? "cursor-pointer"
                      : "cursor-default"
                  }`}
                  onClick={() => {
                    if (
                      i < ["upload", "preview", "map", "submit"].indexOf(step)
                    )
                      setStep(
                        s
                          .toLowerCase()
                          .replace(
                            "header selection",
                            "preview",
                          ) as typeof step,
                      )
                  }}
                >
                  {i + 1}. {s}
                </span>
              ))}
            </div>
            {step !== "upload" && (
              <div className="flex space-x-2">
                {step !== "preview" && (
                  <Button
                    onClick={() =>
                      setStep(
                        ["upload", "preview", "map", "submit"][
                          ["upload", "preview", "map", "submit"].indexOf(step) -
                            1
                        ] as typeof step,
                      )
                    }
                    variant="outline"
                    size="sm"
                  >
                    Back
                  </Button>
                )}
                {step === "preview" && (
                  <Button
                    onClick={() => setStep("upload")}
                    variant="outline"
                    size="sm"
                  >
                    Back
                  </Button>
                )}
                {step !== "submit" && (
                  <Button
                    onClick={() =>
                      setStep(
                        ["preview", "map", "submit"][
                          ["upload", "preview", "map"].indexOf(step)
                        ] as typeof step,
                      )
                    }
                    size="sm"
                    disabled={step === "map" && !validateForm.isValid}
                  >
                    Next:{" "}
                    {
                      ["Header Selection", "Map", "Submit"][
                        ["upload", "preview", "map"].indexOf(step)
                      ]
                    }
                  </Button>
                )}
                {step === "submit" && (
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isLoading ||
                      !validateForm.isValid ||
                      !sendToEmail ||
                      !isEmailValid
                    }
                    size="sm"
                  >
                    {isLoading ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">
                Convert Image Links to Pictures
              </h2>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="cursor-pointer"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload an Excel file (.xlsx or .xls) up to 50MB</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              )}
            </div>
          )}

          {/* Preview / Header selection */}
          {step === "preview" && (
            <div className="space-y-4">
              {hasMultipleSheets && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Sheets</span>
                      <span className="text-xs text-muted-foreground">
                        Viewing{" "}
                        {sheetConfigs[activeSheetIndex]?.name ||
                          `Sheet ${activeSheetIndex + 1}`}
                      </span>
                    </div>
                    {renderSheetButtons("xs")}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <ActiveSheetStatusIcon
                              className={`h-3 w-3 ${activeSheetStatusColor}`}
                            />
                            <span>{activeSheetStatusLabel}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {activeSheetStatusTooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground">
                      Select a sheet to preview its header row and sample data.
                    </p>
                  </CardContent>
                </Card>
              )}
              <div className="flex items-center space-x-2">
                <span>Select Header Row:</span>
                <Select
                  value={String(headerIndex)}
                  onValueChange={(value) => handleHeaderChange(Number(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select header row" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawData.slice(0, 20).map((_, index) => (
                      <SelectItem key={index} value={String(index)}>
                        Row {index + 1}{" "}
                        {index === headerIndex ? "(Selected)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto border rounded-md p-2">
                <Table>
                  <TableBody>
                    {rawData.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
                      <TableRow
                        key={rowIndex}
                        className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          rowIndex === headerIndex
                            ? "bg-blue-50 dark:bg-blue-900/20 font-bold"
                            : ""
                        }`}
                        onClick={() => handleHeaderChange(rowIndex)}
                      >
                        {row.map((cell, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            className={`max-w-[200px] truncate border ${
                              rowIndex === headerIndex
                                ? "border-blue-500"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {getDisplayValue(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rawData.length > MAX_PREVIEW_ROWS && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing first {MAX_PREVIEW_ROWS} rows of {rawData.length}{" "}
                    total rows
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          {step === "map" && (
            <div className="flex flex-col md:flex-row gap-4 max-h-[70vh] overflow-auto">
              <div className="flex flex-col gap-4 w-full md:w-2/5 overflow-y-auto p-4 border rounded-md">
                {hasMultipleSheets && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Sheets</p>
                          <p className="text-xs text-muted-foreground">
                            Pick a sheet to adjust its column mapping.
                          </p>
                        </div>
                      </div>
                      {renderSheetButtons("sm")}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <ActiveSheetStatusIcon
                                className={`h-3 w-3 ${activeSheetStatusColor}`}
                              />
                              <span>{activeSheetStatusLabel}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {activeSheetStatusTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="text-xs text-muted-foreground">
                        Currently editing:{" "}
                        {sheetConfigs[activeSheetIndex]?.name ||
                          `Sheet ${activeSheetIndex + 1}`}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!validateForm.isValid && (
                  <p className="text-red-500 text-sm font-medium">
                    Missing required columns: {validateForm.missing.join(", ")}.
                    Please map all required columns.
                  </p>
                )}
                {!headersAreValid && (
                  <p className="text-red-500 text-sm font-medium">
                    Selected header row is empty. Choose a different header row
                    before mapping.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Select a field below, then click a column in the preview grid
                  to map it instantly.
                </p>

                {REQUIRED_FIELDS.map((field) => (
                  <div
                    key={field}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer ${
                      activeMappingField === field
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => setActiveMappingField(field)}
                  >
                    <span className="w-[160px] font-semibold">
                      {field === "style"
                        ? "Anchor / Target Column"
                        : "Image Link Column"}
                      :
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Select
                              value={
                                columnMapping[field] !== null
                                  ? String(columnMapping[field])
                                  : ""
                              }
                              onValueChange={(value) =>
                                handleColumnMap(Number(value), field)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Unmapped" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unmapped">
                                  Unmapped
                                </SelectItem>
                                {excelData.headers.map((header, index) => (
                                  <SelectItem key={index} value={String(index)}>
                                    {header ||
                                      `Column ${indexToColumnLetter(index)}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select Excel column for {field}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {columnMapping[field] !== null && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearMapping(columnMapping[field]!)
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clear mapping</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="w-[150px] text-sm text-muted-foreground truncate">
                      {getColumnPreview(columnMapping[field], excelData.rows)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full md:w-3/5 overflow-auto border rounded-md p-2 max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {excelData.headers.map((header, index) => {
                        const isMapped = mappedColumnsForHighlight.has(index)
                        const isSelected = selectedColumnIndex === index
                        return (
                          <TableHead
                            key={index}
                            className={`sticky top-0 cursor-pointer ${
                              isSelected
                                ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-500"
                                : isMapped
                                  ? "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
                                  : "bg-white dark:bg-gray-950"
                            }`}
                            onClick={() => handleColumnMapFromGrid(index)}
                          >
                            {header || `Column ${indexToColumnLetter(index)}`}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelData.rows
                      .slice(0, MAX_PREVIEW_ROWS)
                      .map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => {
                            const isMissingRequired = REQUIRED_FIELDS.some(
                              (requiredField) =>
                                columnMapping[requiredField] === cellIndex &&
                                !cell,
                            )
                            const isSelectedColumn =
                              selectedColumnIndex === cellIndex
                            const isMappedColumn =
                              mappedColumnsForHighlight.has(cellIndex)
                            let bgClass = ""
                            if (isMissingRequired)
                              bgClass = "bg-red-100 dark:bg-red-900/20"
                            else if (isSelectedColumn)
                              bgClass = "bg-blue-50 dark:bg-blue-900/10"
                            else if (isMappedColumn)
                              bgClass = "bg-gray-50 dark:bg-gray-800/50"

                            return (
                              <TableCell
                                key={cellIndex}
                                className={`max-w-[200px] truncate cursor-pointer ${bgClass}`}
                                onClick={() =>
                                  handleColumnMapFromGrid(cellIndex)
                                }
                              >
                                {getDisplayValue(cell)}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Submit */}
          {step === "submit" && (
            <div className="space-y-4">
              <div className="space-y-4">
                <p>Rows: {excelData.rows.length}</p>
                <div className="space-y-2">
                  <Label>User:</Label>
                  {sendToEmail ? (
                    <p className="font-medium">{sendToEmail}</p>
                  ) : (
                    <p className="text-sm text-red-500">
                      No email parameter detected. Add
                      ?sendToEmail=example@domain.com (or email/userEmail) to
                      the iframe URL.
                    </p>
                  )}
                  {!isEmailValid && sendToEmail && (
                    <p className="text-sm text-red-500 mt-1">
                      The email supplied in the URL looks invalid. Update the
                      iframe query parameter before submitting.
                    </p>
                  )}
                </div>
                <p>Mapped Columns:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Column</TableHead>
                      <TableHead>Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(["link", "style"] as (keyof ColumnMapping)[])
                      .filter((key) => columnMapping[key] !== null)
                      .map((key) => (
                        <TableRow key={key}>
                          <TableCell>
                            {key === "style"
                              ? "Anchor / Target Column"
                              : "Image Link"}
                          </TableCell>
                          <TableCell>
                            {excelData.headers[columnMapping[key] as number] ||
                              `Column ${indexToColumnLetter(
                                columnMapping[key] as number,
                              )}`}
                          </TableCell>
                          <TableCell>
                            {getColumnPreview(
                              columnMapping[key],
                              excelData.rows,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {isDev && uploadedFile && sheetConfigs.length > 0 && (
                <div className="mt-8 space-y-6">
                  <h3 className="text-lg font-semibold">
                    cURL Commands (Dev Mode)
                  </h3>
                  {sheetConfigs.map((sheet, index) => {
                    const mapping = sheet.columnMapping
                    const baseName =
                      uploadedFile.name.replace(/\.xlsx?$/i, "") ||
                      "image-links"
                    const sheetLabel = (sheet.name || `sheet-${index + 1}`)
                      .replace(/\s+/g, "-")
                      .toLowerCase()
                    const fileName = `${baseName}-${sheetLabel}.xlsx`

                    return (
                      <div key={index} className="space-y-2">
                        <p className="text-sm font-medium">
                          Sheet: {sheet.name || `Sheet ${index + 1}`}
                        </p>
                        <CurlDisplay
                          url={`${serverUrl}/submitImageLink`}
                          method="POST"
                          formDataEntries={{
                            fileUploadLink: new File([uploadedFile], fileName, {
                              type: uploadedFile.type,
                            }),
                            searchColLink:
                              mapping.style !== null
                                ? indexToColumnLetter(mapping.style)
                                : "",
                            linkColumn:
                              mapping.link !== null
                                ? indexToColumnLetter(mapping.link)
                                : "",
                            header_index: String(sheet.headerIndex + 1),
                            sendToEmail: sendToEmail,
                            sheetIndex: String(index + 1),
                            sheetName: sheet.name || `Sheet ${index + 1}`,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubmitImageLinkForm
