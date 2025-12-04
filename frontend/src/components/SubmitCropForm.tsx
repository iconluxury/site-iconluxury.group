// components/SubmitCropForm.tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AlertTriangle, ArrowLeft, Check, Info, Loader2, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"
import { useIframeEmail } from "../hooks/useIframeEmail"
import { SERVER_URL as INITIAL_SERVER_URL, showDevUI } from "../utils"
import { CurlDisplay } from "./CurlDisplay"

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = {
  style: number | null
}
type SheetConfig = {
  name: string
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
}

const MAX_PREVIEW_ROWS = 20
const MAX_FILE_SIZE_MB = 50

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
    image: /(picture|image|photo|img)/i,
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
  const mapping: ColumnMapping = { style: null }
  const pattern =
    /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i
  headers.forEach((header, index) => {
    const h = header.trim()
    if (!h) return
    if (pattern.test(h) && mapping.style === null) mapping.style = index
  })
  return mapping
}

const SubmitCropForm: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [serverUrl, setServerUrl] = useState(INITIAL_SERVER_URL)
  const isDev = serverUrl.includes("dev") || serverUrl.includes("localhost")

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
  const [replaceImageColumn, setReplaceImageColumn] = useState(true)

  const activeSheet = sheetConfigs[activeSheetIndex] ?? null
  const excelData = activeSheet?.excelData ?? { headers: [], rows: [] }
  const rawData = activeSheet?.rawData ?? []
  const headerIndex = activeSheet?.headerIndex ?? 0
  const columnMapping = activeSheet?.columnMapping ?? {
    style: null,
  }
  const hasMultipleSheets = sheetConfigs.length > 1

  // Replaced useColorModeValue with Tailwind classes
  const mappingPanelBg = "bg-card"
  const mappingPanelBorder = "border-border"
  const sheetInactiveBg = "bg-muted"
  const sheetInactiveHover = "hover:bg-muted/80"
  const sheetWarningHover = "hover:bg-yellow-100 dark:hover:bg-yellow-900"

  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const isEmailValid = useMemo(() => {
    if (!sendToEmail) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendToEmail)
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

  const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["style"]

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
    (index: number | null, field: keyof ColumnMapping) => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping: ColumnMapping = { ...sheet.columnMapping }
        if (index !== null) {
          ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(
            (key) => {
              if (newMapping[key] === index) newMapping[key] = null
            },
          )
        }
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
    const v = columnMapping.style
    if (typeof v === "number") set.add(v)
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
    ? "text-blue-400"
    : "text-yellow-400"
  const activeSheetStatusTooltip = activeSheetIsReady
    ? "Style column mapped. Image columns are detected automatically when present."
    : activeSheetMissingColumns.length > 0
      ? `Missing required columns: ${activeSheetMissingColumns.join(", ")}`
      : "Map all required columns before submitting."

  const renderSheetButtons = useCallback(
    (size: "sm" | "default" | "lg" | "icon" = "sm") => (
      <div className="flex flex-wrap gap-2">
        {sheetConfigs.map((sheet, index) => {
          const isActive = index === activeSheetIndex
          const validation = sheetValidationResults[index]
          const isComplete = validation?.isValid
          const hasMissing = (validation?.missing ?? []).length > 0
          const IconComp = isComplete ? Check : AlertTriangle
          const sheetLabel = sheet.name || `Sheet ${index + 1}`
          const tooltipLabel = isComplete
            ? "Style column mapped; images auto-detected"
            : hasMissing
              ? `Missing: ${(validation?.missing ?? []).join(", ")}`
              : "Map required columns"
          return (
            <TooltipProvider key={sheet.name || index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size={size}
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "cursor-pointer transition-all duration-200 font-semibold",
                      isActive ? "font-bold border border-primary" : "border-0",
                      !isActive && isComplete ? sheetInactiveBg : "",
                      !isActive && !isComplete
                        ? "bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                        : "",
                      !isActive && isComplete ? sheetInactiveHover : "",
                    )}
                    onClick={() => handleActiveSheetChange(index)}
                    aria-pressed={isActive}
                  >
                    {sheetLabel}
                    <IconComp className="ml-2 h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipLabel}</p>
                </TooltipContent>
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
      sheetInactiveBg,
      sheetInactiveHover,
      sheetValidationResults,
      sheetWarningHover,
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
    if (!uploadedFile) {
      showToast(
        "Missing File",
        "Original workbook is unavailable. Re-upload the Excel file.",
        "error",
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
        if (mapping.style === null) {
          throw new Error(
            `Sheet "${
              sheet.name || `Sheet ${index + 1}`
            }" is missing the style column mapping.`,
          )
        }

        const baseName = uploadedFile?.name
          ? uploadedFile.name.replace(/\.xlsx?$/i, "")
          : "crop"
        const sheetLabel = (sheet.name || `sheet-${index + 1}`)
          .replace(/\s+/g, "-")
          .toLowerCase()
        const fileName = `${baseName}-${sheetLabel}.xlsx`
        const originalFile = uploadedFile
          ? new File([uploadedFile], fileName, {
              type:
                uploadedFile.type ||
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })
          : null
        if (!originalFile) {
          throw new Error(
            "Original file missing. Please re-upload your workbook.",
          )
        }
        const formData = new FormData()
        formData.append("fileUploadCrop", originalFile)
        formData.append("searchColCrop", indexToColumnLetter(mapping.style))
        formData.append("header_index", String(sheet.headerIndex + 1))
        formData.append("sheetName", sheet.name || `Sheet ${index + 1}`)
        formData.append("sheetIndex", String(index + 1))
        formData.append("sendToEmail", sendToEmail)
        formData.append(
          "replaceImageColumn",
          replaceImageColumn ? "true" : "false",
        )

        const response = await fetch(`${serverUrl}/submitCrop`, {
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
        `${sheetConfigs.length} crop job(s) submitted successfully`,
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
    replaceImageColumn,
    sendToEmail,
    sheetConfigs,
    sheetValidationResults,
    showToast,
    uploadedFile,
  ])

  return (
    <div className="container mx-auto max-w-7xl p-4 bg-[#FFFFFF] text-foreground">
      <div className="flex flex-col gap-6 items-stretch">
        {onBack && (
          <Button
            className="self-start"
            variant="ghost"
            size="sm"
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
          className={cn(
            isDev ? "bg-red-50 border border-red-200 rounded-md p-3" : "",
          )}
        >
          <div className="flex justify-between items-center mb-4">
            {isDev ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Not for production use
                </span>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
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
          </div>

          {/* Stepper */}
          <div className="flex justify-between bg-neutral-50 dark:bg-neutral-900 p-2 rounded-md items-center">
            <div className="flex gap-4">
              {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
                <p
                  key={s}
                  className={cn(
                    "text-sm",
                    step ===
                      s.toLowerCase().replace("header selection", "preview")
                      ? "font-bold text-primary"
                      : "text-muted-foreground",
                    i < ["upload", "preview", "map", "submit"].indexOf(step)
                      ? "cursor-pointer"
                      : "cursor-default",
                  )}
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
                </p>
              ))}
            </div>
            {step !== "upload" && (
              <div className="flex gap-2">
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
                      isLoading || !validateForm.isValid || !isEmailValid
                    }
                    size="sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Upload */}
          {step === "upload" && (
            <div className="flex flex-col gap-4 items-stretch">
              <h3 className="text-lg font-bold">Crop Images</h3>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="bg-white dark:bg-gray-900"
                        aria-label="Upload Excel file"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload an Excel file (.xlsx or .xls) up to 50MB</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {isLoading && <Loader2 className="mt-4 h-8 w-8 animate-spin" />}
            </div>
          )}

          {/* Preview / Header selection */}
          {step === "preview" && (
            <div className="flex flex-col gap-4 items-stretch">
              {hasMultipleSheets && (
                <Card
                  className={cn(
                    "bg-white dark:bg-gray-800",
                    mappingPanelBorder,
                  )}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex flex-col gap-2 items-stretch">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Sheets</p>
                        <p className="text-xs text-muted-foreground">
                          Viewing{" "}
                          {sheetConfigs[activeSheetIndex]?.name ||
                            `Sheet ${activeSheetIndex + 1}`}
                        </p>
                      </div>
                      {renderSheetButtons("sm")}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex gap-2 text-xs text-muted-foreground items-center">
                              <ActiveSheetStatusIcon
                                className={cn(
                                  "h-3 w-3",
                                  activeSheetStatusColor,
                                )}
                              />
                              <p>{activeSheetStatusLabel}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{activeSheetStatusTooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="text-xs text-muted-foreground">
                        Select a sheet to preview its header row and sample
                        data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="flex gap-2 items-center">
                <p>Select Header Row:</p>
                <Select
                  value={String(headerIndex)}
                  onValueChange={(val) => handleHeaderChange(Number(val))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select row" />
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
                        className={cn(
                          "cursor-pointer hover:bg-primary/10",
                          rowIndex === headerIndex
                            ? "bg-primary/20 font-bold"
                            : "",
                        )}
                        onClick={() => handleHeaderChange(rowIndex)}
                        role="button"
                      >
                        {row.map((cell, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            className={cn(
                              "max-w-[200px] truncate border",
                              rowIndex === headerIndex
                                ? "border-primary border-2"
                                : "border-border",
                            )}
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
            <div className="flex flex-col md:flex-row gap-4 items-stretch max-h-[70vh] overflow-auto">
              <div
                className={cn(
                  "flex flex-col gap-4 items-stretch bg-transparent p-4 rounded-md border w-full md:w-[40%] overflow-y-auto",
                  mappingPanelBorder,
                )}
              >
                {hasMultipleSheets && (
                  <Card
                    className={cn(
                      "shadow-xs",
                      mappingPanelBg,
                      mappingPanelBorder,
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 items-stretch">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
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
                              <div className="flex gap-2 text-xs text-muted-foreground items-center">
                                <ActiveSheetStatusIcon
                                  className={cn(
                                    "h-3 w-3",
                                    activeSheetStatusColor,
                                  )}
                                />
                                <p>{activeSheetStatusLabel}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{activeSheetStatusTooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-xs text-muted-foreground">
                          Currently editing:{" "}
                          {sheetConfigs[activeSheetIndex]?.name ||
                            `Sheet ${activeSheetIndex + 1}`}
                        </p>
                      </div>
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
                  Select the style field below, then click a column in the
                  preview grid to map it instantly.
                </p>

                {(["style"] as (keyof ColumnMapping)[]).map((field) => (
                  <div
                    key={field}
                    className={cn(
                      "flex gap-2 items-center p-2 rounded-md border cursor-pointer",
                      activeMappingField === field
                        ? "border-primary bg-primary/10 border-2"
                        : "border-transparent bg-transparent border-1",
                    )}
                    onClick={() => setActiveMappingField(field)}
                  >
                    <p className="w-[180px] font-semibold">Style # Column:</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Select
                            value={
                              columnMapping[field] !== null
                                ? String(columnMapping[field])
                                : "-1"
                            }
                            onValueChange={(val) =>
                              handleColumnMap(
                                val === "-1" ? null : Number(val),
                                field,
                              )
                            }
                          >
                            <SelectTrigger
                              className="flex-1"
                              onFocus={() => setActiveMappingField(field)}
                              onClick={() => setActiveMappingField(field)}
                            >
                              <SelectValue placeholder="Unmapped" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-1">Unmapped</SelectItem>
                              {excelData.headers.map((header, index) => (
                                <SelectItem key={index} value={String(index)}>
                                  {header ||
                                    `Column ${indexToColumnLetter(index)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select Excel column for style</p>
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
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
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

              <div className="overflow-auto border rounded-md p-2 w-full md:w-[60%] max-h-[70vh] mt-4 md:mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {excelData.headers.map((header, index) => {
                        const isMapped = mappedColumnsForHighlight.has(index)
                        const isSelected = selectedColumnIndex === index
                        return (
                          <TableHead
                            key={index}
                            className={cn(
                              "sticky top-0 cursor-pointer",
                              isSelected
                                ? "bg-primary/20 border-primary border-2"
                                : isMapped
                                  ? "bg-neutral-100 dark:bg-neutral-800"
                                  : "bg-neutral-100 dark:bg-neutral-800",
                              isSelected || isMapped ? "border-2" : "",
                            )}
                            onClick={() => handleColumnMapFromGrid(index)}
                            tabIndex={activeMappingField ? 0 : undefined}
                            onKeyDown={(event) => {
                              if (!activeMappingField) return
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                handleColumnMapFromGrid(index)
                              }
                            }}
                            role={activeMappingField ? "button" : undefined}
                            aria-pressed={isSelected}
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
                            return (
                              <TableCell
                                key={cellIndex}
                                className={cn(
                                  "max-w-[200px] truncate cursor-pointer",
                                  isMissingRequired
                                    ? "bg-red-100 dark:bg-red-900"
                                    : isSelectedColumn
                                      ? "bg-primary/10"
                                      : isMappedColumn
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : "",
                                )}
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
            <div className="flex flex-col gap-4 items-stretch">
              <div className="flex flex-col gap-4 items-start">
                <p>Rows: {excelData.rows.length}</p>
                <div className="flex flex-col gap-2">
                  <Label>User:</Label>
                  {sendToEmail ? (
                    <p className="font-medium">{sendToEmail}</p>
                  ) : (
                    <p className="text-sm text-red-500">
                      No email parameter detected. Add
                      ?sendToEmail=example@domain.com to the iframe URL.
                    </p>
                  )}
                  {!isEmailValid && sendToEmail && (
                    <p className="text-sm text-red-500 mt-1">
                      Invalid email. Please update the iframe URL.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="replaceImageColumn"
                      checked={replaceImageColumn}
                      onCheckedChange={(checked) =>
                        setReplaceImageColumn(checked as boolean)
                      }
                    />
                    <Label htmlFor="replaceImageColumn">
                      Replace original image column with cropped output
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {replaceImageColumn
                      ? "Only the cropped images will remain in the detected image column."
                      : "Deselect to keep both the original and cropped image columns."}
                  </p>
                </div>
                <p>Mapped Columns:</p>
                <div className="w-full overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Column</TableHead>
                        <TableHead>Preview</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(["style"] as (keyof ColumnMapping)[])
                        .filter((key) => columnMapping[key] !== null)
                        .map((key) => (
                          <TableRow key={key}>
                            <TableCell>Style # Column</TableCell>
                            <TableCell>
                              {excelData.headers[
                                columnMapping[key] as number
                              ] ||
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
                <p className="text-sm text-muted-foreground">
                  Image columns are detected automatically when present; no
                  mapping required.
                </p>
              </div>

              {isDev && activeSheet && (
                <div className="mt-4">
                  <CurlDisplay
                    url={`${serverUrl}/submitCrop`}
                    method="POST"
                    formDataEntries={{
                      fileUploadCrop: uploadedFile
                        ? new File(
                            [uploadedFile],
                            `${
                              uploadedFile.name.replace(/\.xlsx?$/i, "") ||
                              "google-images"
                            }-${(
                              activeSheet.name ||
                              `sheet-${activeSheetIndex + 1}`
                            )
                              .replace(/\s+/g, "-")
                              .toLowerCase()}.xlsx`,
                            { type: uploadedFile.type },
                          )
                        : null,
                      searchColCrop: indexToColumnLetter(columnMapping.style!),
                      header_index: String(activeSheet.headerIndex + 1),
                      sendToEmail: sendToEmail,
                      sheetName:
                        activeSheet.name || `Sheet ${activeSheetIndex + 1}`,
                      sheetIndex: String(activeSheetIndex + 1),
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubmitCropForm
