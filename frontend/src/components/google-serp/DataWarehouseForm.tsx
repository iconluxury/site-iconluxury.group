import { CurlDisplay } from "@/components/CurlDisplay"
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
import useCustomToast from "@/hooks/useCustomToast"
import { useIframeEmail } from "@/hooks/useIframeEmail"
import { cn } from "@/lib/utils"
import { AlertTriangle, ArrowLeft, Check, Loader2, X } from "lucide-react"
import type React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { SheetSelector } from "./SheetSelector"
import { UploadStep } from "./UploadStep"
import {
  DATA_WAREHOUSE_MODE_CONFIG,
  SERVER_URL as INITIAL_SERVER_URL,
  MAX_FILE_SIZE_MB,
  MAX_PREVIEW_ROWS,
} from "./constants"
import type {
  CellValue,
  ColumnMapping,
  ColumnType,
  DataWarehouseFormProps,
  DataWarehouseMappingField,
  ExcelData,
  FormWithBackProps,
  SheetConfig,
  ToastFunction,
} from "./types"
import {
  autoMapColumns,
  createEmptyColumnMapping,
  detectHeaderRow,
  determineFallbackImageColumnIndex,
  formatMappingFieldLabel,
  getColumnMappingEntries,
  getColumnPreview,
  getDisplayValue,
  indexToColumnLetter,
  sanitizeWorksheet,
  withManualBrandValue,
} from "./utils"

export const DataWarehouseForm: React.FC<DataWarehouseFormProps> = ({
  onBack,
  backLabel,
  mode,
}) => {
  const modeConfig = DATA_WAREHOUSE_MODE_CONFIG[mode]
  const REQUIRED_COLUMNS = modeConfig.requiredColumns
  const OPTIONAL_COLUMNS = modeConfig.optionalColumns
  const ALL_COLUMNS = useMemo<ColumnType[]>(
    () => [...modeConfig.requiredColumns, ...modeConfig.optionalColumns],
    [mode],
  )
  const allowImageColumnMapping = modeConfig.allowImageColumnMapping
  const requireImageColumn = modeConfig.requireImageColumn
  const isImagesOnlyMode = mode === "imagesOnly"
  const enableImageTargetMapping = allowImageColumnMapping && isImagesOnlyMode

  const [step, setStep] = useState<"upload" | "preview" | "map" | "submit">(
    "upload",
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([])
  const [originalWorkbook, setOriginalWorkbook] =
    useState<XLSX.WorkBook | null>(null)
  const originalFileBufferRef = useRef<ArrayBuffer | null>(null)
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  // These seem to be legacy single-sheet state, but we'll keep them if needed or derive them
  // const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] })
  // const [rawData, setRawData] = useState<CellValue[][]>([])
  // const [headerIndex, setHeaderIndex] = useState<number>(1)
  // const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ ... })

  const [activeMappingField, setActiveMappingField] = useState<
    DataWarehouseMappingField | "imageColumn" | null
  >(null)
  const [manualBrand, setManualBrand] = useState("")
  const [isManualBrandApplied, setIsManualBrandApplied] = useState(false)
  const [isNewDistro, setIsNewDistro] = useState(false)
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD")
  const [skipDataWarehouse, setSkipDataWarehouse] = useState(false)
  const [isIconDistro, setIsIconDistro] = useState(false)
  const [isAiMode, setIsAiMode] = useState(false)

  const iframeEmail = useIframeEmail()
  const emailRecipient = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const sendToEmail = emailRecipient // Alias for compatibility

  const showToast: ToastFunction = useCustomToast()
  const isEmailValid = useMemo(() => {
    if (!emailRecipient) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)
  }, [emailRecipient])

  // Derived state for active sheet
  const activeSheet = sheetConfigs[activeSheetIndex]
  const excelData = activeSheet?.excelData || { headers: [], rows: [] }
  const rawData = activeSheet?.rawData || []
  const headerIndex = activeSheet?.headerIndex || 0
  const columnMapping = activeSheet?.columnMapping || createEmptyColumnMapping()

  const updateSheetConfig = useCallback(
    (index: number, updater: (config: SheetConfig) => SheetConfig) => {
      setSheetConfigs((prev) => {
        const newConfigs = [...prev]
        if (newConfigs[index]) {
          newConfigs[index] = updater(newConfigs[index])
        }
        return newConfigs
      })
    },
    [],
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0]
      if (!selectedFile) {
        showToast("File Error", "No file selected", "error")
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
      try {
        const data = await selectedFile.arrayBuffer()
        originalFileBufferRef.current = data
        const workbook = XLSX.read(data, { type: "array" })
        setOriginalWorkbook(workbook)

        const sheets: SheetConfig[] = []

        for (let i = 0; i < workbook.SheetNames.length; i++) {
          const sheetName = workbook.SheetNames[i]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: true,
            defval: "",
          }) as CellValue[][]

          if (jsonData.length === 0) continue

          const detectedHeaderIndex = detectHeaderRow(jsonData)
          const headers = (jsonData[detectedHeaderIndex] || []).map((cell) =>
            String(cell ?? ""),
          )
          const rows = jsonData.slice(detectedHeaderIndex + 1)

          sheets.push({
            name: sheetName,
            originalIndex: i,
            excelData: { headers, rows },
            rawData: jsonData,
            headerIndex: detectedHeaderIndex,
            columnMapping: autoMapColumns(headers),
            isSelected: i === 0, // Select first sheet by default
            manualBrandValue: null,
          })
        }

        if (sheets.length === 0)
          throw new Error("Excel file is empty or invalid")

        setSheetConfigs(sheets)
        setActiveSheetIndex(0)
        setStep("preview")
      } catch (error) {
        showToast(
          "File Processing Error",
          error instanceof Error ? error.message : "Unknown error",
          "error",
        )
        setUploadedFile(null)
      } finally {
        setIsLoading(false)
      }
    },
    [showToast],
  )

  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (!activeSheet) return
      if (newHeaderIndex < 0 || newHeaderIndex >= rawData.length) return

      updateSheetConfig(activeSheetIndex, (sheet) => {
        const headers = sheet.rawData[newHeaderIndex].map((cell) =>
          String(cell ?? ""),
        )
        const rows = sheet.rawData.slice(newHeaderIndex + 1)
        return {
          ...sheet,
          headerIndex: newHeaderIndex,
          excelData: { headers, rows },
          columnMapping: autoMapColumns(headers),
          manualBrandValue: null, // Reset manual brand on header change
        }
      })
      setIsManualBrandApplied(false)
      setManualBrand("")
      setActiveMappingField(null)
    },
    [activeSheet, activeSheetIndex, rawData, updateSheetConfig],
  )

  const handleDataColumnMap = useCallback(
    (index: number, field: ColumnType) => {
      if (field && !ALL_COLUMNS.includes(field)) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping = { ...sheet.columnMapping }
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (
            newMapping[key] === index &&
            key !== "readImage" &&
            key !== "imageAdd"
          ) {
            newMapping[key] = null
            if (key === "brand") {
              setManualBrand("")
              setIsManualBrandApplied(false)
            }
          }
        })
        if (field && ALL_COLUMNS.includes(field)) {
          newMapping[field as keyof ColumnMapping] = index
          if (field === "brand") {
            setManualBrand("")
            setIsManualBrandApplied(false)
          }
        }
        return { ...sheet, columnMapping: newMapping }
      })
    },
    [ALL_COLUMNS, activeSheetIndex, updateSheetConfig],
  )

  const handleImageColumnMap = useCallback(
    (index: number | null) => {
      updateSheetConfig(activeSheetIndex, (sheet) => ({
        ...sheet,
        columnMapping: {
          ...sheet.columnMapping,
          imageAdd: index,
          ...(enableImageTargetMapping ? {} : { readImage: index }),
        },
      }))
    },
    [activeSheetIndex, enableImageTargetMapping, updateSheetConfig],
  )

  const handleColumnMapFromGrid = useCallback(
    (index: number) => {
      if (activeMappingField === null) return
      if (activeMappingField === "imageColumn") {
        handleImageColumnMap(index)
      } else {
        handleDataColumnMap(index, activeMappingField)
      }
      setActiveMappingField(null)
    },
    [activeMappingField, handleDataColumnMap, handleImageColumnMap],
  )

  const handleClearMapping = useCallback(
    (index: number) => {
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping = { ...sheet.columnMapping }
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (
            newMapping[key] === index &&
            key !== "readImage" &&
            key !== "imageAdd"
          ) {
            newMapping[key] = null
            if (key === "brand") {
              setManualBrand("")
              setIsManualBrandApplied(false)
            }
          }
        })
        return { ...sheet, columnMapping: newMapping }
      })
    },
    [activeSheetIndex, updateSheetConfig],
  )

  const mappedDataColumns = useMemo(() => {
    const keys: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]
    return new Set(
      keys
        .map((key) => columnMapping[key])
        .filter((value): value is number => typeof value === "number"),
    )
  }, [columnMapping, OPTIONAL_COLUMNS, REQUIRED_COLUMNS])

  const mappedColumnsForHighlight = useMemo(() => {
    const set = new Set(mappedDataColumns)
    if (typeof columnMapping.readImage === "number")
      set.add(columnMapping.readImage)
    if (typeof columnMapping.imageAdd === "number")
      set.add(columnMapping.imageAdd)
    return set
  }, [columnMapping.imageAdd, columnMapping.readImage, mappedDataColumns])

  const imageColumnIndex = useMemo(() => {
    return columnMapping.readImage
  }, [columnMapping.readImage])

  const selectedColumnIndex =
    activeMappingField !== null ? columnMapping[activeMappingField] : null

  const headersAreValid = useMemo(
    () => excelData.headers.some((header) => String(header).trim() !== ""),
    [excelData.headers],
  )

  const applyManualBrand = useCallback(() => {
    const trimmed = manualBrand.trim()
    if (!trimmed) {
      showToast(
        "Manual Brand Error",
        "Please enter a non-empty brand name",
        "warning",
      )
      return
    }
    if (!activeSheet) return
    updateSheetConfig(activeSheetIndex, (sheet) => {
      const updatedSheet = withManualBrandValue(sheet, trimmed)
      const brandIndex = updatedSheet.excelData.headers.length - 1
      return {
        ...updatedSheet,
        columnMapping: {
          ...updatedSheet.columnMapping,
          brand: brandIndex,
        },
        manualBrandValue: trimmed,
      }
    })
    showToast("Success", `Manual brand "${trimmed}" applied`, "success")
    setManualBrand("")
    setActiveMappingField(null)
  }, [activeSheet, activeSheetIndex, manualBrand, showToast, updateSheetConfig])

  const removeManualBrand = useCallback(() => {
    if (!activeSheet?.manualBrandValue) return
    updateSheetConfig(activeSheetIndex, (sheet) =>
      withManualBrandValue(sheet, null),
    )
    showToast("Success", "Manual brand removed", "success")
    setManualBrand("")
    setActiveMappingField(null)
  }, [activeSheet, activeSheetIndex, showToast, updateSheetConfig])

  const validateForm = useMemo(() => {
    if (!activeSheet) {
      return {
        isValid: false,
        missing: REQUIRED_COLUMNS,
      }
    }
    if (!activeSheet.isSelected) {
      return {
        isValid: true,
        missing: [],
      }
    }
    const missing = REQUIRED_COLUMNS.filter(
      (col) => columnMapping[col] === null,
    )
    return {
      isValid:
        missing.length === 0 && excelData.rows.length > 0 && headersAreValid,
      missing,
    }
  }, [
    activeSheet,
    columnMapping,
    excelData.rows.length,
    headersAreValid,
    REQUIRED_COLUMNS,
  ])

  const sheetValidationResults = useMemo(
    () =>
      sheetConfigs.map((sheet, index) => {
        const mapping = sheet.columnMapping ?? createEmptyColumnMapping()
        const missing = REQUIRED_COLUMNS.filter((col) => mapping[col] === null)
        const headersValid = sheet.excelData.headers.some(
          (header) => String(header).trim() !== "",
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
    [REQUIRED_COLUMNS, sheetConfigs],
  )

  const hasInvalidSelectedSheet = useMemo(
    () =>
      sheetValidationResults.some((result) => {
        const sheet = sheetConfigs[result.sheetIndex]
        return sheet?.isSelected && !result.isValid
      }),
    [sheetConfigs, sheetValidationResults],
  )

  const activeSheetValidation = sheetValidationResults[activeSheetIndex] ?? null
  const activeSheetIsReady = Boolean(activeSheetValidation?.isValid)
  const activeSheetMissingColumns = activeSheetValidation?.missing ?? []
  const activeSheetIsSelected = activeSheet?.isSelected ?? false
  const activeSheetStatusLabel = activeSheetIsSelected
    ? activeSheetIsReady
      ? "Ready"
      : "Needs mapping"
    : "Excluded"
  const ActiveSheetStatusIcon = activeSheetIsSelected
    ? activeSheetIsReady
      ? Check
      : AlertTriangle
    : X
  const activeSheetStatusColor = activeSheetIsSelected
    ? activeSheetIsReady
      ? "text-green-400"
      : "text-yellow-400"
    : "text-muted-foreground"
  const activeSheetStatusTooltip = activeSheetIsSelected
    ? activeSheetIsReady
      ? "All required columns are mapped."
      : activeSheetMissingColumns.length > 0
        ? `Missing required columns: ${activeSheetMissingColumns.join(", ")}`
        : "Map all required columns before submitting."
    : "Sheet will be skipped during submission."

  const handleActiveSheetChange = useCallback((index: number) => {
    setActiveSheetIndex(index)
    setIsManualBrandApplied(false)
    setManualBrand("")
    setActiveMappingField(null)
  }, [])

  const handleToggleSheetSelection = useCallback(
    (index: number) => {
      updateSheetConfig(index, (sheet) => ({
        ...sheet,
        isSelected: !sheet.isSelected,
      }))
    },
    [updateSheetConfig],
  )

  const selectedSheetCount = sheetConfigs.filter((s) => s.isSelected).length
  const hasMultipleSheets = sheetConfigs.length > 1

  const prepareSheetUploadFile = useCallback(
    (sheet: SheetConfig, index: number, fileName: string, isolate: boolean) => {
      if (!uploadedFile) {
        throw new Error(
          "Original file missing. Please re-upload your workbook.",
        )
      }
      const originalType =
        uploadedFile.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

      if (!isolate) {
        return new File([uploadedFile], fileName, {
          type: originalType,
          lastModified: uploadedFile.lastModified,
        })
      }

      const buffer = originalFileBufferRef.current
      if (buffer) {
        try {
          const workbook = XLSX.read(buffer.slice(0), {
            type: "array",
            cellStyles: true,
          })
          const candidates: string[] = []
          if (sheet.name) candidates.push(sheet.name)
          if (
            typeof sheet.originalIndex === "number" &&
            workbook.SheetNames[sheet.originalIndex]
          ) {
            candidates.push(workbook.SheetNames[sheet.originalIndex])
          }
          if (workbook.SheetNames[index]) {
            candidates.push(workbook.SheetNames[index])
          }
          candidates.push(`Sheet ${index + 1}`)
          const resolvedSheetName = candidates.find((candidate) =>
            candidate ? Boolean(workbook.Sheets[candidate]) : false,
          )

          if (resolvedSheetName) {
            const worksheet = sanitizeWorksheet(
              workbook.Sheets[resolvedSheetName],
            )
            const trimmedWorkbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(
              trimmedWorkbook,
              worksheet,
              resolvedSheetName,
            )

            const arrayBuffer = XLSX.write(trimmedWorkbook, {
              bookType: "xlsx",
              type: "array",
              cellStyles: true,
            })

            return new File([arrayBuffer], fileName, {
              type: originalType,
              lastModified: uploadedFile.lastModified,
            })
          }
        } catch (error) {
          console.error("Workbook isolation error:", error)
        }
      }

      const fallbackRows =
        sheet.rawData.length > 0
          ? sheet.rawData
          : [sheet.excelData.headers, ...sheet.excelData.rows]
      const fallbackSheet = XLSX.utils.aoa_to_sheet(fallbackRows)
      const fallbackWorkbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        fallbackWorkbook,
        fallbackSheet,
        sheet.name || `Sheet ${index + 1}`,
      )
      const fallbackArray = XLSX.write(fallbackWorkbook, {
        bookType: "xlsx",
        type: "array",
        cellStyles: true,
      })
      return new File([fallbackArray], fileName, {
        type: originalType,
        lastModified: uploadedFile.lastModified,
      })
    },
    [sanitizeWorksheet, uploadedFile],
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
    const sheetsToSubmit = sheetConfigs
      .map((sheet, index) => ({ sheet, index }))
      .filter(({ sheet }) => sheet.isSelected)
    if (sheetsToSubmit.length === 0) {
      showToast(
        "No Sheets Selected",
        "Select at least one sheet before submitting.",
        "warning",
      )
      return
    }
    const invalidSheet = sheetValidationResults
      .filter((result) => sheetConfigs[result.sheetIndex]?.isSelected)
      .find((result) => !result.isValid)
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
      if (!uploadedFile) {
        throw new Error(
          "Original file missing. Please re-upload your workbook.",
        )
      }
      const workbookSheetCount =
        originalWorkbook?.SheetNames?.length ?? sheetConfigs.length
      const shouldIsolateSheets = workbookSheetCount > 1
      for (const { index, sheet } of sheetsToSubmit) {
        const mapping = sheet.columnMapping
        if (mapping.style === null) {
          throw new Error(
            `Sheet "${
              sheet.name || `Sheet ${index + 1}`
            }" is missing a mapped style column.`,
          )
        }

        const baseName = uploadedFile?.name
          ? uploadedFile.name.replace(/\.xlsx?$/i, "")
          : "google-images"
        const sheetLabel = (sheet.name || `sheet-${index + 1}`)
          .replace(/\s+/g, "-")
          .toLowerCase()
        const fileName = `${baseName}-${sheetLabel}.xlsx`
        const sheetFile = prepareSheetUploadFile(
          sheet,
          index,
          fileName,
          shouldIsolateSheets,
        )
        const formData = new FormData()
        formData.append("fileUploadImage", sheetFile)
        formData.append("searchColImage", indexToColumnLetter(mapping.style))

        if (sheet.manualBrandValue) {
          formData.append("brandColImage", "MANUAL")
          formData.append("manualBrand", sheet.manualBrandValue)
        } else if (mapping.brand !== null) {
          formData.append("brandColImage", indexToColumnLetter(mapping.brand))
        }

        const fallbackImageColumnIndex = determineFallbackImageColumnIndex(
          sheet.excelData.headers,
          sheet.excelData.rows,
        )
        const imageColumnIndex =
          mapping.readImage ?? mapping.imageAdd ?? fallbackImageColumnIndex
        if (imageColumnIndex !== null) {
          formData.append(
            "imageColumnImage",
            indexToColumnLetter(imageColumnIndex),
          )
        } else {
          formData.append("imageColumnImage", "")
        }
        if (mapping.colorName !== null) {
          formData.append(
            "ColorColImage",
            indexToColumnLetter(mapping.colorName),
          )
        }
        if (mapping.category !== null) {
          formData.append(
            "CategoryColImage",
            indexToColumnLetter(mapping.category),
          )
        }
        formData.append("header_index", String(sheet.headerIndex + 1))
        formData.append("sendToEmail", sendToEmail)
        formData.append("sheetName", sheet.name || `Sheet ${index + 1}`)
        formData.append("sheetIndex", String(index + 1))
        formData.append("isIconDistro", String(isIconDistro))
        formData.append("isAiMode", String(isAiMode))
        formData.append("skipDataWarehouse", String(skipDataWarehouse))
        formData.append("isImagesOnly", String(mode === "imagesOnly"))
        formData.append("isMsrpOnly", String(mode === "msrpOnly"))
        formData.append("mode", mode)

        const response = await fetch(`${serverUrl}/datawarehouse`, {
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
        `${sheetsToSubmit.length} job(s) submitted successfully`,
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
    isAiMode,
    isEmailValid,
    isIconDistro,
    originalWorkbook,
    prepareSheetUploadFile,
    sendToEmail,
    sheetConfigs,
    sheetValidationResults,
    showToast,
    skipDataWarehouse,
    uploadedFile,
  ])

  const [serverUrl, setServerUrl] = useState(INITIAL_SERVER_URL)
  const isDev = serverUrl.includes("dev") || serverUrl.includes("localhost")

  if (!sendToEmail) {
    return (
      <div className="w-full bg-background text-foreground">
        <div className="flex flex-col gap-6 items-stretch">
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
              {backLabel ?? "Back to tools"}
            </Button>
          )}
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
            <h2 className="text-xl font-semibold">
              No Email Parameter Detected
            </h2>
            <p className="text-muted-foreground max-w-md">
              Please add{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                ?sendToEmail=example@domain.com
              </code>{" "}
              (or email/userEmail) to the iframe URL.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-background text-foreground">
      <div className="flex flex-col gap-6 items-stretch">
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
            {backLabel ?? "Back to tools"}
          </Button>
        )}
        <div className="flex flex-row justify-between bg-muted p-2 rounded-md items-center">
          <div className="flex flex-row gap-4">
            {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
              <p
                key={s}
                className={cn(
                  "cursor-pointer",
                  step === s.toLowerCase()
                    ? "font-bold text-primary"
                    : "text-muted-foreground",
                  i < ["upload", "preview", "map", "submit"].indexOf(step)
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
                onClick={() => {
                  if (i < ["upload", "preview", "map", "submit"].indexOf(step))
                    setStep(
                      s
                        .toLowerCase()
                        .replace("header selection", "preview") as typeof step,
                    )
                }}
              >
                {i + 1}. {s}
              </p>
            ))}
          </div>
          {step !== "upload" && (
            <div className="flex flex-row gap-2">
              {step !== "preview" && (
                <Button
                  onClick={() =>
                    setStep(
                      ["upload", "preview", "map", "submit"][
                        ["upload", "preview", "map", "submit"].indexOf(step) - 1
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
                    !isEmailValid ||
                    selectedSheetCount === 0 ||
                    hasInvalidSelectedSheet
                  }
                  size="sm"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Select value={serverUrl} onValueChange={setServerUrl}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Backend" />
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

        {step === "upload" && (
          <UploadStep onFileChange={handleFileChange} isLoading={isLoading} />
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4 items-stretch">
            {hasMultipleSheets && (
              <Card className="bg-card border-border">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col gap-2 items-stretch">
                    <div className="flex flex-row justify-between items-center">
                      <p className="font-semibold">Sheets</p>
                      <div className="flex flex-row gap-2 items-center">
                        <Badge variant="secondary">
                          {selectedSheetCount} selected
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Viewing{" "}
                          {sheetConfigs[activeSheetIndex]?.name ||
                            `Sheet ${activeSheetIndex + 1}`}
                        </p>
                      </div>
                    </div>
                    <SheetSelector
                      sheetConfigs={sheetConfigs}
                      activeSheetIndex={activeSheetIndex}
                      sheetValidationResults={sheetValidationResults}
                      onActiveSheetChange={handleActiveSheetChange}
                      onToggleSheetSelection={handleToggleSheetSelection}
                      size="xs"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-row gap-2 text-xs text-muted-foreground items-center">
                            <ActiveSheetStatusIcon
                              className={cn("h-3 w-3", activeSheetStatusColor)}
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
                      Select a sheet to preview its header row and sample data.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use the checkbox to include or exclude sheets from
                      submission.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex flex-row items-center gap-2">
              <p>Select Header Row:</p>
              <select
                value={headerIndex}
                onChange={(e) => handleHeaderChange(Number(e.target.value))}
                className="w-[150px] border rounded p-1"
                aria-label="Select header row"
              >
                {rawData.slice(0, 20).map((_, index) => (
                  <option key={index} value={index}>
                    Row {index + 1} {index === headerIndex ? "(Selected)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto border rounded-md p-2">
              <Table>
                <TableBody>
                  {rawData.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className={cn(
                        "cursor-pointer hover:bg-primary/10",
                        rowIndex === headerIndex && "bg-primary/20 font-bold",
                      )}
                      onClick={() => handleHeaderChange(rowIndex)}
                    >
                      {row.map((cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          className={cn(
                            "max-w-[200px] truncate border",
                            rowIndex === headerIndex
                              ? "border-primary"
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

        {step === "map" && (
          <div className="flex flex-col md:flex-row gap-4 items-stretch max-h-[70vh] overflow-auto">
            <div className="flex flex-col gap-4 items-stretch bg-transparent p-4 rounded-md border border-border w-full md:w-[40%] overflow-y-auto">
              {hasMultipleSheets && (
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 items-stretch">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <p className="font-semibold">Sheets</p>
                          <p className="text-xs text-muted-foreground">
                            Pick a sheet to adjust its column mapping.
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {selectedSheetCount} selected
                        </Badge>
                      </div>
                      <SheetSelector
                        sheetConfigs={sheetConfigs}
                        activeSheetIndex={activeSheetIndex}
                        sheetValidationResults={sheetValidationResults}
                        onActiveSheetChange={handleActiveSheetChange}
                        onToggleSheetSelection={handleToggleSheetSelection}
                        size="sm"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-row gap-2 text-xs text-muted-foreground items-center">
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
                        {`Currently editing: ${
                          sheetConfigs[activeSheetIndex]?.name ||
                          `Sheet ${activeSheetIndex + 1}`
                        }`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toggle a checkbox to include or exclude a sheet from the
                        submission.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!validateForm.isValid && (
                <p className="text-red-500 text-sm font-medium">
                  Missing required columns:{" "}
                  {validateForm.missing
                    .map((field) => formatMappingFieldLabel(field))
                    .join(", ")}
                  . Please map all required columns.
                </p>
              )}
              {!headersAreValid && (
                <p className="text-red-500 text-sm font-medium">
                  Selected header row is empty. Choose a different header row
                  before mapping.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Select a field below, then click a column in the preview grid to
                map it instantly.
              </p>
              <p className="font-bold">Required Columns</p>
              {REQUIRED_COLUMNS.map((field) => (
                <div
                  key={field}
                  className={cn(
                    "flex flex-row gap-2 items-center p-2 rounded-md border cursor-pointer",
                    activeMappingField === field
                      ? "border-primary bg-primary/10"
                      : "border-transparent",
                  )}
                  onClick={() => setActiveMappingField(field)}
                >
                  <p className="w-[120px] font-semibold">{field}:</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <select
                          value={
                            columnMapping[field] !== null
                              ? columnMapping[field]!
                              : ""
                          }
                          onChange={(e) =>
                            handleDataColumnMap(Number(e.target.value), field)
                          }
                          onFocus={() => setActiveMappingField(field)}
                          onClick={() => setActiveMappingField(field)}
                          className="flex-1 border rounded p-1"
                          aria-label={`Map ${field} column`}
                        >
                          <option value="">Unmapped</option>
                          {excelData.headers.map((header, index) => (
                            <option
                              key={index}
                              value={index}
                              disabled={
                                mappedDataColumns.has(index) &&
                                columnMapping[field] !== index
                              }
                            >
                              {header || `Column ${indexToColumnLetter(index)}`}
                            </option>
                          ))}
                        </select>
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
                            className="h-8 w-8"
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
              {OPTIONAL_COLUMNS.length > 0 && (
                <>
                  <p className="font-bold mt-4">Optional Columns</p>
                  {OPTIONAL_COLUMNS.map((field) => (
                    <div
                      key={field}
                      className={cn(
                        "flex flex-row gap-2 items-center p-2 rounded-md border cursor-pointer",
                        activeMappingField === field
                          ? "border-primary bg-primary/10"
                          : "border-transparent",
                      )}
                      onClick={() => setActiveMappingField(field)}
                    >
                      <p className="w-[120px] font-semibold">{field}:</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <select
                              value={
                                columnMapping[field] !== null
                                  ? columnMapping[field]!
                                  : ""
                              }
                              onChange={(e) =>
                                handleDataColumnMap(
                                  Number(e.target.value),
                                  field,
                                )
                              }
                              onFocus={() => setActiveMappingField(field)}
                              onClick={() => setActiveMappingField(field)}
                              className="flex-1 border rounded p-1"
                              aria-label={`Map ${field} column`}
                            >
                              <option value="">Unmapped</option>
                              {excelData.headers.map((header, index) => (
                                <option
                                  key={index}
                                  value={index}
                                  disabled={
                                    mappedDataColumns.has(index) &&
                                    columnMapping[field] !== index
                                  }
                                >
                                  {header ||
                                    `Column ${indexToColumnLetter(index)}`}
                                </option>
                              ))}
                            </select>
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
                                className="h-8 w-8"
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
                </>
              )}
              {OPTIONAL_COLUMNS.includes("brand") &&
                columnMapping.brand === null &&
                !isManualBrandApplied && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row gap-2 items-center">
                      <p className="w-[120px]">Add Brand Column:</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              placeholder="Add Brand for All Rows (Optional)"
                              value={manualBrand}
                              onChange={(e) => setManualBrand(e.target.value)}
                              aria-label="Manual brand input"
                              className="flex-1"
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter a brand to apply to all rows</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="sm"
                        onClick={applyManualBrand}
                        disabled={!manualBrand.trim()}
                      >
                        Apply
                      </Button>
                      {isManualBrandApplied && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={removeManualBrand}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {isManualBrandApplied && (
                      <Badge className="mt-2">
                        Manual Brand Column Applied
                      </Badge>
                    )}
                  </div>
                )}
              {enableImageTargetMapping && (
                <>
                  <p className="font-bold mt-4">Image Target Column</p>
                  <div
                    className={cn(
                      "flex flex-row gap-2 items-center p-2 rounded-md border cursor-pointer",
                      activeMappingField === "imageColumn"
                        ? "border-primary bg-primary/10"
                        : "border-transparent",
                    )}
                    onClick={() => setActiveMappingField("imageColumn")}
                  >
                    <p className="w-[120px] font-semibold">Target Anchor:</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <select
                            value={imageColumnIndex ?? ""}
                            onChange={(e) =>
                              handleImageColumnMap(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                              )
                            }
                            onFocus={() => setActiveMappingField("imageColumn")}
                            onClick={() => setActiveMappingField("imageColumn")}
                            className="flex-1 border rounded p-1"
                            aria-label="Map image column"
                          >
                            <option value="">Unmapped</option>
                            {excelData.headers.map((header, index) => (
                              <option key={index} value={index}>
                                {header ||
                                  `Column ${indexToColumnLetter(index)}`}
                              </option>
                            ))}
                          </select>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Select the column that contains the target anchor
                            used to place downloaded images
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {imageColumnIndex !== null && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleImageColumnMap(null)
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
                      {getColumnPreview(imageColumnIndex, excelData.rows)}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="overflow-auto border rounded-md p-2 w-full md:w-[60%] max-h-[70vh] mt-4 md:mt-0">
              <table className="w-full caption-bottom text-sm">
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
                              ? "bg-primary/20 border-2 border-primary"
                              : isMapped
                                ? "bg-primary/10"
                                : "bg-muted",
                            activeMappingField && "hover:bg-primary/10",
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
                          const isMissingRequired =
                            (columnMapping.style === cellIndex ||
                              columnMapping.msrp === cellIndex) &&
                            !cell
                          const isSelectedColumn =
                            selectedColumnIndex === cellIndex
                          const isMappedColumn =
                            mappedColumnsForHighlight.has(cellIndex)

                          return (
                            <TableCell
                              key={cellIndex}
                              className={cn(
                                "max-w-[200px] truncate",
                                isMissingRequired
                                  ? "bg-red-100"
                                  : isSelectedColumn
                                    ? "bg-primary/10"
                                    : isMappedColumn
                                      ? "bg-green-50"
                                      : "",
                                activeMappingField
                                  ? "cursor-pointer"
                                  : "cursor-default",
                              )}
                              onClick={() => handleColumnMapFromGrid(cellIndex)}
                            >
                              {getDisplayValue(cell)}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                </TableBody>
              </table>
            </div>
          </div>
        )}
        {step === "submit" && (
          <div className="flex flex-col gap-4 items-stretch">
            <div className="flex flex-col items-start gap-4">
              <p>Rows: {excelData.rows.length}</p>
              <div className="flex flex-col gap-2">
                <Label>Send results to email</Label>
                {emailRecipient ? (
                  <p className="font-medium">{emailRecipient}</p>
                ) : (
                  <p className="text-sm text-red-500">
                    No email parameter detected. Add
                    ?sendToEmail=example@domain.com (or email/userEmail) to the
                    iframe URL.
                  </p>
                )}
                {!isEmailValid && emailRecipient && (
                  <p className="text-sm text-red-500 mt-1">
                    The email supplied via the URL looks invalid. Update the
                    iframe query parameter before submitting.
                  </p>
                )}
              </div>
              {mode !== "imagesOnly" && (
                <div className="flex flex-row items-center gap-2">
                  <p>Currency:</p>
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as "USD" | "EUR")
                    }
                    className="w-[100px] border rounded p-1"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              )}
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
                  {getColumnMappingEntries(columnMapping)
                    .filter(
                      ([col, index]) =>
                        index !== null &&
                        col !== "readImage" &&
                        col !== "imageAdd",
                    )
                    .map(([col, index]) => (
                      <TableRow key={col}>
                        <TableCell>{col}</TableCell>
                        <TableCell>
                          {excelData.headers[index!] ||
                            `Column ${indexToColumnLetter(index!)}`}
                        </TableCell>
                        <TableCell>
                          {getColumnPreview(index, excelData.rows)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {enableImageTargetMapping && imageColumnIndex !== null && (
                    <TableRow>
                      <TableCell>Image Target</TableCell>
                      <TableCell>
                        {excelData.headers[imageColumnIndex] ||
                          `Column ${indexToColumnLetter(imageColumnIndex)}`}
                      </TableCell>
                      <TableCell>
                        {getColumnPreview(imageColumnIndex, excelData.rows)}
                      </TableCell>
                    </TableRow>
                  )}
                  {isManualBrandApplied && (
                    <TableRow>
                      <TableCell>Manual Brand</TableCell>
                      <TableCell>BRAND (Manual)</TableCell>
                      <TableCell>
                        {excelData.rows[0]?.[excelData.headers.length - 1] ||
                          manualBrand}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {isDev && activeSheet && (
              <div className="mt-4">
                <CurlDisplay
                  url={`${serverUrl}/datawarehouse`}
                  method="POST"
                  formDataEntries={{
                    fileUploadImage: uploadedFile
                      ? new File(
                          [uploadedFile],
                          `${
                            uploadedFile.name.replace(/\.xlsx?$/i, "") ||
                            "google-images"
                          }-${(
                            activeSheet.name || `sheet-${activeSheetIndex + 1}`
                          )
                            .replace(/\s+/g, "-")
                            .toLowerCase()}.xlsx`,
                          { type: uploadedFile.type },
                        )
                      : null,
                    searchColImage: indexToColumnLetter(
                      activeSheet.columnMapping.style!,
                    ),
                    brandColImage: activeSheet.manualBrandValue
                      ? "MANUAL"
                      : activeSheet.columnMapping.brand !== null
                        ? indexToColumnLetter(activeSheet.columnMapping.brand)
                        : null,
                    manualBrand: activeSheet.manualBrandValue || null,
                    imageColumnImage:
                      activeSheet.columnMapping.readImage !== null ||
                      activeSheet.columnMapping.imageAdd !== null
                        ? indexToColumnLetter(
                            (activeSheet.columnMapping.readImage ??
                              activeSheet.columnMapping.imageAdd)!,
                          )
                        : "",
                    header_index: String(activeSheet.headerIndex + 1),
                    sendToEmail: sendToEmail,
                    isNewDistro: String(isNewDistro),
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
