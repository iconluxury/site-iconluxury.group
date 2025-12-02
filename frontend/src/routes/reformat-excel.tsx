import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertTriangle,
  Check,
  CheckIcon,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FaWarehouse } from "react-icons/fa"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"
import { useIframeEmail } from "../hooks/useIframeEmail"

// Shared Constants and Types
type ColumnType =
  | "style"
  | "brand"
  | "category"
  | "color"
  | "msrp"
  | "gender"
  | "size"
  | "qty"
  | "price"
const SERVER_URL = "https://icon5-8005.iconluxury.today"

const MAX_PREVIEW_ROWS = 20
const MAX_FILE_SIZE_MB = 200

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = Record<
  ColumnType | "readImage" | "imageAdd",
  number | null
>

type SheetConfig = {
  name: string
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
  manualValues: Partial<Record<"brand" | "gender" | "category", string>>
}
type ToastFunction = (
  title: string,
  description: string,
  status: "error" | "warning" | "success",
) => void

const GOOGLE_IMAGES_REQUIRED_COLUMNS: ColumnType[] = ["style"]
const GOOGLE_IMAGES_OPTIONAL_COLUMNS: ColumnType[] = [
  "brand",
  "category",
  "color",
  "msrp",
  "gender",
  "size",
  "qty",
  "price",
]
const GOOGLE_IMAGES_ALL_COLUMNS: ColumnType[] = [
  ...GOOGLE_IMAGES_REQUIRED_COLUMNS,
  ...GOOGLE_IMAGES_OPTIONAL_COLUMNS,
]

const DATA_WAREHOUSE_REQUIRED_COLUMNS: ColumnType[] = ["style", "msrp"]
const DATA_WAREHOUSE_OPTIONAL_COLUMNS: ColumnType[] = ["brand"]
const DATA_WAREHOUSE_ALL_COLUMNS: ColumnType[] = [
  ...DATA_WAREHOUSE_REQUIRED_COLUMNS,
  ...DATA_WAREHOUSE_OPTIONAL_COLUMNS,
]

const MANUAL_BRAND_HEADER = "BRAND (Manual)"

const createEmptyColumnMapping = (): ColumnMapping => ({
  style: null,
  brand: null,
  category: null,
  color: null,
  msrp: null,
  gender: null,
  size: null,
  qty: null,
  price: null,
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
  color: mapping.color,
  msrp: mapping.msrp,
  gender: mapping.gender,
  size: mapping.size,
  qty: mapping.qty,
  price: mapping.price,
  readImage: mapping.readImage,
  imageAdd: mapping.imageAdd,
})

const getManualHeaderName = (field: "brand" | "gender" | "category") =>
  `${field.toUpperCase()} (Manual)`

const withManualValue = (
  sheet: SheetConfig,
  field: "brand" | "gender" | "category",
  value: string | null,
): SheetConfig => {
  const manualHeader = getManualHeaderName(field)
  const headerIndex = sheet.excelData.headers.findIndex(
    (h) => h === manualHeader,
  )
  const hasManualColumn = headerIndex !== -1

  if (value?.trim()) {
    const trimmed = value.trim()
    const newHeaders = [...sheet.excelData.headers]
    const newRows = sheet.excelData.rows.map((r) => [...r])

    if (hasManualColumn) {
      newRows.forEach((row) => {
        row[headerIndex] = trimmed
      })
    } else {
      newHeaders.push(manualHeader)
      newRows.forEach((row) => row.push(trimmed))
    }

    const newManualValues = { ...sheet.manualValues, [field]: trimmed }
    const newMapping = {
      ...sheet.columnMapping,
      [field]: hasManualColumn ? headerIndex : newHeaders.length - 1,
    }

    return {
      ...sheet,
      excelData: { headers: newHeaders, rows: newRows },
      manualValues: newManualValues,
      columnMapping: newMapping,
    }
  }

  if (!value && hasManualColumn) {
    const newHeaders = sheet.excelData.headers.filter(
      (_, i) => i !== headerIndex,
    )
    const newRows = sheet.excelData.rows.map((row) =>
      row.filter((_, i) => i !== headerIndex),
    )
    const newManualValues = { ...sheet.manualValues }
    delete newManualValues[field]
    const newMapping = cloneColumnMapping(sheet.columnMapping)
    if (newMapping[field] === headerIndex) {
      newMapping[field] = null
    }

    return {
      ...sheet,
      excelData: { headers: newHeaders, rows: newRows },
      columnMapping: newMapping,
      manualValues: newManualValues,
    }
  }

  return sheet
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

const MappedColumnSummary: React.FC<{
  sheetConfig: SheetConfig
  ALL_COLUMNS: (ColumnType | "readImage")[]
}> = ({ sheetConfig, ALL_COLUMNS }) => {
  const mappedColumns = ALL_COLUMNS.filter(
    (type) =>
      sheetConfig.columnMapping[type] !== null &&
      sheetConfig.columnMapping[type] !== undefined,
  )

  if (mappedColumns.length === 0) {
    return <p className="text-sm text-muted-foreground">No columns mapped.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {mappedColumns.map((type) => (
        <div key={type}>
          <Badge variant="secondary">
            {type === "readImage" ? "PICTURE" : type.toUpperCase()}
          </Badge>
        </div>
      ))}
    </div>
  )
}

const SubmitStep: React.FC<{
  sheetConfigs: SheetConfig[]
  onSubmit: (sheetIndex: number) => void
  onBack: () => void
  sendToEmail: string
  isEmailValid: boolean
  submittingSheetIndex: number | null
  ALL_COLUMNS: (ColumnType | "readImage")[]
  currency: "USD" | "EUR"
  onCurrencyChange: (value: "USD" | "EUR") => void
  sheetValidationResults: {
    sheetIndex: number
    missing: ColumnType[]
    isValid: boolean
  }[]
}> = ({
  sheetConfigs,
  onSubmit,
  onBack,
  sendToEmail,
  isEmailValid,
  submittingSheetIndex,
  ALL_COLUMNS,
  currency,
  onCurrencyChange,
  sheetValidationResults,
}) => {
  return (
    <div className="container mx-auto py-5">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Confirm and Submit</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Review the mapped columns for each sheet. The processed file will
              be sent to <strong>{sendToEmail}</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <Label className="font-semibold">Select Currency</Label>
              <RadioGroup
                onValueChange={onCurrencyChange}
                value={currency}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="USD" id="r1" />
                  <Label htmlFor="r1">USD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EUR" id="r2" />
                  <Label htmlFor="r2">EUR</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sheet Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mapped Columns</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheetConfigs.map((sheet, index) => {
                    const validation = sheetValidationResults[index]
                    const isReady = validation?.isValid ?? false
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {sheet.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isReady ? "default" : "destructive"}
                            className={cn(
                              "flex w-fit items-center gap-1",
                              isReady
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-yellow-500 hover:bg-yellow-600",
                            )}
                          >
                            {isReady ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <span>
                              {isReady
                                ? "Ready"
                                : `Missing: ${validation?.missing.join(", ")}`}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <MappedColumnSummary
                            sheetConfig={sheet}
                            ALL_COLUMNS={ALL_COLUMNS}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => onSubmit(index)}
                            disabled={
                              !isReady ||
                              !isEmailValid ||
                              submittingSheetIndex !== null
                            }
                          >
                            {submittingSheetIndex === index && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-4">
          <Button
            onClick={onBack}
            disabled={submittingSheetIndex !== null}
            variant="outline"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  )
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
    color: null,
    msrp: null,
    gender: null,
    size: null,
    qty: null,
    price: null,
    readImage: null,
    imageAdd: null,
  }
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
    image: /^(image|photo|picture|img|readImage|imageAdd)/i,
    gender: /^(gender|sex)/i,
    size: /^(size)/i,
    qty: /^(qty|quantity)/i,
    price: /^(price|cost)/i,
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
    else if (patterns.gender.test(normalizedHeader) && mapping.gender === null)
      mapping.gender = index
    else if (patterns.size.test(normalizedHeader) && mapping.size === null)
      mapping.size = index
    else if (patterns.qty.test(normalizedHeader) && mapping.qty === null)
      mapping.qty = index
    else if (patterns.price.test(normalizedHeader) && mapping.price === null)
      mapping.price = index
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

// Google Images Form Component
const ReformatExcelForm: React.FC = () => {
  const [step, setStep] = useState<"upload" | "preview" | "map" | "submit">(
    "upload",
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [activeMappingField, setActiveMappingField] =
    useState<ColumnType | null>(null)
  const [manualInputs, setManualInputs] = useState<
    Partial<Record<"brand" | "gender" | "category", string>>
  >({})
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD")
  const [submittingSheetIndex, setSubmittingSheetIndex] = useState<
    number | null
  >(null)
  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const showToast: ToastFunction = useCustomToast()

  const activeSheet = sheetConfigs[activeSheetIndex] ?? null
  const excelData = activeSheet?.excelData ?? EMPTY_EXCEL_DATA
  const rawData = activeSheet?.rawData ?? []
  const headerIndex = activeSheet?.headerIndex ?? 0
  const columnMapping = activeSheet?.columnMapping ?? EMPTY_COLUMN_MAPPING
  const manualValues = activeSheet?.manualValues ?? {}
  const isManualBrandApplied = Boolean(manualValues.brand)
  const hasMultipleSheets = sheetConfigs.length > 1

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

  const handleActiveSheetChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= sheetConfigs.length) return
      setActiveSheetIndex(index)
      setActiveMappingField(null)
      setManualInputs({})
    },
    [sheetConfigs.length],
  )

  const REQUIRED_COLUMNS: ColumnType[] = ["style"]
  const OPTIONAL_COLUMNS: ColumnType[] = [
    "brand",
    "category",
    "color",
    "msrp",
    "gender",
    "size",
    "qty",
    "price",
  ]
  const DISPLAY_ORDER: (ColumnType | "readImage")[] = [
    "readImage",
    "brand",
    "gender",
    "style",
    "color",
    "category",
    "size",
    "qty",
    "price",
    "msrp",
  ]
  const ALL_COLUMNS: ColumnType[] = [
    "style",
    "brand",
    "gender",
    "color",
    "category",
    "size",
    "qty",
    "price",
    "msrp",
  ]

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
      setManualInputs({})
      try {
        const data = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(data, { type: "array" })
        const newSheetConfigs: SheetConfig[] = []
        const headerWarningPattern = {
          style:
            /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
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
            rawData: jsonData,
            headerIndex: detectedHeaderIndex,
            excelData: { headers, rows },
            columnMapping: autoMapColumns(headers),
            manualValues: {},
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
          manualValues: {},
        }
      })
      setManualInputs({})
      setActiveMappingField(null)
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (!activeSheet) return
      const isKnownField =
        ALL_COLUMNS.includes(field as ColumnType) || field === "readImage"
      if (field && !isKnownField) return

      updateSheetConfig(activeSheetIndex, (sheet) => {
        let workingSheet = sheet
        if (
          (field === "brand" || field === "gender" || field === "category") &&
          sheet.manualValues[field]
        ) {
          workingSheet = withManualValue(sheet, field, null)
        }
        const newMapping = cloneColumnMapping(workingSheet.columnMapping)

        // Unmap any other field that is currently mapped to this index
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (newMapping[key] === index) {
            newMapping[key] = null
          }
        })

        // Set the new mapping
        if (field) {
          newMapping[field as keyof ColumnMapping] = index
          if (field === "readImage") {
            newMapping.imageAdd = index
          }
        }

        return {
          ...workingSheet,
          columnMapping: newMapping,
        }
      })

      if (field === "brand") {
        setManualInputs((prev) => ({ ...prev, brand: "" }))
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
          sheet.manualValues.brand && sheet.columnMapping.brand === index
        const workingSheet = shouldClearManualBrand
          ? withManualValue(sheet, "brand", null)
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
        setManualInputs((prev) => ({ ...prev, brand: "" }))
      }
    },
    [activeSheet, activeSheetIndex, columnMapping.brand, updateSheetConfig],
  )

  const mappedDataColumns = useMemo(() => {
    const keys: (ColumnType | "readImage")[] = [...DISPLAY_ORDER]
    return new Set(
      keys
        .map((key) => columnMapping[key as keyof ColumnMapping])
        .filter((value): value is number => typeof value === "number"),
    )
  }, [columnMapping, DISPLAY_ORDER])

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

  const applyManualValue = useCallback(
    (field: "brand" | "gender" | "category") => {
      const trimmed = manualInputs[field]?.trim()
      if (!trimmed) {
        showToast(
          `Manual ${field} Error`,
          `Please enter a non-empty ${field} name`,
          "warning",
        )
        return
      }
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (sheet) =>
        withManualValue(sheet, field, trimmed),
      )
      showToast("Success", `Manual ${field} "${trimmed}" applied`, "success")
      setManualInputs((prev) => ({ ...prev, [field]: "" }))
      setActiveMappingField(null)
    },
    [activeSheet, activeSheetIndex, manualInputs, showToast, updateSheetConfig],
  )

  const removeManualValue = useCallback(
    (field: "brand" | "gender" | "category") => {
      if (!activeSheet?.manualValues[field]) return
      updateSheetConfig(activeSheetIndex, (sheet) =>
        withManualValue(sheet, field, null),
      )
      showToast("Success", `Manual ${field} removed`, "success")
      setManualInputs((prev) => ({ ...prev, [field]: "" }))
      setActiveMappingField(null)
    },
    [activeSheet, activeSheetIndex, showToast, updateSheetConfig],
  )

  const validateForm = useMemo(() => {
    if (!activeSheet) {
      return {
        isValid: false,
        missing: REQUIRED_COLUMNS,
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
            <Check className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )
          const sheetLabel = sheet.name || `Sheet ${index + 1}`
          const tooltipLabel = isComplete
            ? "Mapping ready"
            : hasMissing
              ? `Missing: ${(validation?.missing ?? []).join(", ")}`
              : "Map required columns"
          return (
            <div key={sheet.name || index}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size={
                        size === "xs" ? "sm" : size === "md" ? "default" : size
                      }
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "gap-2",
                        isActive
                          ? ""
                          : isComplete
                            ? "text-muted-foreground"
                            : "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50",
                        size === "xs" && "h-7 px-2 text-xs",
                      )}
                      onClick={() => handleActiveSheetChange(index)}
                      aria-pressed={isActive}
                    >
                      {sheetLabel}
                      {icon}
                    </Button>
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
      sheetConfigs,
      sheetValidationResults,
    ],
  )

  const handleSubmit = useCallback(
    async (sheetIndex: number) => {
      const sheet = sheetConfigs[sheetIndex]
      if (!sheet) {
        showToast("Error", "Sheet not found.", "error")
        return
      }

      const validation = sheetValidationResults[sheetIndex]
      if (!validation?.isValid) {
        const sheetName = sheet.name || `Sheet ${sheetIndex + 1}`
        showToast(
          "Validation Error",
          `Missing required columns in ${sheetName}: ${validation.missing.join(
            ", ",
          )}`,
          "warning",
        )
        setActiveSheetIndex(sheetIndex)
        setStep("map")
        return
      }

      if (!sendToEmail || !isEmailValid) {
        showToast(
          "Recipient Email Required",
          "A valid recipient email is required. Please check the iframe URL parameters.",
          "warning",
        )
        return
      }

      setSubmittingSheetIndex(sheetIndex)
      try {
        const mapping = sheet.columnMapping
        if (mapping.style === null) {
          throw new Error(
            `Sheet "${
              sheet.name || `Sheet ${sheetIndex + 1}`
            }" is missing a mapped style column.`,
          )
        }

        const prefixRows = sheet.rawData.slice(0, sheet.headerIndex)
        const aoa: CellValue[][] = [
          ...prefixRows,
          sheet.excelData.headers,
          ...sheet.excelData.rows,
        ]
        const worksheet = XLSX.utils.aoa_to_sheet(aoa)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sheet.name || `Sheet${sheetIndex + 1}`,
        )
        const buffer = XLSX.write(workbook, {
          type: "array",
          bookType: "xlsx",
        })
        const baseName = uploadedFile?.name
          ? uploadedFile.name.replace(/\.xlsx?$/i, "")
          : "google-images"
        const sheetLabel = (sheet.name || `sheet-${sheetIndex + 1}`)
          .replace(/\s+/g, "-")
          .toLowerCase()
        const fileName = `${baseName}-${sheetLabel}.xlsx`
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        const formData = new FormData()
        formData.append(
          "fileUploadImage",
          new File([blob], fileName, { type: blob.type }),
        )
        formData.append("searchColImage", indexToColumnLetter(mapping.style))

        if (sheet.manualValues.brand) {
          formData.append("brandColImage", "MANUAL")
          formData.append("manualBrand", sheet.manualValues.brand)
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
        if (mapping.color !== null) {
          formData.append("ColorColImage", indexToColumnLetter(mapping.color))
        }
        if (mapping.category !== null) {
          formData.append(
            "CategoryColImage",
            indexToColumnLetter(mapping.category),
          )
        }
        formData.append("header_index", String(sheet.headerIndex + 1))
        formData.append("sendToEmail", sendToEmail)
        formData.append("currency", currency)

        const response = await fetch(`${SERVER_URL}/submitImage`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Server error for sheet "${
              sheet.name || `Sheet ${sheetIndex + 1}`
            }" (${response.status}): ${errorText || response.statusText}`,
          )
        }

        showToast(
          "Success",
          `Sheet "${
            sheet.name || `Sheet ${sheetIndex + 1}`
          }" submitted successfully.`,
          "success",
        )
        // Optionally, you might want to update the UI to show this sheet is done
      } catch (error) {
        console.error("Submission Error:", error)
        showToast(
          "Submission Error",
          error instanceof Error ? error.message : "Failed to submit",
          "error",
        )
      } finally {
        setSubmittingSheetIndex(null)
      }
    },
    [
      currency,
      isEmailValid,
      sendToEmail,
      sheetConfigs,
      sheetValidationResults,
      showToast,
      uploadedFile,
    ],
  )

  return (
    <div className="container mx-auto p-4 bg-background text-foreground">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between bg-muted/50 p-2 rounded-md items-center">
          <div className="flex gap-4">
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
            <div className="flex gap-2">
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
            </div>
          )}
        </div>

        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">Upload Excel File</h2>
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="bg-white border p-1"
                      aria-label="Upload Excel file"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload an Excel file (.xlsx or .xls) up to 10MB</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isLoading && <Loader2 className="mt-4 h-6 w-6 animate-spin" />}
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            {hasMultipleSheets && (
              <Card>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Sheets</p>
                      <p className="text-xs text-muted-foreground">
                        Viewing{" "}
                        {sheetConfigs[activeSheetIndex]?.name ||
                          `Sheet ${activeSheetIndex + 1}`}
                      </p>
                    </div>
                    {renderSheetButtons("xs")}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex gap-2 text-xs text-muted-foreground items-center">
                            {activeSheetIsReady ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            )}
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
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex gap-4 items-center">
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
                        "cursor-pointer hover:bg-muted/50",
                        rowIndex === headerIndex && "bg-primary/10 font-bold",
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
            <div className="flex flex-col gap-4 items-stretch bg-transparent p-4 rounded-md border w-full md:w-[40%] overflow-y-auto">
              {hasMultipleSheets && (
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Sheets</p>
                        <div className="text-xs text-muted-foreground">
                          <p>Pick a sheet to adjust its column mapping.</p>
                        </div>
                      </div>
                      {renderSheetButtons("sm")}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex gap-2 text-xs text-muted-foreground items-center">
                              {activeSheetIsReady ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              )}
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
                Select a field below, then click a column in the preview grid to
                map it instantly.
              </p>
              {DISPLAY_ORDER.map((field) => {
                const isRequired = REQUIRED_COLUMNS.includes(
                  field as ColumnType,
                )
                const label =
                  field === "readImage"
                    ? "Picture"
                    : field === "color"
                      ? "Color"
                      : field.charAt(0).toUpperCase() + field.slice(1)

                const isManualField = ["brand", "gender", "category"].includes(
                  field,
                )

                if (isManualField) {
                  const typedField = field as "brand" | "gender" | "category"
                  const isManualApplied = Boolean(manualValues[typedField])
                  return (
                    <div
                      key={field}
                      className={cn(
                        "flex gap-2 items-center p-2 rounded-md border cursor-pointer",
                        activeMappingField === field
                          ? "border-primary bg-primary/10"
                          : "border-transparent",
                      )}
                      onClick={() =>
                        setActiveMappingField(field as ColumnType | null)
                      }
                    >
                      <p className="w-[120px] font-semibold">{label}:</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1">
                              <Select
                                value={
                                  columnMapping[typedField] !== null
                                    ? String(columnMapping[typedField])
                                    : ""
                                }
                                onValueChange={(val) =>
                                  handleColumnMap(Number(val), field)
                                }
                                disabled={isManualApplied}
                              >
                                <SelectTrigger
                                  className="w-full"
                                  onFocus={() =>
                                    setActiveMappingField(
                                      field as ColumnType | null,
                                    )
                                  }
                                  onClick={() =>
                                    setActiveMappingField(
                                      field as ColumnType | null,
                                    )
                                  }
                                >
                                  <SelectValue placeholder="Unmapped" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unmapped">
                                    Unmapped
                                  </SelectItem>
                                  {excelData.headers.map((header, index) => (
                                    <SelectItem
                                      key={index}
                                      value={String(index)}
                                      disabled={
                                        mappedDataColumns.has(index) &&
                                        columnMapping[typedField] !== index
                                      }
                                    >
                                      {header ||
                                        `Column ${indexToColumnLetter(index)}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select Excel column for {label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {columnMapping[typedField] === null &&
                        !isManualApplied && (
                          <>
                            <p className="text-sm text-muted-foreground">Or</p>
                            <Input
                              className="w-[150px] h-8"
                              placeholder={`Add Manual ${label}`}
                              value={manualInputs[typedField] || ""}
                              onChange={(e) =>
                                setManualInputs((prev) => ({
                                  ...prev,
                                  [typedField]: e.target.value,
                                }))
                              }
                              aria-label={`Manual ${label} input`}
                            />
                            <Button
                              size="sm"
                              onClick={() => applyManualValue(typedField)}
                              disabled={!manualInputs[typedField]?.trim()}
                            >
                              Apply
                            </Button>
                          </>
                        )}
                      {isManualApplied && (
                        <>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            Manual: {manualValues[typedField]}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                            onClick={() => removeManualValue(typedField)}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                      {columnMapping[typedField] !== null &&
                        !isManualApplied && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearMapping(
                                      columnMapping[typedField]!,
                                    )
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
                    </div>
                  )
                }

                return (
                  <div
                    key={field}
                    className={cn(
                      "flex gap-2 items-center p-2 rounded-md border cursor-pointer",
                      activeMappingField === field
                        ? "border-primary bg-primary/10"
                        : "border-transparent",
                    )}
                    onClick={() =>
                      setActiveMappingField(field as ColumnType | null)
                    }
                  >
                    <p className="w-[120px] font-semibold">
                      {label}:
                      {isRequired && <span style={{ color: "red" }}>*</span>}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Select
                              value={
                                columnMapping[field as keyof ColumnMapping] !==
                                null
                                  ? String(
                                      columnMapping[
                                        field as keyof ColumnMapping
                                      ]!,
                                    )
                                  : ""
                              }
                              onValueChange={(val) =>
                                handleColumnMap(Number(val), field)
                              }
                            >
                              <SelectTrigger
                                className="w-full"
                                onFocus={() =>
                                  setActiveMappingField(
                                    field as ColumnType | null,
                                  )
                                }
                                onClick={() =>
                                  setActiveMappingField(
                                    field as ColumnType | null,
                                  )
                                }
                              >
                                <SelectValue placeholder="Unmapped" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unmapped">
                                  Unmapped
                                </SelectItem>
                                {excelData.headers.map((header, index) => (
                                  <SelectItem
                                    key={index}
                                    value={String(index)}
                                    disabled={
                                      mappedDataColumns.has(index) &&
                                      columnMapping[
                                        field as keyof ColumnMapping
                                      ] !== index
                                    }
                                  >
                                    {header ||
                                      `Column ${indexToColumnLetter(index)}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select Excel column for {label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {columnMapping[field as keyof ColumnMapping] !== null && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearMapping(
                                  columnMapping[field as keyof ColumnMapping]!,
                                )
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
                      {getColumnPreview(
                        columnMapping[field as keyof ColumnMapping],
                        excelData.rows,
                      )}
                    </div>
                  </div>
                )
              })}
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
                                ? "bg-green-100"
                                : "bg-muted",
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
                                "max-w-[200px] truncate cursor-pointer",
                                isMissingRequired
                                  ? "bg-red-100"
                                  : isSelectedColumn
                                    ? "bg-primary/10"
                                    : isMappedColumn
                                      ? "bg-green-50"
                                      : "",
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
          <SubmitStep
            sheetConfigs={sheetConfigs}
            onSubmit={handleSubmit}
            onBack={() => setStep("map")}
            sendToEmail={sendToEmail}
            isEmailValid={isEmailValid}
            submittingSheetIndex={submittingSheetIndex}
            ALL_COLUMNS={[...ALL_COLUMNS, "readImage"]}
            currency={currency}
            onCurrencyChange={setCurrency}
            sheetValidationResults={sheetValidationResults}
          />
        )}
      </div>
    </div>
  )
}

// Export
export const Route = createFileRoute("/reformat-excel")({
  component: ReformatExcelForm,
})
