import { CheckIcon, CloseIcon, SearchIcon, WarningIcon } from "@chakra-ui/icons"
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  Wrap,
  WrapItem,
  useColorModeValue,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FaWarehouse } from "react-icons/fa"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"

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

  if (value && value.trim()) {
    const trimmed = value.trim()
    let newHeaders = [...sheet.excelData.headers]
    let newRows = sheet.excelData.rows.map((r) => [...r])

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
    const newHeaders = sheet.excelData.headers.filter((_, i) => i !== headerIndex)
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
    return <Text>No columns mapped.</Text>
  }

  return (
    <Wrap>
      {mappedColumns.map((type) => (
        <WrapItem key={type}>
          <Badge colorScheme="blue">
            {type === "readImage" ? "PICTURE" : type.toUpperCase()}
          </Badge>
        </WrapItem>
      ))}
    </Wrap>
  )
}

const SubmitStep: React.FC<{
  sheetConfigs: SheetConfig[]
  onSubmit: () => void
  onBack: () => void
  sendToEmail: string
  isEmailValid: boolean
  isSubmitting: boolean
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
  isSubmitting,
  ALL_COLUMNS,
  currency,
  onCurrencyChange,
  sheetValidationResults,
}) => {
  const cardBg = useColorModeValue("white", "gray.700")
  const hasSheets = sheetConfigs.length > 0
  const tableHeadBg = useColorModeValue("gray.50", "gray.800")

  return (
    <Container maxW="container.xl" py={5}>
      <VStack spacing={6} align="stretch">
        <Card variant="outline" bg={cardBg}>
          <CardHeader>
            <Heading size="md">Step 4: Confirm and Submit</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              Review the mapped columns for each sheet. The processed file will
              be sent to <strong>{sendToEmail}</strong>.
            </Text>
          </CardBody>
        </Card>

        <Card variant="outline" bg={cardBg}>
          <CardBody>
            <FormControl as="fieldset">
              <FormLabel as="legend" fontWeight="semibold">
                Select Currency
              </FormLabel>
              <RadioGroup onChange={onCurrencyChange} value={currency}>
                <HStack spacing="24px">
                  <Radio value="USD">USD</Radio>
                  <Radio value="EUR">EUR</Radio>
                </HStack>
              </RadioGroup>
            </FormControl>
          </CardBody>
        </Card>

        <Card variant="outline" bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Submission Summary</Heading>
          </CardHeader>
          <CardBody>
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Table variant="simple">
                <Thead bg={tableHeadBg}>
                  <Tr>
                    <Th>Sheet Name</Th>
                    <Th>Status</Th>
                    <Th>Mapped Columns</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sheetConfigs.map((sheet, index) => {
                    const validation = sheetValidationResults[index]
                    const isReady = validation?.isValid ?? false
                    return (
                      <Tr key={index}>
                        <Td fontWeight="medium">{sheet.name}</Td>
                        <Td>
                          <Badge
                            colorScheme={isReady ? "green" : "yellow"}
                            variant="subtle"
                          >
                            <HStack>
                              <Icon
                                as={isReady ? CheckIcon : WarningIcon}
                                boxSize={3}
                              />
                              <Text>
                                {isReady
                                  ? "Ready"
                                  : `Missing: ${validation?.missing.join(", ")}`}
                              </Text>
                            </HStack>
                          </Badge>
                        </Td>
                        <Td>
                          <MappedColumnSummary
                            sheetConfig={sheet}
                            ALL_COLUMNS={ALL_COLUMNS}
                          />
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>

        <HStack justifyContent="space-between" mt={4}>
          <Button onClick={onBack} disabled={isSubmitting} variant="outline">
            Back
          </Button>
          <Button
            colorScheme="brand"
            onClick={onSubmit}
            isLoading={isSubmitting}
            isDisabled={!isEmailValid || !hasSheets}
          >
            {isSubmitting ? "Submitting..." : "Submit All Sheets"}
          </Button>
        </HStack>
      </VStack>
    </Container>
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
  const mappingPanelBg = useColorModeValue("white", "gray.800")
  const mappingPanelBorder = useColorModeValue("gray.200", "gray.700")
  const sheetInactiveBg = useColorModeValue("gray.100", "gray.700")
  const sheetInactiveHover = useColorModeValue("gray.200", "gray.600")
  const sheetWarningHover = useColorModeValue("yellow.100", "yellow.400")

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
      if (
        columnMapping.brand !== null &&
        columnMapping.brand === index
      ) {
        setManualInputs((prev) => ({ ...prev, brand: "" }))
      }
    },
    [activeSheet, activeSheetIndex, columnMapping.brand, updateSheetConfig],
  )

  const mappedDataColumns = useMemo(() => {
    const keys: (ColumnType | "readImage")[] = [
      ...DISPLAY_ORDER,
    ]
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
        missing.length === 0 &&
        excelData.rows.length > 0 &&
        headersAreValid,
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
        const missing = REQUIRED_COLUMNS.filter(
          (col) => mapping[col] === null,
        )
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

  const activeSheetValidation =
    sheetValidationResults[activeSheetIndex] ?? null
  const activeSheetIsReady = Boolean(activeSheetValidation?.isValid)
  const activeSheetMissingColumns = activeSheetValidation?.missing ?? []
  const activeSheetStatusLabel = activeSheetIsReady
    ? "Ready"
    : "Needs mapping"
  const ActiveSheetStatusIcon = activeSheetIsReady ? CheckIcon : WarningIcon
  const activeSheetStatusColor = activeSheetIsReady ? "green.400" : "yellow.400"
  const activeSheetStatusTooltip = activeSheetIsReady
    ? "All required columns are mapped."
    : activeSheetMissingColumns.length > 0
      ? `Missing required columns: ${activeSheetMissingColumns.join(", ")}`
      : "Map all required columns before submitting."

  const renderSheetButtons = useCallback(
    (size: "xs" | "sm" | "md" = "sm") => (
      <Wrap spacing={2} shouldWrapChildren>
        {sheetConfigs.map((sheet, index) => {
          const isActive = index === activeSheetIndex
          const validation = sheetValidationResults[index]
          const isComplete = validation?.isValid
          const hasMissing = (validation?.missing ?? []).length > 0
          const icon = isComplete ? <CheckIcon boxSize={3} /> : <WarningIcon boxSize={3} />
          const sheetLabel = sheet.name || `Sheet ${index + 1}`
          const tooltipLabel = isComplete
            ? "Mapping ready"
            : hasMissing
              ? `Missing: ${(validation?.missing ?? []).join(", ")}`
              : "Map required columns"
          return (
            <WrapItem key={sheet.name || index}>
              <Tooltip label={tooltipLabel} placement="top" hasArrow>
                <Button
                  size={size}
                  variant={isActive ? "solid" : "ghost"}
                  colorScheme={isActive ? "brand" : isComplete ? "gray" : "yellow"}
                  rightIcon={icon}
                  onClick={() => handleActiveSheetChange(index)}
                  cursor="pointer"
                  bg={
                    isActive
                      ? undefined
                      : isComplete
                        ? sheetInactiveBg
                        : sheetWarningHover
                  }
                  _hover={{
                    bg: isActive
                      ? undefined
                      : isComplete
                        ? sheetInactiveHover
                        : sheetWarningHover,
                  }}
                  transition="all 0.2s ease"
                  fontWeight={isActive ? "bold" : "semibold"}
                  borderWidth={isActive ? "1px" : "0px"}
                  borderColor={isActive ? "brand.500" : "transparent"}
                  aria-pressed={isActive}
                >
                  {sheetLabel}
                </Button>
              </Tooltip>
            </WrapItem>
          )
        })}
      </Wrap>
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
    const invalidSheet = sheetValidationResults.find((result) => !result.isValid)
    if (invalidSheet) {
      const sheetName =
        sheetConfigs[invalidSheet.sheetIndex]?.name ||
        `Sheet ${invalidSheet.sheetIndex + 1}`
      showToast(
        "Validation Error",
        `Missing required columns in ${sheetName}: ${invalidSheet.missing.join(", ")}`,
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
            `Sheet "${sheet.name || `Sheet ${index + 1}`}" is missing a mapped style column.`,
          )
        }

        const prefixRows = sheet.rawData.slice(
          0,
          sheet.headerIndex,
        )
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
          sheet.name || `Sheet${index + 1}`,
        )
        const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
        const baseName = uploadedFile?.name
          ? uploadedFile.name.replace(/\.xlsx?$/i, "")
          : "google-images"
        const sheetLabel = (sheet.name || `sheet-${index + 1}`)
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
        formData.append(
          "searchColImage",
          indexToColumnLetter(mapping.style),
        )

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
          formData.append(
            "ColorColImage",
            indexToColumnLetter(mapping.color),
          )
        }
        if (mapping.category !== null) {
          formData.append(
            "CategoryColImage",
            indexToColumnLetter(mapping.category),
          )
        }
        formData.append(
          "header_index",
          String(sheet.headerIndex + 1),
        )
        formData.append("sendToEmail", sendToEmail)
        formData.append("currency", currency)

        const response = await fetch(`${SERVER_URL}/submitImage`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Server error for sheet "${sheet.name || `Sheet ${index + 1}`}" (${response.status}): ${
              errorText || response.statusText
            }`,
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
    currency,
    isEmailValid,
    sendToEmail,
    sheetConfigs,
    sheetValidationResults,
    showToast,
    uploadedFile,
  ])

  return (
    <Container maxW="container.xl" p={4} bg="surface" color="text">
      <VStack spacing={6} align="stretch">
        <HStack
          justify="space-between"
          bg="neutral.50"
          p={2}
          borderRadius="md"
          align="center"
        >
          <HStack spacing={4}>
            {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
              <Text
                key={s}
                fontWeight={
                  step ===
                  s.toLowerCase().replace("header selection", "preview")
                    ? "bold"
                    : "normal"
                }
                color={
                  step ===
                  s.toLowerCase().replace("header selection", "preview")
                    ? "brand.600"
                    : "subtle"
                }
                cursor={
                  i < ["upload", "preview", "map", "submit"].indexOf(step)
                    ? "pointer"
                    : "default"
                }
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
              </Text>
            ))}
          </HStack>
          {step !== "upload" && (
            <HStack>
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
                  isDisabled={step === "map" && !validateForm.isValid}
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
                  colorScheme="brand"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  size="sm"
                  isDisabled={
                    !validateForm.isValid || !sendToEmail || !isEmailValid
                  }
                >
                  Submit
                </Button>
              )}
            </HStack>
          )}
        </HStack>

        {step === "upload" && (
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Upload Excel File
            </Text>
            <FormControl>
              <Tooltip label="Upload an Excel file (.xlsx or .xls) up to 10MB">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  bg="white"
                  borderColor="border"
                  p={1}
                  aria-label="Upload Excel file"
                />
              </Tooltip>
            </FormControl>
            {isLoading && <Spinner mt={4} />}
          </VStack>
        )}

        {step === "preview" && (
          <VStack spacing={4} align="stretch">
            {hasMultipleSheets && (
              <Card
                variant="outline"
                bg={mappingPanelBg}
                borderColor={mappingPanelBorder}
              >
                <CardBody py={3} px={4}>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" align="center">
                      <Text fontWeight="semibold">Sheets</Text>
                      <Text fontSize="xs" color="subtle">
                        Viewing {sheetConfigs[activeSheetIndex]?.name ||
                          `Sheet ${activeSheetIndex + 1}`}
                      </Text>
                    </HStack>
                    {renderSheetButtons("xs")}
                    <Tooltip
                      label={activeSheetStatusTooltip}
                      placement="top"
                      hasArrow
                    >
                      <HStack
                        spacing={2}
                        fontSize="xs"
                        color="subtle"
                        align="center"
                      >
                        <Icon
                          as={ActiveSheetStatusIcon}
                          boxSize={3}
                          color={activeSheetStatusColor}
                        />
                        <Text>{activeSheetStatusLabel}</Text>
                      </HStack>
                    </Tooltip>
                    <Text fontSize="xs" color="subtle">
                      Select a sheet to preview its header row and sample data.
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            )}
            <HStack>
              <Text>Select Header Row:</Text>
              <Select
                value={headerIndex}
                onChange={(e) => handleHeaderChange(Number(e.target.value))}
                w="150px"
                aria-label="Select header row"
              >
                {rawData.slice(0, 20).map((_, index) => (
                  <option key={index} value={index}>
                    Row {index + 1} {index === headerIndex ? "(Selected)" : ""}
                  </option>
                ))}
              </Select>
            </HStack>
            <Box overflowX="auto" borderWidth="1px" borderRadius="md" p={2}>
              <Table size="sm">
                <Tbody>
                  {rawData.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
                    <Tr
                      key={rowIndex}
                      bg={rowIndex === headerIndex ? "primary.100" : undefined}
                      fontWeight={rowIndex === headerIndex ? "bold" : "normal"}
                      cursor="pointer"
                      onClick={() => handleHeaderChange(rowIndex)}
                      role="button"
                      _hover={{
                        bg:
                          rowIndex === headerIndex
                            ? "primary.200"
                            : "primary.50",
                      }}
                    >
                      {row.map((cell, cellIndex) => (
                        <Td
                          key={cellIndex}
                          maxW="200px"
                          isTruncated
                          border={
                            rowIndex === headerIndex ? "2px solid" : "1px solid"
                          }
                          borderColor={
                            rowIndex === headerIndex ? "brand.600" : "border"
                          }
                        >
                          {getDisplayValue(cell)}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {rawData.length > MAX_PREVIEW_ROWS && (
                <Text fontSize="sm" color="subtle" mt={2}>
                  Showing first {MAX_PREVIEW_ROWS} rows of {rawData.length}{" "}
                  total rows
                </Text>
              )}
            </Box>
          </VStack>
        )}

        {step === "map" && (
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={4}
            align="stretch"
            maxH="70vh"
            overflow="auto"
          >
            <VStack
              gap={4}
              align="stretch"
              bg="transparent"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor={mappingPanelBorder}
              w={{ base: "100%", md: "40%" }}
              overflowY="auto"
            >
              {hasMultipleSheets && (
                <Card
                  variant="outline"
                  bg={mappingPanelBg}
                  borderColor={mappingPanelBorder}
                  shadow="xs"
                >
                  <CardBody p={4}>
                    <VStack align="stretch" spacing={3}>
                      <Flex
                        direction={{ base: "column", md: "row" }}
                        justify="space-between"
                        align={{ base: "flex-start", md: "center" }}
                        gap={3}
                      >
                        <Box>
                          <Text fontWeight="semibold">Sheets</Text>
                          <Text fontSize="xs" color="subtle">
                            Pick a sheet to adjust its column mapping.
                          </Text>
                        </Box>
                      </Flex>
                      {renderSheetButtons("sm")}
                      <Tooltip
                        label={activeSheetStatusTooltip}
                        placement="top"
                        hasArrow
                      >
                        <HStack
                          spacing={2}
                          fontSize="xs"
                          color="subtle"
                          align="center"
                        >
                          <Icon
                            as={ActiveSheetStatusIcon}
                            boxSize={3}
                            color={activeSheetStatusColor}
                          />
                          <Text>{activeSheetStatusLabel}</Text>
                        </HStack>
                      </Tooltip>
                      <Text fontSize="xs" color="subtle">
                        {`Currently editing: ${
                          sheetConfigs[activeSheetIndex]?.name ||
                          `Sheet ${activeSheetIndex + 1}`
                        }`}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}
              {!validateForm.isValid && (
                <Text color="red.500" fontSize="sm" fontWeight="medium">
                  Missing required columns: {validateForm.missing.join(", ")}.
                  Please map all required columns.
                </Text>
              )}
              {!headersAreValid && (
                <Text color="red.500" fontSize="sm" fontWeight="medium">
                  Selected header row is empty. Choose a different header row
                  before mapping.
                </Text>
              )}
              <Text fontSize="sm" color="subtle">
                Select a field below, then click a column in the preview grid to
                map it instantly.
              </Text>
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
                    <HStack
                      key={field}
                      gap={2}
                      align="center"
                      p={2}
                      borderRadius="md"
                      borderWidth={activeMappingField === field ? "2px" : "1px"}
                      borderColor={
                        activeMappingField === field
                          ? SELECTED_BORDER_COLOR
                          : "transparent"
                      }
                      bg={
                        activeMappingField === field
                          ? SELECTED_BG_SUBTLE
                          : "transparent"
                      }
                      cursor="pointer"
                      onClick={() =>
                        setActiveMappingField(field as ColumnType | null)
                      }
                    >
                      <Text w="120px" fontWeight="semibold">
                        {label}:
                      </Text>
                      <Tooltip label={`Select Excel column for ${label}`}>
                        <Select
                          value={columnMapping[typedField] ?? ""}
                          onChange={(e) =>
                            handleColumnMap(Number(e.target.value), field)
                          }
                          onFocus={() =>
                            setActiveMappingField(field as ColumnType | null)
                          }
                          onClick={() =>
                            setActiveMappingField(field as ColumnType | null)
                          }
                          placeholder="Unmapped"
                          aria-label={`Map ${label} column`}
                          flex="1"
                          isDisabled={isManualApplied}
                        >
                          <option value="">Unmapped</option>
                          {excelData.headers.map((header, index) => (
                            <option
                              key={index}
                              value={index}
                              disabled={
                                mappedDataColumns.has(index) &&
                                columnMapping[typedField] !== index
                              }
                            >
                              {header || `Column ${indexToColumnLetter(index)}`}
                            </option>
                          ))}
                        </Select>
                      </Tooltip>
                      {columnMapping[typedField] === null && !isManualApplied && (
                        <>
                          <Text fontSize="sm" color="subtle">
                            Or
                          </Text>
                          <Input
                            w="150px"
                            placeholder={`Add Manual ${label}`}
                            value={manualInputs[typedField] || ""}
                            onChange={(e) =>
                              setManualInputs((prev) => ({
                                ...prev,
                                [typedField]: e.target.value,
                              }))
                            }
                            aria-label={`Manual ${label} input`}
                            size="sm"
                          />
                          <Button
                            colorScheme="brand"
                            size="sm"
                            onClick={() => applyManualValue(typedField)}
                            isDisabled={!manualInputs[typedField]?.trim()}
                          >
                            Apply
                          </Button>
                        </>
                      )}
                      {isManualApplied && (
                        <>
                          <Badge colorScheme="green" noOfLines={1}>
                            Manual: {manualValues[typedField]}
                          </Badge>
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => removeManualValue(typedField)}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                      {columnMapping[typedField] !== null && !isManualApplied && (
                        <Tooltip label="Clear mapping">
                          <IconButton
                            aria-label={`Clear ${label} mapping`}
                            icon={<CloseIcon />}
                            size="sm"
                            onClick={() =>
                              handleClearMapping(columnMapping[typedField]!)
                            }
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  )
                }

                return (
                  <HStack
                    key={field}
                    gap={2}
                    align="center"
                    p={2}
                    borderRadius="md"
                    borderWidth={activeMappingField === field ? "2px" : "1px"}
                    borderColor={
                      activeMappingField === field
                        ? SELECTED_BORDER_COLOR
                        : "transparent"
                    }
                    bg={
                      activeMappingField === field
                        ? SELECTED_BG_SUBTLE
                        : "transparent"
                    }
                    cursor="pointer"
                    onClick={() =>
                      setActiveMappingField(field as ColumnType | null)
                    }
                  >
                    <Text w="120px" fontWeight="semibold">
                      {label}:
                      {isRequired && <span style={{ color: "red" }}>*</span>}
                    </Text>
                    <Tooltip label={`Select Excel column for ${label}`}>
                      <Select
                        value={
                          columnMapping[field as keyof ColumnMapping] !== null
                            ? columnMapping[field as keyof ColumnMapping]!
                            : ""
                        }
                        onChange={(e) =>
                          handleColumnMap(Number(e.target.value), field)
                        }
                        onFocus={() =>
                          setActiveMappingField(field as ColumnType | null)
                        }
                        onClick={() =>
                          setActiveMappingField(field as ColumnType | null)
                        }
                        placeholder="Unmapped"
                        aria-label={`Map ${label} column`}
                        flex="1"
                      >
                        <option value="">Unmapped</option>
                        {excelData.headers.map((header, index) => (
                          <option
                            key={index}
                            value={index}
                            disabled={
                              mappedDataColumns.has(index) &&
                              columnMapping[field as keyof ColumnMapping] !==
                                index
                            }
                          >
                            {header || `Column ${indexToColumnLetter(index)}`}
                          </option>
                        ))}
                      </Select>
                    </Tooltip>
                    {columnMapping[field as keyof ColumnMapping] !== null && (
                      <Tooltip label="Clear mapping">
                        <IconButton
                          aria-label={`Clear ${label} mapping`}
                          icon={<CloseIcon />}
                          size="sm"
                          onClick={() =>
                            handleClearMapping(
                              columnMapping[field as keyof ColumnMapping]!,
                            )
                          }
                        />
                      </Tooltip>
                    )}
                    <Box w="150px" fontSize="sm" color="subtle" isTruncated>
                      {getColumnPreview(
                        columnMapping[field as keyof ColumnMapping],
                        excelData.rows,
                      )}
                    </Box>
                  </HStack>
                )
              })}
            </VStack>
            <Box
              overflow="auto"
              borderWidth="1px"
              borderRadius="md"
              p={2}
              w={{ base: "100%", md: "60%" }}
              maxH="70vh"
              mt={{ base: 4, md: 0 }}
            >
              <Table size="sm">
                <Thead>
                  <Tr>
                    {excelData.headers.map((header, index) => {
                      const isMapped = mappedColumnsForHighlight.has(index)
                      const isSelected = selectedColumnIndex === index
                      return (
                        <Th
                          key={index}
                          bg={
                            isSelected
                              ? SELECTED_BG_STRONG
                              : isMapped
                                ? MAPPED_BG
                                : "neutral.100"
                          }
                          position="sticky"
                          top={0}
                          border={
                            isSelected || isMapped ? "2px solid" : undefined
                          }
                          borderColor={
                            isSelected || isMapped
                              ? SELECTED_BORDER_COLOR
                              : "transparent"
                          }
                          cursor={activeMappingField ? "pointer" : "default"}
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
                          _hover={
                            activeMappingField
                              ? {
                                  bg: isSelected
                                    ? SELECTED_BG_STRONG
                                    : SELECTED_BG_SUBTLE,
                                }
                              : undefined
                          }
                        >
                          {header || `Column ${indexToColumnLetter(index)}`}
                        </Th>
                      )
                    })}
                  </Tr>
                </Thead>
                <Tbody>
                  {excelData.rows
                    .slice(0, MAX_PREVIEW_ROWS)
                    .map((row, rowIndex) => (
                      <Tr key={rowIndex}>
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
                          const bgColor = isMissingRequired
                            ? "danger.100"
                            : isSelectedColumn
                              ? SELECTED_BG_SUBTLE
                              : isMappedColumn
                                ? MAPPED_BG
                                : undefined
                          return (
                            <Td
                              key={cellIndex}
                              maxW="200px"
                              isTruncated
                              bg={bgColor}
                              cursor={
                                activeMappingField ? "pointer" : "default"
                              }
                              onClick={() => handleColumnMapFromGrid(cellIndex)}
                            >
                              {getDisplayValue(cell)}
                            </Td>
                          )
                        })}
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </Box>
          </Flex>
        )}
        {step === "submit" && (
          <SubmitStep
            sheetConfigs={sheetConfigs}
            onSubmit={handleSubmit}
            onBack={() => setStep("map")}
            sendToEmail={sendToEmail}
            isEmailValid={isEmailValid}
            isSubmitting={isLoading}
            ALL_COLUMNS={[...ALL_COLUMNS, "readImage"]}
            currency={currency}
            onCurrencyChange={setCurrency}
            sheetValidationResults={sheetValidationResults}
          />
        )}
      </VStack>
    </Container>
  )
}


// Export
export const Route = createFileRoute("/reformat-excel")({
  component: ReformatExcelForm,
})
