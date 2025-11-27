import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, ArrowLeft, Check, Loader2, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { IconType } from "react-icons"
import {
  LuCrop,
  LuDatabase,
  LuDollarSign,
  LuEraser,
  LuFileText,
  LuImage,
  LuLayers,
  LuLink,
  LuSearch,
  LuWand2,
} from "react-icons/lu"
import * as XLSX from "xlsx"
import SubmitCropForm from "../components/SubmitCropForm"
import SubmitImageLinkForm from "../components/SubmitImageLinkForm"
import useCustomToast from "../hooks/useCustomToast"
import { cn } from "../lib/utils"
import { showDevUI } from "../utils"

// Shared Constants and Types
type ColumnType = "style" | "brand" | "category" | "colorName" | "msrp"
const SERVER_URL = "https://icon5-8005.iconluxury.today"

const MAX_PREVIEW_ROWS = 20
const MAX_FILE_SIZE_MB = 50

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = Record<
  ColumnType | "readImage" | "imageAdd",
  number | null
>

type SheetConfig = {
  name: string
  originalIndex: number
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
  manualBrandValue: string | null
  isSelected: boolean
}
type ToastFunction = (
  title: string,
  description: string,
  status: "error" | "warning" | "success",
) => void

type FormWithBackProps = {
  onBack?: () => void
  backLabel?: string
}

export type DataWarehouseMode = "imagesAndMsrp" | "imagesOnly" | "msrpOnly"

type DataWarehouseModeConfig = {
  label: string
  description: string
  requiredColumns: ColumnType[]
  optionalColumns: ColumnType[]
  requireImageColumn: boolean
  allowImageColumnMapping: boolean
  icon: IconType
}

export const DATA_WAREHOUSE_MODE_CONFIG: Record<
  DataWarehouseMode,
  DataWarehouseModeConfig
> = {
  imagesAndMsrp: {
    label: "Images + MSRP",
    description: "Pull images and price data.",
    requiredColumns: ["style", "msrp"],
    optionalColumns: ["brand"],
    requireImageColumn: false,
    allowImageColumnMapping: true,
    icon: LuLayers,
  },
  imagesOnly: {
    label: "Images only",
    description: "Pull images.",
    requiredColumns: ["style"],
    optionalColumns: [],
    requireImageColumn: true,
    allowImageColumnMapping: true,
    icon: LuImage,
  },
  msrpOnly: {
    label: "MSRP only",
    description: "Pull msrp data.",
    requiredColumns: ["style", "msrp"],
    optionalColumns: ["brand"],
    requireImageColumn: false,
    allowImageColumnMapping: false,
    icon: LuDollarSign,
  },
}

const formatMappingFieldLabel = (field: ColumnType | "imageColumn") => {
  if (field === "imageColumn") return "image target column"
  if (field === "msrp") return "MSRP"
  if (field === "style") return "style"
  if (field === "brand") return "brand"
  if (field === "category") return "category"
  if (field === "colorName") return "color"
  return field
}

const GOOGLE_IMAGES_REQUIRED_COLUMNS: ColumnType[] = ["style"]
const GOOGLE_IMAGES_OPTIONAL_COLUMNS: ColumnType[] = [
  "brand",
  "category",
  "colorName",
  "msrp",
]
const GOOGLE_IMAGES_ALL_COLUMNS: ColumnType[] = [
  ...GOOGLE_IMAGES_REQUIRED_COLUMNS,
  ...GOOGLE_IMAGES_OPTIONAL_COLUMNS,
]

const MANUAL_BRAND_HEADER = "BRAND (Manual)"

const createEmptyColumnMapping = (): ColumnMapping => ({
  style: null,
  brand: null,
  category: null,
  colorName: null,
  msrp: null,
  readImage: null,
  imageAdd: null,
})

const EMPTY_EXCEL_DATA: ExcelData = { headers: [], rows: [] }
const EMPTY_COLUMN_MAPPING: ColumnMapping = Object.freeze(
  createEmptyColumnMapping(),
)

const cloneColumnMapping = (mapping: ColumnMapping): ColumnMapping => ({
  style: mapping.style,
  brand: mapping.brand,
  category: mapping.category,
  colorName: mapping.colorName,
  msrp: mapping.msrp,
  readImage: mapping.readImage,
  imageAdd: mapping.imageAdd,
})

const withManualBrandValue = (
  sheet: SheetConfig,
  manualBrandValue: string | null,
): SheetConfig => {
  const hasManualColumn =
    sheet.excelData.headers[sheet.excelData.headers.length - 1] ===
    MANUAL_BRAND_HEADER

  if (manualBrandValue?.trim()) {
    const trimmed = manualBrandValue.trim()
    if (hasManualColumn) {
      const updatedRows = sheet.excelData.rows.map((row) => {
        const nextRow = [...row]
        if (nextRow.length < sheet.excelData.headers.length) {
          nextRow.length = sheet.excelData.headers.length
        }
        nextRow[nextRow.length - 1] = trimmed
        return nextRow
      })
      return {
        ...sheet,
        excelData: {
          headers: [...sheet.excelData.headers],
          rows: updatedRows,
        },
        manualBrandValue: trimmed,
      }
    }
    const newHeaders = [...sheet.excelData.headers, MANUAL_BRAND_HEADER]
    const newRows = sheet.excelData.rows.map((row) => [...row, trimmed])
    return {
      ...sheet,
      excelData: { headers: newHeaders, rows: newRows },
      manualBrandValue: trimmed,
    }
  }

  if (!manualBrandValue && hasManualColumn) {
    const newHeaders = sheet.excelData.headers.slice(0, -1)
    const newRows = sheet.excelData.rows.map((row) => row.slice(0, -1))
    const newMapping = cloneColumnMapping(sheet.columnMapping)
    if (newMapping.brand === newHeaders.length) {
      newMapping.brand = null
    }
    return {
      ...sheet,
      excelData: { headers: newHeaders, rows: newRows },
      columnMapping: newMapping,
      manualBrandValue: null,
    }
  }

  return {
    ...sheet,
    manualBrandValue: manualBrandValue ? manualBrandValue.trim() : null,
  }
}

// Shared Helper Functions
const IMAGE_HEADER_PATTERN = /(image|photo|picture|img)/i

const getDisplayValue = (value: any): string => {
  if (value == null) return ""
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === "object") {
    if (value.error) return value.error
    if (value.result !== undefined) return getDisplayValue(value.result)
    if (value.text) return value.text
    if (value.link) return value.text || value.link
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
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
  }
  let bestIndex = 0
  let maxNonEmptyCells = 0
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map((cell) => String(cell ?? "").trim())
      .filter((value) => value !== "") as string[]
    const nonEmptyCount = rowValues.length
    if (nonEmptyCount < 2) continue
    const hasHeaderMatch = rowValues.some((value: string) =>
      Object.values(patterns).some((pattern) => pattern.test(value)),
    )
    if (hasHeaderMatch || nonEmptyCount > maxNonEmptyCells) {
      bestIndex = i
      maxNonEmptyCells = nonEmptyCount
      if (hasHeaderMatch) break
    }
  }
  return bestIndex
}

const getColumnPreview = (
  columnIndex: number | null,
  rows: CellValue[][],
): string => {
  if (columnIndex === null || columnIndex < 0 || columnIndex >= rows[0]?.length)
    return "No values"
  const values = rows
    .map((row) => getDisplayValue(row[columnIndex]))
    .filter((value) => value.trim() !== "")
    .slice(0, 3)
  return values.length > 0 ? values.join(", ") : "No values"
}

const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    style: null,
    brand: null,
    category: null,
    colorName: null,
    msrp: null,
    readImage: null,
    imageAdd: null,
  }
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
    image: /^(image|photo|picture|img|readImage|imageAdd)/i,
  }
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toUpperCase()
    if (!normalizedHeader) return
    if (patterns.style.test(normalizedHeader) && mapping.style === null)
      mapping.style = index
    else if (patterns.brand.test(normalizedHeader) && mapping.brand === null)
      mapping.brand = index
    else if (patterns.msrp.test(normalizedHeader) && mapping.msrp === null)
      mapping.msrp = index
    else if (
      patterns.image.test(normalizedHeader) &&
      mapping.readImage === null &&
      mapping.imageAdd === null
    ) {
      mapping.readImage = index
      mapping.imageAdd = index
    }
  })
  return mapping
}

const getColumnMappingEntries = (
  mapping: ColumnMapping,
): [keyof ColumnMapping, number | null][] =>
  Object.entries(mapping) as [keyof ColumnMapping, number | null][]

const SELECTED_BG_STRONG = "brand.100"
const SELECTED_BG_SUBTLE = "brand.50"
const MAPPED_BG = "neutral.100"
const SELECTED_BORDER_COLOR = "brand.600"

const looksLikeUrl = (value: CellValue | undefined): boolean =>
  typeof value === "string" && /^https?:\/\//i.test(value.trim())

const getFirstNonEmptyValue = (
  rows: CellValue[][],
  columnIndex: number,
): CellValue | undefined => {
  for (const row of rows) {
    const value = row[columnIndex]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value
    }
  }
  return undefined
}

const determineFallbackImageColumnIndex = (
  headers: string[],
  rows: CellValue[][],
): number | null => {
  if (headers.length === 0) return null
  const firstHeader = headers[0]
  if (firstHeader && IMAGE_HEADER_PATTERN.test(firstHeader)) {
    return 0
  }
  if (rows.length === 0) return null
  const sampleValue = getFirstNonEmptyValue(rows, 0)
  if (looksLikeUrl(sampleValue)) {
    return 0
  }
  return null
}

const EMAIL_QUERY_KEYS = ["sendToEmail", "email", "userEmail"]

const getIframeEmailParameter = (): string | null => {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const candidateKeys = new Set(
    EMAIL_QUERY_KEYS.map((key) => key.toLowerCase()),
  )
  for (const [rawKey, rawValue] of params.entries()) {
    if (!candidateKeys.has(rawKey.toLowerCase())) continue
    const value = rawValue.trim()
    if (value) return value
  }
  return null
}

const useIframeEmail = (): string | null => {
  const [iframeEmail, setIframeEmail] = useState<string | null>(() =>
    getIframeEmailParameter(),
  )

  useEffect(() => {
    if (iframeEmail) return
    const email = getIframeEmailParameter()
    if (email) setIframeEmail(email)
  }, [iframeEmail])

  return iframeEmail
}

// Google Images Form Component
export const GoogleImagesForm: React.FC<FormWithBackProps> = ({
  onBack,
  backLabel,
}) => {
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
  const [activeMappingField, setActiveMappingField] =
    useState<ColumnType | null>(null)
  const [manualBrand, setManualBrand] = useState("")
  const [skipDataWarehouse, setSkipDataWarehouse] = useState(false)
  const [isIconDistro, setIsIconDistro] = useState(false)
  const [isAiMode, setIsAiMode] = useState(false)
  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const showToast: ToastFunction = useCustomToast()

  const activeSheet = sheetConfigs[activeSheetIndex] ?? null
  const excelData = activeSheet?.excelData ?? EMPTY_EXCEL_DATA
  const rawData = activeSheet?.rawData ?? []
  const headerIndex = activeSheet?.headerIndex ?? 0
  const columnMapping = activeSheet?.columnMapping ?? EMPTY_COLUMN_MAPPING
  const isManualBrandApplied = Boolean(activeSheet?.manualBrandValue)
  const hasMultipleSheets = sheetConfigs.length > 1

  // Replaced useColorModeValue with Tailwind classes in render

  const sanitizeWorksheet = useCallback((worksheet: XLSX.WorkSheet) => {
    const sanitized: XLSX.WorkSheet = { ...worksheet }

    const sanitizeDimensionEntries = (entries: any[] | undefined) => {
      if (!Array.isArray(entries)) return entries
      return entries.map((entry) => {
        if (!entry || typeof entry !== "object") return entry
        const { level, outlineLevel, ...rest } = entry as Record<string, any>
        return { ...rest }
      })
    }

    const cols = sanitized["!cols"] as any[] | undefined
    const rows = sanitized["!rows"] as any[] | undefined

    if (cols) sanitized["!cols"] = sanitizeDimensionEntries(cols) as any
    if (rows) sanitized["!rows"] = sanitizeDimensionEntries(rows) as any

    return sanitized
  }, [])

  const updateSheetConfig = useCallback(
    (index: number, transform: (sheet: SheetConfig) => SheetConfig) => {
      setSheetConfigs((prev) => {
        if (!prev[index]) return prev
        const next = [...prev]
        const updatedSheet = transform(prev[index])
        next[index] = updatedSheet
        return next
      })
    },
    [],
  )

  const handleToggleSheetSelection = useCallback(
    (index: number) => {
      if (index < 0 || index >= sheetConfigs.length) return
      updateSheetConfig(index, (sheet) => ({
        ...sheet,
        isSelected: !sheet.isSelected,
      }))
    },
    [sheetConfigs.length, updateSheetConfig],
  )

  const handleActiveSheetChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= sheetConfigs.length) return
      setActiveSheetIndex(index)
      setActiveMappingField(null)
      setManualBrand("")
    },
    [sheetConfigs.length],
  )

  const REQUIRED_COLUMNS: ColumnType[] = ["style"]
  const OPTIONAL_COLUMNS: ColumnType[] = [
    "brand",
    "category",
    "colorName",
    "msrp",
  ]
  const ALL_COLUMNS: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

  const selectedSheetCount = useMemo(
    () => sheetConfigs.filter((sheet) => sheet.isSelected).length,
    [sheetConfigs],
  )

  const isEmailValid = useMemo(() => {
    const trimmed = sendToEmail
    if (!trimmed) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }, [sendToEmail])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0]
      if (!selectedFile) {
        showToast("File Error", "No file selected", "error")
        setSheetConfigs([])
        setUploadedFile(null)
        setOriginalWorkbook(null)
        originalFileBufferRef.current = null
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
      setManualBrand("")
      try {
        const data = await selectedFile.arrayBuffer()
        originalFileBufferRef.current = data
        const workbook = XLSX.read(data, {
          type: "array",
          cellStyles: true,
        })
        setOriginalWorkbook(workbook)
        const newSheetConfigs: SheetConfig[] = []
        const headerWarningPattern = {
          style:
            /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
        }

        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          const worksheet = workbook.Sheets[sheetName]
          if (!worksheet) return
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: true,
            defval: "",
          }) as CellValue[][]
          if (jsonData.length === 0) return

          const detectedHeaderIndex = detectHeaderRow(jsonData)
          if (
            detectedHeaderIndex < 0 ||
            detectedHeaderIndex >= jsonData.length
          ) {
            showToast(
              "File Error",
              `Invalid header row detected in sheet "${sheetName}". Please adjust the spreadsheet and re-upload.`,
              "error",
            )
            return
          }

          const headers = (jsonData[detectedHeaderIndex] as any[]).map((cell) =>
            String(cell ?? ""),
          )
          if (
            detectedHeaderIndex === 0 &&
            !headers.some(
              (cell) =>
                headerWarningPattern.style.test(cell) ||
                headerWarningPattern.brand.test(cell),
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
            originalIndex: sheetIndex,
            rawData: jsonData,
            headerIndex: detectedHeaderIndex,
            excelData: { headers, rows },
            columnMapping: autoMapColumns(headers),
            manualBrandValue: null,
            isSelected: true,
          })
        })

        if (newSheetConfigs.length === 0) {
          throw new Error("Excel file is empty")
        }

        setSheetConfigs(newSheetConfigs)
        setActiveSheetIndex(0)
        setStep("preview")
        if (newSheetConfigs.length > 1) {
          showToast(
            "Multiple Sheets Detected",
            `Detected ${newSheetConfigs.length} sheets. Toggle the checkboxes to include only the sheets you need before submitting.`,
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
        setOriginalWorkbook(null)
        originalFileBufferRef.current = null
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
          manualBrandValue: null,
        }
      })
      setManualBrand("")
      setActiveMappingField(null)
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (!activeSheet) return
      if (field && !ALL_COLUMNS.includes(field as ColumnType)) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        let workingSheet = sheet
        if (field === "brand" && sheet.manualBrandValue) {
          workingSheet = withManualBrandValue(sheet, null)
        }
        const newMapping = cloneColumnMapping(workingSheet.columnMapping)
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (
            newMapping[key] === index &&
            key !== "readImage" &&
            key !== "imageAdd"
          ) {
            newMapping[key] = null
          }
        })
        if (field && ALL_COLUMNS.includes(field as ColumnType)) {
          newMapping[field as keyof ColumnMapping] = index
        }
        return {
          ...workingSheet,
          columnMapping: newMapping,
        }
      })
      if (field === "brand") {
        setManualBrand("")
      }
    },
    [ALL_COLUMNS, activeSheet, activeSheetIndex, updateSheetConfig],
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
        const shouldClearManualBrand =
          sheet.manualBrandValue && sheet.columnMapping.brand === index
        const workingSheet = shouldClearManualBrand
          ? withManualBrandValue(sheet, null)
          : sheet
        const workingMapping = cloneColumnMapping(workingSheet.columnMapping)
        ;(Object.keys(workingMapping) as (keyof ColumnMapping)[]).forEach(
          (key) => {
            if (
              workingMapping[key] === index &&
              key !== "readImage" &&
              key !== "imageAdd"
            ) {
              workingMapping[key] = null
            }
          },
        )
        return {
          ...workingSheet,
          columnMapping: workingMapping,
        }
      })
      if (columnMapping.brand !== null && columnMapping.brand === index) {
        setManualBrand("")
      }
    },
    [activeSheet, activeSheetIndex, columnMapping.brand, updateSheetConfig],
  )

  // Image column mappers: allow mapping and clearing readImage/imageAdd explicitly
  const handleImageColumnMap = useCallback(
    (index: number, field: "readImage" | "imageAdd") => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping = cloneColumnMapping(sheet.columnMapping)
        newMapping[field] = index
        return { ...sheet, columnMapping: newMapping }
      })
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleClearImageMapping = useCallback(
    (field: "readImage" | "imageAdd") => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (sheet) => {
        const newMapping = cloneColumnMapping(sheet.columnMapping)
        newMapping[field] = null
        return { ...sheet, columnMapping: newMapping }
      })
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
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
    : "text-gray-400"
  const activeSheetStatusTooltip = activeSheetIsSelected
    ? activeSheetIsReady
      ? "All required columns are mapped."
      : activeSheetMissingColumns.length > 0
        ? `Missing required columns: ${activeSheetMissingColumns.join(", ")}`
        : "Map all required columns before submitting."
    : "Sheet will be skipped during submission."

  const renderSheetButtons = useCallback(
    (size: "xs" | "sm" | "md" = "sm") => (
      <div className="flex flex-wrap gap-2">
        {sheetConfigs.map((sheet, index) => {
          const isActive = index === activeSheetIndex
          const isSelected = sheet.isSelected
          const validation = sheetValidationResults[index]
          const hasMissing = (validation?.missing ?? []).length > 0
          const isComplete = Boolean(validation?.isValid)
          const showWarning = isSelected && hasMissing
          const sheetLabel = sheet.name || `Sheet ${index + 1}`
          const tooltipParts: string[] = [
            isSelected ? "Included in submission" : "Excluded from submission",
          ]
          if (isSelected) {
            tooltipParts.push(
              showWarning
                ? `Missing required: ${(validation?.missing ?? []).join(", ")}`
                : "Mapping ready",
            )
          } else if (hasMissing) {
            tooltipParts.push(
              `Missing required: ${(validation?.missing ?? []).join(", ")}`,
            )
          }
          const tooltipLabel = tooltipParts.join(" • ")
          const StatusIcon = !isSelected ? (
            <X className="h-3 w-3" />
          ) : showWarning ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Check className="h-3 w-3" />
          )

          return (
            <div key={sheet.name || index}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          handleToggleSheetSelection(index)
                        }}
                        aria-label={`${
                          isSelected ? "Exclude" : "Include"
                        } ${sheetLabel}`}
                      />
                      <Button
                        size={
                          size === "xs"
                            ? "sm"
                            : ((size === "md" ? "default" : size) as any)
                        }
                        variant={
                          isActive
                            ? "default"
                            : isSelected
                              ? "ghost"
                              : "outline"
                        }
                        className={cn(
                          "gap-2",
                          isActive ? "font-bold" : "font-semibold",
                          !isSelected && "opacity-70",
                          showWarning &&
                            !isActive &&
                            "bg-yellow-100 hover:bg-yellow-200 text-yellow-800",
                        )}
                        onClick={() => handleActiveSheetChange(index)}
                      >
                        {sheetLabel}
                        {StatusIcon}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        })}
      </div>
    ),
    [
      activeSheetIndex,
      handleActiveSheetChange,
      handleToggleSheetSelection,
      sheetConfigs,
      sheetValidationResults,
    ],
  )

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

        const response = await fetch(`${SERVER_URL}/submitImage`, {
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

  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
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
        <div className="flex flex-row justify-between bg-gray-50 p-2 rounded-md items-center">
          <div className="flex flex-row gap-4">
            {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
              <p
                key={s}
                className={cn(
                  "cursor-pointer",
                  step ===
                    s.toLowerCase().replace("header selection", "preview")
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

        {step === "upload" && (
          <div className="flex flex-col gap-4 items-stretch">
            <p className="text-lg font-bold">
              Upload Excel File for Google Images Scrape
            </p>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="bg-white border-gray-200"
                      aria-label="Upload Excel file"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload an Excel file (.xlsx or .xls) up to 10MB</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4 items-stretch">
            {hasMultipleSheets && (
              <Card className="bg-white border-gray-200">
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
                    {renderSheetButtons("xs")}
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
                              : "border-gray-200",
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
            <div className="flex flex-col gap-4 items-stretch bg-transparent p-4 rounded-md border border-gray-200 w-full md:w-[40%] overflow-y-auto">
              {hasMultipleSheets && (
                <Card className="bg-white border-gray-200 shadow-sm">
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
                      {renderSheetButtons("sm")}
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
                            handleColumnMap(Number(e.target.value), field)
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
              {columnMapping.brand === null && !isManualBrandApplied && (
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
                    <Badge className="mt-2">Manual Brand Column Applied</Badge>
                  )}
                </div>
              )}
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
                            handleColumnMap(Number(e.target.value), field)
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

              {/* Image-specific columns */}
              <p className="font-bold mt-4">Image Columns</p>
              <div className="flex flex-row gap-2 items-center p-2 rounded-md">
                <p className="w-[180px] font-semibold">Image Link Column:</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <select
                        value={
                          columnMapping.readImage !== null
                            ? columnMapping.readImage!
                            : ""
                        }
                        onChange={(e) =>
                          handleImageColumnMap(
                            Number(e.target.value),
                            "readImage",
                          )
                        }
                        className="flex-1 border rounded p-1"
                        aria-label="Map image link column"
                      >
                        <option value="">Unmapped</option>
                        {excelData.headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header || `Column ${indexToColumnLetter(index)}`}
                          </option>
                        ))}
                      </select>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Select the Excel column that contains image URLs (links)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {columnMapping.readImage !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleClearImageMapping("readImage")}
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
                  {getColumnPreview(columnMapping.readImage, excelData.rows)}
                </div>
              </div>
              <div className="flex flex-row gap-2 items-center p-2 rounded-md">
                <p className="w-[180px] font-semibold">
                  Image Anchor / Target Column:
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <select
                        value={
                          columnMapping.imageAdd !== null
                            ? columnMapping.imageAdd!
                            : ""
                        }
                        onChange={(e) =>
                          handleImageColumnMap(
                            Number(e.target.value),
                            "imageAdd",
                          )
                        }
                        className="flex-1 border rounded p-1"
                        aria-label="Map image anchor/target column"
                      >
                        <option value="">Unmapped</option>
                        {excelData.headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header || `Column ${indexToColumnLetter(index)}`}
                          </option>
                        ))}
                      </select>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Select the Excel column indicating image anchor text or
                        target
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {columnMapping.imageAdd !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleClearImageMapping("imageAdd")}
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
                  {getColumnPreview(columnMapping.imageAdd, excelData.rows)}
                </div>
              </div>
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
                              ? "bg-primary/20 border-2 border-primary"
                              : isMapped
                                ? "bg-green-100"
                                : "bg-gray-100",
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
                          const isMissingRequired = REQUIRED_COLUMNS.some(
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
              </Table>
            </div>
          </div>
        )}
        {step === "submit" && (
          <div className="flex flex-col gap-4 items-stretch">
            <div className="flex flex-col items-start gap-4">
              {hasMultipleSheets && (
                <div>
                  <p className="font-semibold">
                    Sheets to submit ({selectedSheetCount}/{sheetConfigs.length}
                    )
                  </p>
                  {selectedSheetCount > 0 ? (
                    <ul className="mt-1 pl-4 list-disc">
                      {sheetConfigs
                        .map((sheet, index) => ({ sheet, index }))
                        .filter(({ sheet }) => sheet.isSelected)
                        .map(({ sheet, index }) => (
                          <li key={sheet.name || index}>
                            {sheet.name || `Sheet ${index + 1}`}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-red-500 mt-1">
                      Select at least one sheet before submitting.
                    </p>
                  )}
                </div>
              )}
              <p>Rows: {excelData.rows.length}</p>
              <div className="flex flex-col gap-2">
                <Label>User:</Label>
                {sendToEmail ? (
                  <p className="font-medium">{sendToEmail}</p>
                ) : (
                  <p className="text-sm text-red-500">
                    No email parameter detected. Add
                    ?sendToEmail=example@domain.com (or email/userEmail) to the
                    iframe URL.
                  </p>
                )}
                {!isEmailValid && sendToEmail && (
                  <p className="text-sm text-red-500 mt-1">
                    The email supplied the URL looks invalid. Update the iframe
                    query parameter before submitting.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isIconDistro"
                    checked={isIconDistro}
                    onCheckedChange={(checked) =>
                      setIsIconDistro(checked as boolean)
                    }
                  />
                  <Label htmlFor="isIconDistro">Output as New Distro</Label>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  If not selected, results will be populated into the uploaded
                  file.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDataWarehouse"
                    checked={skipDataWarehouse}
                    onCheckedChange={(checked) =>
                      setSkipDataWarehouse(checked as boolean)
                    }
                  />
                  <Label htmlFor="skipDataWarehouse">
                    Skip Data Warehouse Processing
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  If selected, data will not be processed for the data
                  warehouse.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAiMode"
                    checked={isAiMode}
                    disabled
                    onCheckedChange={(checked) =>
                      setIsAiMode(checked as boolean)
                    }
                  />
                  <Label htmlFor="isAiMode" className="text-muted-foreground">
                    AI Mode
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  AI Mode is currently locked and will submit as disabled.
                </p>
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
                  {getColumnMappingEntries(columnMapping)
                    .filter(([_, index]) => index !== null)
                    .map(([col, index]) => (
                      <TableRow key={col}>
                        <TableCell>
                          {col === "readImage"
                            ? "Image Link"
                            : col === "imageAdd"
                              ? "Image Anchor / Target"
                              : col}
                        </TableCell>
                        <TableCell>
                          {excelData.headers[index!] ||
                            `Column ${indexToColumnLetter(index!)}`}
                        </TableCell>
                        <TableCell>
                          {getColumnPreview(index, excelData.rows)}
                        </TableCell>
                      </TableRow>
                    ))}
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
          </div>
        )}
      </div>
    </div>
  )
}
// Data Warehouse Form Component
type DataWarehouseFormProps = FormWithBackProps & {
  mode: DataWarehouseMode
}

type DataWarehouseMappingField = ColumnType | "imageColumn"

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
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    rows: [],
  })
  const [rawData, setRawData] = useState<CellValue[][]>([])
  const [headerIndex, setHeaderIndex] = useState<number>(1)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    brand: null,
    category: null,
    colorName: null,
    msrp: null,
    readImage: null,
    imageAdd: null,
  })
  const [activeMappingField, setActiveMappingField] =
    useState<DataWarehouseMappingField | null>(null)
  const [manualBrand, setManualBrand] = useState("")
  const [isManualBrandApplied, setIsManualBrandApplied] = useState(false)
  const [isNewDistro, setIsNewDistro] = useState(false)
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD")
  const iframeEmail = useIframeEmail()
  const emailRecipient = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const dataHeadersAreValid = useMemo(
    () => excelData.headers.some((header) => String(header).trim() !== ""),
    [excelData.headers],
  )
  const showToast: ToastFunction = useCustomToast()
  const isEmailValid = useMemo(() => {
    if (!emailRecipient) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)
  }, [emailRecipient])

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

      setFile(selectedFile)
      setIsLoading(true)
      try {
        const data = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!worksheet) throw new Error("No worksheet found")
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: true,
          defval: "",
        })
        if (jsonData.length === 0) throw new Error("Excel file is empty")

        const detectedHeaderIndex = detectHeaderRow(jsonData as CellValue[][])
        const patterns = {
          style:
            /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
        }
        const firstRow: string[] = (jsonData[0] as any[]).map((cell) =>
          String(cell ?? "").trim(),
        )
        if (
          detectedHeaderIndex === 0 &&
          !firstRow.some(
            (cell) => patterns.style.test(cell) || patterns.msrp.test(cell),
          )
        ) {
          showToast(
            "Warning",
            "No clear header row detected; using first row. Please verify in the Header Selection step.",
            "warning",
          )
        }
        setRawData(jsonData as CellValue[][])
        if (jsonData.length <= detectedHeaderIndex || detectedHeaderIndex < 0) {
          showToast(
            "File Error",
            "Invalid header row detected. Please select a header row in the Header Selection step.",
            "error",
          )
          setHeaderIndex(0)
          setExcelData({ headers: [], rows: [] })
          setFile(null)
          setStep("upload")
          return
        }
        setHeaderIndex(detectedHeaderIndex)
        const headers = (jsonData[detectedHeaderIndex] as any[]).map((cell) =>
          String(cell ?? ""),
        )
        const rows = jsonData.slice(detectedHeaderIndex + 1) as CellValue[][]
        setExcelData({ headers, rows })
        setColumnMapping(autoMapColumns(headers))
        setStep("preview")
      } catch (error) {
        showToast(
          "File Processing Error",
          error instanceof Error ? error.message : "Unknown error",
          "error",
        )
        setFile(null)
      } finally {
        setIsLoading(false)
      }
    },
    [showToast],
  )

  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (newHeaderIndex < 0 || newHeaderIndex >= rawData.length) return
      setHeaderIndex(newHeaderIndex)
      const headers = rawData[newHeaderIndex].map((cell) => String(cell ?? ""))
      const rows = rawData.slice(newHeaderIndex + 1) as CellValue[][]
      setExcelData({ headers, rows })
      setColumnMapping(autoMapColumns(headers))
      setIsManualBrandApplied(false)
      setManualBrand("")
      setActiveMappingField(null)
    },
    [rawData],
  )

  const handleDataColumnMap = useCallback(
    (index: number, field: ColumnType) => {
      if (field && !ALL_COLUMNS.includes(field)) return
      setColumnMapping((prev) => {
        const newMapping = { ...prev }
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
        return newMapping
      })
    },
    [ALL_COLUMNS],
  )

  const handleImageColumnMap = useCallback(
    (index: number | null) => {
      setColumnMapping((prev) => ({
        ...prev,
        imageAdd: index,
        ...(enableImageTargetMapping ? {} : { readImage: index }),
      }))
    },
    [enableImageTargetMapping],
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

  const handleClearMapping = useCallback((index: number) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev }
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
      return newMapping
    })
  }, [])

  const handleClearImageMapping = useCallback(() => {
    handleImageColumnMap(null)
  }, [handleImageColumnMap])

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
    if (!allowImageColumnMapping) return null
    if (enableImageTargetMapping) return columnMapping.imageAdd
    return columnMapping.readImage ?? columnMapping.imageAdd
  }, [
    allowImageColumnMapping,
    columnMapping.imageAdd,
    columnMapping.readImage,
    enableImageTargetMapping,
  ])

  const selectedColumnIndex = useMemo(() => {
    if (!activeMappingField) return null
    if (activeMappingField === "imageColumn") {
      return imageColumnIndex
    }
    return columnMapping[activeMappingField]
  }, [activeMappingField, columnMapping, imageColumnIndex])

  const applyManualBrand = useCallback(() => {
    if (!manualBrand.trim()) {
      showToast(
        "Manual Brand Error",
        "Please enter a non-empty brand name",
        "warning",
      )
      return
    }
    setColumnMapping((prev) => ({ ...prev, brand: null }))
    setExcelData((prev) => {
      const newHeaders = [...prev.headers, "BRAND (Manual)"]
      setColumnMapping((prevMapping) => ({
        ...prevMapping,
        brand: newHeaders.length - 1,
      }))
      setIsManualBrandApplied(true)
      return {
        headers: newHeaders,
        rows: prev.rows.map((row) => [...row, manualBrand.trim()]),
      }
    })
    showToast(
      "Success",
      `Manual brand "${manualBrand.trim()}" applied`,
      "success",
    )
    setManualBrand("")
    setActiveMappingField(null)
  }, [manualBrand, showToast])

  const removeManualBrand = useCallback(() => {
    setExcelData((prev) => ({
      headers: prev.headers.filter((header) => header !== "BRAND (Manual)"),
      rows: prev.rows.map((row) => row.slice(0, -1)),
    }))
    setColumnMapping((prev) => ({ ...prev, brand: null }))
    setIsManualBrandApplied(false)
    showToast("Success", "Manual brand removed", "success")
    setActiveMappingField(null)
  }, [showToast])

  const validateForm = useMemo(() => {
    const missing: (ColumnType | "imageColumn")[] = REQUIRED_COLUMNS.filter(
      (col) => columnMapping[col] === null,
    )
    if (requireImageColumn && imageColumnIndex === null) {
      missing.push("imageColumn")
    }
    const isValid =
      missing.length === 0 &&
      Boolean(file) &&
      excelData.rows.length > 0 &&
      dataHeadersAreValid

    return {
      isValid,
      missing,
    }
  }, [
    REQUIRED_COLUMNS,
    columnMapping,
    dataHeadersAreValid,
    excelData.rows.length,
    file,
    imageColumnIndex,
    mode,
    requireImageColumn,
  ])

  const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast(
        "Validation Error",
        `Missing required columns: ${validateForm.missing
          .map((field) => formatMappingFieldLabel(field))
          .join(", ")}`,
        "warning",
      )
      return
    }
    if (!dataHeadersAreValid) {
      showToast(
        "Header Error",
        "Selected header row has no values. Please choose a different header row.",
        "warning",
      )
      return
    }
    if (!emailRecipient) {
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
    const formData = new FormData()

    formData.append("fileUploadImage", file!)
    if (columnMapping.style !== null) {
      formData.append(
        "searchColImage",
        indexToColumnLetter(columnMapping.style),
      )
    } else {
      formData.append("searchColImage", "")
    }
    if (columnMapping.msrp !== null) {
      formData.append("msrpColImage", indexToColumnLetter(columnMapping.msrp))
    } else {
      formData.append("msrpColImage", "")
    }

    if (isManualBrandApplied) {
      formData.append("brandColImage", "MANUAL")
      const manualBrandValue =
        (excelData.rows[0]?.[excelData.headers.length - 1] as string) || ""
      formData.append("manualBrand", manualBrandValue)
    } else if (columnMapping.brand !== null) {
      formData.append("brandColImage", indexToColumnLetter(columnMapping.brand))
    }

    const fallbackImageColumnIndex =
      allowImageColumnMapping && !enableImageTargetMapping
        ? determineFallbackImageColumnIndex(excelData.headers, excelData.rows)
        : null
    const imageColumnIndexForSubmit = enableImageTargetMapping
      ? columnMapping.imageAdd
      : allowImageColumnMapping
        ? columnMapping.readImage ??
          columnMapping.imageAdd ??
          fallbackImageColumnIndex
        : null

    formData.append(
      "imageColumnImage",
      imageColumnIndexForSubmit !== null
        ? indexToColumnLetter(imageColumnIndexForSubmit)
        : "",
    )
    if (columnMapping.colorName !== null) {
      formData.append(
        "ColorColImage",
        indexToColumnLetter(columnMapping.colorName),
      )
    }
    if (columnMapping.category !== null) {
      formData.append(
        "CategoryColImage",
        indexToColumnLetter(columnMapping.category),
      )
    }
    formData.append("header_index", String(headerIndex + 1))
    formData.append("sendToEmail", emailRecipient)
    formData.append("isNewDistro", String(isNewDistro))
    if (mode !== "imagesOnly") {
      formData.append("currency", currency)
    }
    formData.append("dataWarehouseMode", mode)
    formData.append("isImagesOnly", String(mode === "imagesOnly"))
    formData.append("isMsrpOnly", String(mode === "msrpOnly"))

    try {
      const response = await fetch(`${SERVER_URL}/datawarehouse`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Server Response:", response.status, errorText)
        throw new Error(`Server error: ${errorText || response.statusText}`)
      }

      showToast("Success", "Form submitted successfully", "success")
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      console.error("Fetch Error:", error)
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
    validateForm,
    file,
    columnMapping,
    allowImageColumnMapping,
    enableImageTargetMapping,
    isManualBrandApplied,
    headerIndex,
    isNewDistro,
    currency,
    emailRecipient,
    isEmailValid,
    mode,
    showToast,
    excelData,
    dataHeadersAreValid,
  ])

  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
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
        <div className="flex flex-row justify-between bg-gray-50 p-2 rounded-md items-center">
          <div className="flex flex-row gap-4">
            {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
              <p
                key={s}
                className={cn(
                  "cursor-pointer",
                  step ===
                    s.toLowerCase().replace("header selection", "preview")
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
                    !emailRecipient ||
                    !isEmailValid
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

        {step === "upload" && (
          <div className="flex flex-col gap-4 items-stretch">
            <p className="text-lg font-bold">
              Upload Excel File · {modeConfig.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {modeConfig.description}
            </p>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="bg-white border-gray-200"
                      aria-label="Upload Excel file"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload an Excel file (.xlsx or .xls) up to 10MB</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4 items-stretch">
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
                              : "border-gray-200",
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
            <div className="flex flex-col gap-4 items-stretch bg-gray-50 p-4 rounded-md w-full md:w-[40%] overflow-y-auto">
              {!validateForm.isValid && (
                <p className="text-red-500 text-sm font-medium">
                  Missing required columns:{" "}
                  {validateForm.missing
                    .map((field) => formatMappingFieldLabel(field))
                    .join(", ")}
                  . Please map all required columns.
                </p>
              )}
              {!dataHeadersAreValid && (
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
                              ? "bg-primary/20 border-2 border-primary"
                              : isMapped
                                ? "bg-green-100"
                                : "bg-gray-100",
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
              </Table>
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
          </div>
        )}
      </div>
    </div>
  )
}

const ImageLinksToPicturesForm: React.FC<FormWithBackProps> = ({
  onBack,
  backLabel,
}) => {
  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
      <div className="flex flex-col gap-6 items-stretch">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel ?? "Back to tools"}
          </Button>
        )}
        <SubmitImageLinkForm />
      </div>
    </div>
  )
}

const ImageCropToolForm: React.FC<FormWithBackProps> = ({
  onBack,
  backLabel,
}) => {
  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
      <div className="flex flex-col gap-6 items-stretch">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel ?? "Back to tools"}
          </Button>
        )}
        <SubmitCropForm />
      </div>
    </div>
  )
}

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
  const [selectedType, setSelectedType] = useState<
    "images" | "data" | "imageLinks" | "crop" | null
  >(null)
  const [dataWarehouseMode, setDataWarehouseMode] =
    useState<DataWarehouseMode | null>(null)

  const handleBackToTools = useCallback(() => {
    setSelectedType(null)
    setDataWarehouseMode(null)
  }, [])

  if (selectedType === "images") {
    return <GoogleImagesForm onBack={handleBackToTools} />
  }

  if (selectedType === "data") {
    if (dataWarehouseMode) {
      return (
        <DataWarehouseForm
          mode={dataWarehouseMode}
          onBack={() => setDataWarehouseMode(null)}
          backLabel="Back to Data Warehouse options"
        />
      )
    }

    return (
      <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
        <div className="flex flex-col gap-6 items-stretch">
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={handleBackToTools}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tools
          </Button>
          <div className="flex flex-col items-start gap-1">
            <p className="text-lg font-bold">Choose a Data Warehouse job</p>
            <p className="text-sm text-muted-foreground">
              Pick the workflow you need for this upload.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              Object.entries(DATA_WAREHOUSE_MODE_CONFIG) as [
                DataWarehouseMode,
                DataWarehouseModeConfig,
              ][]
            ).map(([modeKey, config]) => (
              <Card
                key={modeKey}
                className={cn(
                  "cursor-pointer hover:shadow-md hover:border-primary/50 transition-all",
                  modeKey === "imagesAndMsrp"
                    ? "border-2 border-primary/20"
                    : "border",
                )}
                onClick={() => setDataWarehouseMode(modeKey)}
              >
                <CardHeader>
                  <div className="flex flex-row items-center gap-2">
                    <config.icon className="h-6 w-6 text-gray-600" />
                    <CardTitle className="text-xl font-semibold">
                      {config.label}
                    </CardTitle>
                    {modeKey === "imagesAndMsrp" && (
                      <Badge variant="default" className="ml-auto">
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{config.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (selectedType === "imageLinks") {
    return <ImageLinksToPicturesForm onBack={handleBackToTools} />
  }

  if (selectedType === "crop") {
    return <ImageCropToolForm onBack={handleBackToTools} />
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 bg-background text-foreground">
      <div className="flex flex-col gap-6 items-stretch">
        {/* Mine Data */}
        <p className="text-lg font-bold">Mine Data</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className="cursor-pointer hover:shadow-md transition-all"
            onClick={() => setSelectedType("images")}
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuSearch
                  className="h-6 w-6 text-gray-600"
                  strokeWidth={1.75}
                />
                <CardTitle className="text-xl font-semibold">
                  Google Images
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>Search and collect images from Google.</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-all"
            onClick={() => {
              setDataWarehouseMode(null)
              setSelectedType("data")
            }}
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuDatabase
                  className="h-6 w-6 text-gray-600"
                  strokeWidth={1.75}
                />
                <CardTitle className="text-xl font-semibold">
                  Data Warehouse
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>Internal product database jobs (choose a mode).</p>
            </CardContent>
          </Card>
          {/* Reverse Image Search (Locked) */}
          <Card
            className="cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500"
            aria-disabled
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuSearch className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
                <CardTitle className="text-xl font-semibold">
                  Reverse Image Search
                </CardTitle>
                {showDevUI() && (
                  <Badge variant="destructive" className="ml-auto">
                    DEV
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p>
                Image search using a reference photo and reverse image search.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transform Excel */}
        <p className="text-lg font-bold mt-2">Transform Excel</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all",
              showDevUI() && "bg-red-50 border-red-200",
            )}
            onClick={() => setSelectedType("imageLinks")}
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuLink className="h-6 w-6 text-gray-600" strokeWidth={1.75} />
                <CardTitle className="text-xl font-semibold">
                  Image URL Download
                </CardTitle>
                {showDevUI() && (
                  <Badge variant="destructive" className="ml-auto">
                    DEV
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p>Convert image links to excel pictures.</p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all",
              showDevUI() && "bg-red-50 border-red-200",
            )}
            onClick={() => setSelectedType("crop")}
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuCrop className="h-6 w-6 text-gray-600" strokeWidth={1.75} />
                <CardTitle className="text-xl font-semibold">
                  Image crop
                </CardTitle>
                {showDevUI() && (
                  <Badge variant="destructive" className="ml-auto">
                    DEV
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p>Remove whitespace from Excel pictures.</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500"
            aria-disabled
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuFileText
                  className="h-6 w-6 text-gray-400"
                  strokeWidth={1.5}
                />
                <CardTitle className="text-xl font-semibold">
                  PDF → Excel
                </CardTitle>
                {showDevUI() && (
                  <Badge variant="destructive" className="ml-auto">
                    DEV
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p>
                Convert PDFs (catalogs, invoices, spec sheets) into structured
                Excel/CSV data.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhance Images (Gen AI) - coming soon */}
        <p className="text-lg font-bold mt-2">Enhance Images (Gen AI)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500"
            aria-disabled
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuEraser className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
                <CardTitle className="text-xl font-semibold">
                  Background remover
                </CardTitle>
                {showDevUI() && (
                  <Badge variant="destructive" className="ml-auto">
                    DEV
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p>Remove image backgrounds. (Nano Banana)</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500"
            aria-disabled
          >
            <CardHeader>
              <div className="flex flex-row items-center gap-2">
                <LuWand2 className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
                <CardTitle className="text-xl font-semibold">
                  Image generator
                </CardTitle>
                {showDevUI() && (
                  <Badge variant="destructive" className="ml-auto">
                    DEV
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start gap-1">
                <p>
                  Generate studio-style product photos from reference shots.
                  (Nano Banana)
                </p>
                <p className="font-semibold">Convert:</p>
                <p className="m-0 p-0 pl-0 whitespace-nowrap">
                  <span className="mx-2">•</span>
                  Lifestyle shots <span className="mx-2">•</span> Mockups/CAD
                  <span className="mx-2">•</span> Low‑quality product photos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Export
// export const Route = createFileRoute("/google-serp-cms")({
//   component: () => <CMSGoogleSerpForm />,
// })

export default CMSGoogleSerpForm
