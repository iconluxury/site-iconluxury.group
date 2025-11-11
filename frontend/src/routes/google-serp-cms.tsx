import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
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
  HStack,
  Icon,
  Input,
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
  useColorModeValue,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { CheckIcon, SearchIcon, WarningIcon, CopyIcon, LockIcon } from "@chakra-ui/icons"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { FaWarehouse } from "react-icons/fa"

import useCustomToast from "../hooks/useCustomToast"
import {
  SheetConfig,
  useExcelProcessor,
  withManualBrandValue,
  withoutManualBrandValue,
} from "../hooks/useExcelProcessor"
import { createFileRoute } from "@tanstack/react-router"

// Add a useModal mock
const useModal = () => ({
  isOpen: false,
  onOpen: () => {},
  onClose: () => {},
  component: () => null,
})

// Shared Constants and Types
type ColumnType = "style" | "brand" | "category" | "colorName" | "msrp"
const SERVER_URL = "https://icon5-8005.iconluxury.today"

const MAX_PREVIEW_ROWS = 20
const MAX_FILE_SIZE_MB = 200

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = Record<
  ColumnType | "readImage" | "imageAdd",
  number | null
>

type ToastFunction = (
  title: string,
  description: string,
  status: "error" | "warning" | "success",
) => void

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

const ALL_COLUMNS = GOOGLE_IMAGES_ALL_COLUMNS
const REQUIRED_COLUMNS = GOOGLE_IMAGES_REQUIRED_COLUMNS

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
  colorName: null,
  msrp: null,
  readImage: null,
  imageAdd: null,
})

const EMPTY_EXCEL_DATA: ExcelData = { headers: [], rows: [] }
const EMPTY_COLUMN_MAPPING: ColumnMapping = Object.freeze(
  createEmptyColumnMapping(),
)

const INITIAL_SHEET_CONFIG: SheetConfig = {
  name: "default",
  rawData: [],
  headerIndex: 0,
  excelData: EMPTY_EXCEL_DATA,
  columnMapping: EMPTY_COLUMN_MAPPING,
  manualBrandValue: null,
}

const cloneColumnMapping = (mapping: ColumnMapping): ColumnMapping => ({
  style: mapping.style,
  brand: mapping.brand,
  category: mapping.category,
  colorName: mapping.colorName,
  msrp: mapping.msrp,
  readImage: mapping.readImage,
  imageAdd: mapping.imageAdd,
})

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

// ExcelDataTable Component
const ExcelDataTable: React.FC<{
  sheetData: { data: CellValue[][]; name: string }
  headerRow: number
  setHoveredRow: (index: number | null) => void
  hoveredRow: number | null
}> = ({
  sheetData,
  headerRow,
  setHoveredRow,
  hoveredRow,
}) => {
  const headerBg = useColorModeValue("gray.100", "gray.700")
  const hoverBg = useColorModeValue("blue.50", "blue.900")

  if (!sheetData || sheetData.data.length === 0) {
    return <Text>No data to display.</Text>
  }

  const headers = sheetData.data[headerRow] || []

  return (
    <Box overflow="auto" h="100%">
      <Table variant="simple" size="sm">
        <Thead position="sticky" top={0} zIndex={1} bg={headerBg}>
          <Tr>
            {headers.map((header, index) => (
              <Th key={index}>{getDisplayValue(header)}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {sheetData.data
            .slice(headerRow + 1, headerRow + 1 + MAX_PREVIEW_ROWS)
            .map((row, rowIndex) => (
              <Tr
                key={rowIndex}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
                bg={hoveredRow === rowIndex ? hoverBg : undefined}
              >
                {headers.map((_, cellIndex) => (
                  <Td key={cellIndex} isTruncated maxW="200px">
                    {getDisplayValue(row[cellIndex])}
                  </Td>
                ))}
              </Tr>
            ))}
        </Tbody>
      </Table>
    </Box>
  )
}

// Google Images Form Component
const GoogleImagesForm: React.FC = () => {
  const [step, setStep] = useState<"upload" | "preview" | "map" | "submit">(
    "upload",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [skipDataWarehouse, setSkipDataWarehouse] = useState(false)
  const [isIconDistro, setIsIconDistro] = useState(false)
  const [isAiMode, setIsAiMode] = useState(false)
  const iframeEmail = useIframeEmail()
  const [sendToEmail, setSendToEmail] = useState(
    () => iframeEmail?.trim() ?? "",
  )
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const showToast: ToastFunction = useCustomToast()

  const {
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    sheetConfigs,
    setSheetConfigs,
    file: uploadedFile,
    rawData,
    isProcessing,
    processFile,
  } = useExcelProcessor()

  const activeSheet = sheets[activeSheetIndex]
  const activeSheetConfig = sheetConfigs[activeSheetIndex]

  const updateSheetConfig = (
    sheetIndex: number,
    updater: (config: SheetConfig) => SheetConfig,
  ) => {
    setSheetConfigs((prev) =>
      prev.map((config, index) =>
        index === sheetIndex ? updater(config) : config,
      ),
    )
  }

  const [manualBrand, setManualBrand] = useState(
    activeSheetConfig?.manualBrandValue || "",
  )

  useEffect(() => {
    setManualBrand(activeSheetConfig?.manualBrandValue || "")
  }, [activeSheetConfig])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
      setStep("preview")
    }
  }

  const handleHeaderChange = (newIndex: number) => {
    updateSheetConfig(activeSheetIndex, (config) => ({
      ...config,
      headerIndex: newIndex,
    }))
  }

  const handleColumnMap = (columnIndex: number, columnType: keyof ColumnMapping) => {
    updateSheetConfig(activeSheetIndex, (config) => ({
      ...config,
      columnMapping: {
        ...config.columnMapping,
        [columnType]: columnIndex === -1 ? null : columnIndex,
      },
    }))
  }

  const validateForm = useMemo(() => {
    if (!activeSheetConfig) return { isValid: false, missing: REQUIRED_COLUMNS }
    const missing = REQUIRED_COLUMNS.filter(
      (col) => activeSheetConfig.columnMapping[col] === null,
    )
    return { isValid: missing.length === 0, missing }
  }, [activeSheetConfig])

  const isEmailValid = useMemo(() => {
    if (!sendToEmail) return false
    // simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendToEmail)
  }, [sendToEmail])

  const handleSubmit = () => {
    // Placeholder for submission logic
    console.log("Submitting:", {
      sheetConfigs,
      sendToEmail,
      isIconDistro,
      skipDataWarehouse,
      isAiMode,
    })
    showToast("Success", "Form submitted (placeholder)", "success")
  }

  const hasMultipleSheets = sheets.length > 1

  const mappingPanelBg = useColorModeValue("gray.50", "gray.800")
  const mappingPanelBorder = useColorModeValue("gray.200", "gray.700")

  const renderSheetButtons = (size: string) => (
    <Wrap>
      {sheets.map((sheet, index) => (
        <WrapItem key={sheet.name}>
          <Button
            size={size as "sm" | "md" | "lg" | "xs"}
            variant={index === activeSheetIndex ? "solid" : "outline"}
            onClick={() => setActiveSheetIndex(index)}
          >
            {sheet.name}
          </Button>
        </WrapItem>
      ))}
    </Wrap>
  )

  const {
    activeSheetStatusTooltip,
    ActiveSheetStatusIcon,
    activeSheetStatusColor,
    activeSheetStatusLabel,
  } = useMemo(() => {
    if (!activeSheetConfig)
      return {
        activeSheetStatusTooltip: "No sheet selected",
        ActiveSheetStatusIcon: WarningIcon,
        activeSheetStatusColor: "orange.500",
        activeSheetStatusLabel: "No sheet",
      }
    const missing = REQUIRED_COLUMNS.filter(
      (col) => activeSheetConfig.columnMapping[col] === null,
    )
    if (missing.length === 0) {
      return {
        activeSheetStatusTooltip: "All required columns are mapped.",
        ActiveSheetStatusIcon: CheckIcon,
        activeSheetStatusColor: "green.500",
        activeSheetStatusLabel: "Ready",
      }
    }
    return {
      activeSheetStatusTooltip: `Missing columns: ${missing.join(", ")}`,
      ActiveSheetStatusIcon: WarningIcon,
      activeSheetStatusColor: "orange.500",
      activeSheetStatusLabel: `${missing.length} missing`,
    }
  }, [activeSheetConfig])

  const excelData = useMemo(() => {
    if (!activeSheetConfig || !rawData) return null
    const headerIndex = activeSheetConfig.headerIndex
    const headers = rawData[headerIndex]?.map(String) || []
    const rows = rawData.slice(headerIndex + 1)
    return { headers, rows }
  }, [activeSheetConfig, rawData])

  const headerIndex = activeSheetConfig?.headerIndex ?? 0
  const columnMapping = activeSheetConfig?.columnMapping ?? EMPTY_COLUMN_MAPPING
  const isManualBrandApplied = !!activeSheetConfig?.manualBrandValue

  const headersAreValid = useMemo(() => {
    if (!excelData) return false
    return excelData.headers.some((h) => h && h.trim() !== "")
  }, [excelData])

  const handleApplyManualBrand = useCallback(() => {
    const trimmed = manualBrand.trim()
    if (!trimmed) return
    if (!activeSheet) return
    updateSheetConfig(activeSheetIndex, (sheet) => {
      const updatedSheet = withManualBrandValue(sheet, trimmed)
      return updatedSheet
    })
    setSheetConfigs((prev) =>
      prev.map((config, index) =>
        index === activeSheetIndex
          ? { ...config, manualBrandValue: trimmed }
          : config,
      ),
    )
    showToast("Success", `Manual brand "${trimmed}" applied`, "success")
  }, [
    activeSheet,
    activeSheetIndex,
    manualBrand,
    showToast,
    updateSheetConfig,
    setSheetConfigs,
  ])

  const handleClearManualBrand = useCallback(() => {
    if (!activeSheet?.manualBrandValue) return
    updateSheetConfig(activeSheetIndex, (sheet) =>
      withoutManualBrandValue(sheet),
    )
    setManualBrand("")
    showToast("Success", "Manual brand cleared", "success")
  }, [
    activeSheet,
    activeSheetIndex,
    showToast,
    updateSheetConfig,
  ])

  const {
    isOpen: isConfirmModalOpen,
    onOpen: onConfirmModalOpen,
    onClose: onConfirmModalClose,
    component: ConfirmComponent,
  } = useModal()

  const handleProcess = useCallback(async () => {
    if (!headersAreValid) return
    setIsLoading(true)
    try {
      // This seems to be dead code as processFile is from the hook and has a different signature
      // await processFile(activeSheetIndex, {
      //   sendToEmail,
      //   isIconDistro,
      //   skipDataWarehouse,
      //   isAiMode,
      // })
      showToast("Success", "File processed successfully", "success")
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      showToast(
        "Processing Error",
        error instanceof Error ? error.message : "Unknown error",
        "error",
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    // activeSheetIndex, // processFile from hook doesn't take index
    // processFile, // Removed as it's from the hook now
    sendToEmail,
    isIconDistro,
    skipDataWarehouse,
    isAiMode,
    showToast,
    headersAreValid,
  ])

  if (!activeSheetConfig) {
    // Render a loading or empty state until sheetConfigs are populated
    return (
       <Container maxW="container.xl" p={4} bg="surface" color="text">
        <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Upload Excel File for Google Images Scrape
            </Text>
            <FormControl>
              <Tooltip label="Upload an Excel file (.xlsx or .xls) up to 200MB">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  bg="white"
                  borderColor="border"
                  p={1}
                  aria-label="Upload Excel file"
                />
              </Tooltip>
            </FormControl>
            {isProcessing && <Spinner mt={4} />}
          </VStack>
      </Container>
    )
  }

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
              Upload Excel File for Google Images Scrape
            </Text>
            <FormControl>
              <Tooltip label="Upload an Excel file (.xlsx or .xls) up to 200MB">
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
            {excelData && (
              <VStack
                gap={4}
                align="stretch"
                bg="transparent"
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor={useColorModeValue("gray.200", "gray.700")}
                w={{ base: "100%", md: "40%" }}
                overflowY="auto"
              >
                {!validateForm.isValid && (
                  <Text color="red.500" fontSize="sm" fontWeight="medium">
                    Missing required columns: {validateForm.missing.join(", ")}
                    . Please map all required columns.
                  </Text>
                )}
                {!headersAreValid && (
                  <Text color="red.500" fontSize="sm" fontWeight="medium">
                    Selected header row is empty. Choose a different header row
                    before mapping.
                  </Text>
                )}
                <Card
                  variant="outline"
                  bg={useColorModeValue("white", "gray.800")}
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                  shadow="xs"
                >
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Text fontWeight="semibold">Map Columns</Text>
                      {ALL_COLUMNS.map((col) => (
                        <FormControl
                          key={col}
                          isRequired={REQUIRED_COLUMNS.includes(col)}
                        >
                          <FormLabel fontSize="sm">{col}</FormLabel>
                          <Select
                            size="sm"
                            value={columnMapping[col] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value
                              handleColumnMap(
                                val ? parseInt(val, 10) : -1,
                                col,
                              )
                            }}
                            placeholder={`Select ${col} column`}
                            isDisabled={!headersAreValid}
                          >
                            {excelData.headers.map((header, idx) => (
                              <option key={idx} value={idx}>
                                {header}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            )}
            {excelData && (
              <VStack flex={1} align="stretch" spacing={4}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontWeight="semibold">
                    {uploadedFile?.name || "Preview"}
                  </Text>
                </HStack>
                <Box flex={1} overflow="auto" position="relative">
                  <ExcelDataTable
                    sheetData={{ data: rawData, name: uploadedFile?.name || "sheet" }}
                    headerRow={headerIndex}
                    setHoveredRow={setHoveredRow}
                    hoveredRow={hoveredRow}
                  />
                </Box>
              </VStack>
            )}
          </Flex>
        )}
        {step === "submit" && excelData && (
          <VStack spacing={4} align="stretch">
            <VStack align="start" spacing={4}>
              <Text>Rows: {excelData.rows.length}</Text>
              <FormControl isRequired>
                <FormLabel>User:</FormLabel>
                {sendToEmail ? (
                  <Text fontWeight="medium">{sendToEmail}</Text>
                ) : (
                  <Text fontSize="sm" color="red.500">
                    No email parameter detected. Add
                    ?sendToEmail=example@domain.com (or email/userEmail) to the
                    iframe URL.
                  </Text>
                )}
                {!isEmailValid && sendToEmail && (
                  <Text fontSize="sm" color="red.500" mt={1}>
                    The email supplied the URL looks invalid. Update the
                    iframe query parameter before submitting.
                  </Text>
                )}
              </FormControl>
              <FormControl>
                <Checkbox
                  colorScheme="brand"
                  size="lg"
                  isChecked={isIconDistro}
                  onChange={(e) => setIsIconDistro(e.target.checked)}
                >
                  Output as New Distro
                </Checkbox>
                <Text fontSize="sm" color="subtle" mt={2} pl={8}>
                  If not selected, results will be populated into the uploaded
                  file.
                </Text>
              </FormControl>
              <FormControl>
                <Checkbox
                  colorScheme="brand"
                  size="lg"
                  isChecked={skipDataWarehouse}
                  onChange={(e) => setSkipDataWarehouse(e.target.checked)}
                >
                  Skip Data Warehouse Processing
                </Checkbox>
                <Text fontSize="sm" color="subtle" mt={2} pl={8}>
                  If selected, data will not be processed for the data
                  warehouse.
                </Text>
              </FormControl>
              <FormControl>
                <Checkbox
                  colorScheme="brand"
                  size="lg"
                  isChecked={isAiMode}
                  onChange={(e) => setIsAiMode(e.target.checked)}
                  isDisabled={true}
                >
                  AI Mode
                </Checkbox>
                <Text fontSize="sm" color="subtle" mt={2} pl={8}>
                  If selected, will submit with AI mode enabled.
                </Text>
              </FormControl>
              <Text>Mapped Columns:</Text>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Field</Th>
                    <Th>Column</Th>
                    <Th>Preview</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {getColumnMappingEntries(columnMapping)
                    .filter(
                      ([col, index]) =>
                        index !== null &&
                        col !== "readImage" &&
                        col !== "imageAdd",
                    )
                    .map(([col, index]) => (
                      <Tr key={col}>
                        <Td>{col}</Td>
                        <Td>
                          {excelData.headers[index!] ||
                            `Column ${indexToColumnLetter(index!)}`}
                        </Td>
                        <Td>{getColumnPreview(index, excelData.rows)}</Td>
                      </Tr>
                    ))}
                  {isManualBrandApplied && (
                    <Tr>
                      <Td>Manual Brand</Td>
                      <Td>BRAND (Manual)</Td>
                      <Td>
                        {excelData.rows[0]?.[excelData.headers.length - 1] ||
                          manualBrand}
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </VStack>
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
// Data Warehouse Form Component
const DataWarehouseForm: React.FC = () => {
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
  const [manualBrand, setManualBrand] = useState("")
  const [isManualBrandApplied, setIsManualBrandApplied] = useState(false)
  const [activeMappingField, setActiveMappingField] = useState<keyof ColumnMapping | null>(null)
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD")
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [skipDataWarehouse, setSkipDataWarehouse] = useState(false)
  const [isNewDistro, setIsNewDistro] = useState(false)

  const iframeEmail = useIframeEmail()
  const [sendToEmail, setSendToEmail] = useState(
    () => iframeEmail?.trim() ?? "",
  )

  const dataHeadersAreValid = useMemo(() => {
    if (!excelData || rawData.length === 0) return true
    const headerRowData = rawData[headerIndex]
    return (
      headerRowData && headerRowData.some((cell) => cell !== null && cell !== "")
    )
  }, [excelData, headerIndex, rawData])

  const {
    getInputProps: getDWInputProps,
    getRootProps: getDWRootProps,
    isDragActive: isDWDragActive,
  } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    onDrop: useCallback((acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      setFile(file)
      setIsLoading(true)
      setStep("upload")
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }, []),
  })

  const showToast = useCustomToast()
  const isEmailValid = useMemo(() => {
    if (!sendToEmail) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendToEmail)
  }, [sendToEmail])

  const REQUIRED_COLUMNS: ColumnType[] = ["style", "msrp"]
  const OPTIONAL_COLUMNS: ColumnType[] = ["brand"]
  const ALL_COLUMNS: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

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

  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (field && !ALL_COLUMNS.includes(field as ColumnType)) return
      setColumnMapping((prev) => {
        const newMapping = { ...prev }
        // Clear any other field that might be using this index
        ;(Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach((key) => {
          if (
            newMapping[key] === index &&
            key !== "readImage" &&
            key !== "imageAdd"
          ) {
            newMapping[key] = null
          }
        })
        // Set the new mapping
        if (field && ALL_COLUMNS.includes(field as ColumnType)) {
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
      setColumnMapping((prev) => {
        const newMapping = { ...prev }
        // Clear the mapping for the specified index
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
    },
    [],
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
    const newHeaders = [...excelData.headers, MANUAL_BRAND_HEADER]
    const newRows = excelData.rows.map((row) => [...row, trimmed])
    const brandIndex = newHeaders.length - 1
    setExcelData({ headers: newHeaders, rows: newRows })
    setColumnMapping((prev) => ({ ...prev, brand: brandIndex }))
    setIsManualBrandApplied(true)
    setManualBrand("")
    setActiveMappingField(null)
  }, [excelData, manualBrand, showToast])

  const removeManualBrand = useCallback(() => {
    if (!isManualBrandApplied) return
    const newHeaders = excelData.headers.slice(0, -1)
    const newRows = excelData.rows.map((row) => row.slice(0, -1))
    setExcelData({ headers: newHeaders, rows: newRows })
    setColumnMapping((prev) => ({ ...prev, brand: null }))
    setIsManualBrandApplied(false)
  }, [excelData, isManualBrandApplied])

  const validateForm = useMemo(() => {
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
  }, [columnMapping, excelData.rows.length, headersAreValid, REQUIRED_COLUMNS])

  const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast(
        "Validation Error",
        `Missing required columns: ${validateForm.missing.join(", ")}`,
        "warning",
      )
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
      const aoa: CellValue[][] = [
        ...rawData.slice(0, headerIndex),
        excelData.headers,
        ...excelData.rows,
      ]
      const worksheet = XLSX.utils.aoa_to_sheet(aoa)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
      const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const formData = new FormData()
      formData.append(
        "fileUpload",
        new File([blob], file?.name || "data.xlsx", { type: blob.type }),
      )
      formData.append("searchCol", indexToColumnLetter(columnMapping.style!))
      if (columnMapping.brand !== null) {
        formData.append("brandCol", indexToColumnLetter(columnMapping.brand))
      }
      formData.append("msrpCol", indexToColumnLetter(columnMapping.msrp!))
      formData.append("header_index", String(headerIndex + 1))
      formData.append("sendToEmail", sendToEmail)
      formData.append("isNewDistro", String(isNewDistro))
      formData.append("currency", currency)

      const response = await fetch(`${SERVER_URL}/submit`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Server error (${response.status}): ${
            errorText || response.statusText
          }`,
        )
      }

      showToast("Success", "Job submitted successfully", "success")
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      console.error("Submission Error:", error)
      showToast(
        "Submission Error",
        error instanceof Error ? error.message : "Failed to submit",
        "error",
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    validateForm,
    sendToEmail,
    isEmailValid,
    rawData,
    headerIndex,
    excelData,
    file,
    columnMapping,
    isNewDistro,
    currency,
    showToast,
  ])

  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
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
              Upload Excel File for Data Warehouse
            </Text>
            <FormControl>
              <Tooltip label="Upload an Excel file (.xlsx or .xls) up to 200MB">
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
              borderColor={useColorModeValue("gray.200", "gray.700")}
              w={{ base: "100%", md: "40%" }}
              overflowY="auto"
            >
              {!validateForm.isValid && (
                <Text color="red.500" fontSize="sm" fontWeight="medium">
                  Missing required columns: {validateForm.missing.join(", ")}
                  . Please map all required columns.
                </Text>
              )}
              {!headersAreValid && (
                <Text color="red.500" fontSize="sm" fontWeight="medium">
                  Selected header row is empty. Choose a different header row
                  before mapping.
                </Text>
              )}
              <Card
                variant="outline"
                bg={useColorModeValue("white", "gray.800")}
                borderColor={useColorModeValue("gray.200", "gray.700")}
                shadow="xs"
              >
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text fontWeight="semibold">Map Columns</Text>
                    {ALL_COLUMNS.map((col) => (
                      <FormControl
                        key={col}
                        isRequired={REQUIRED_COLUMNS.includes(col)}
                      >
                        <FormLabel fontSize="sm">{col}</FormLabel>
                        <Select
                          size="sm"
                          value={columnMapping[col] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                            handleColumnMap(
                              val ? parseInt(val, 10) : -1,
                              col,
                            )
                          }}
                          placeholder={`Select ${col} column`}
                          isDisabled={!headersAreValid}
                        >
                          {excelData.headers.map((header, idx) => (
                            <option key={idx} value={idx}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
            <VStack flex={1} align="stretch" spacing={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="semibold">{file?.name || "Preview"}</Text>
              </HStack>
              <Box flex={1} overflow="auto" position="relative">
                <ExcelDataTable
                  sheetData={{ data: rawData, name: file?.name || "sheet" }}
                  headerRow={headerIndex}
                  setHoveredRow={setHoveredRow}
                  hoveredRow={hoveredRow}
                />
              </Box>
            </VStack>
          </Flex>
        )}
        {step === "submit" && (
          <VStack spacing={4} align="stretch">
            <VStack align="start" spacing={4}>
              <Text>Rows: {excelData.rows.length}</Text>
              <FormControl isRequired>
                <FormLabel>User:</FormLabel>
                {sendToEmail ? (
                  <Text fontWeight="medium">{sendToEmail}</Text>
                ) : (
                  <Text fontSize="sm" color="red.500">
                    No email parameter detected. Add
                    ?sendToEmail=example@domain.com (or email/userEmail) to the
                    iframe URL.
                  </Text>
                )}
                {!isEmailValid && sendToEmail && (
                  <Text fontSize="sm" color="red.500" mt={1}>
                    The email supplied the URL looks invalid. Update the
                    iframe query parameter before submitting.
                  </Text>
                )}
              </FormControl>
              <FormControl>
                <Checkbox
                  colorScheme="brand"
                  size="lg"
                  isChecked={isNewDistro}
                  onChange={(e) => setIsNewDistro(e.target.checked)}
                >
                  Output as New Distro
                </Checkbox>
                <Text fontSize="sm" color="subtle" mt={2} pl={8}>
                  If not selected, results will be populated into the uploaded
                  file.
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel>Currency</FormLabel>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "EUR")}
                  w="150px"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </FormControl>
              <Text>Mapped Columns:</Text>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Field</Th>
                    <Th>Column</Th>
                    <Th>Preview</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {getColumnMappingEntries(columnMapping)
                    .filter(
                      ([col, index]) =>
                        index !== null &&
                        col !== "readImage" &&
                        col !== "imageAdd",
                    )
                    .map(([col, index]) => (
                      <Tr key={col}>
                        <Td>{col}</Td>
                        <Td>
                          {excelData.headers[index!] ||
                            `Column ${indexToColumnLetter(index!)}`}
                        </Td>
                        <Td>{getColumnPreview(index, excelData.rows)}</Td>
                      </Tr>
                    ))}
                  {isManualBrandApplied && (
                    <Tr>
                      <Td>Manual Brand</Td>
                      <Td>BRAND (Manual)</Td>
                      <Td>
                        {excelData.rows[0]?.[excelData.headers.length - 1] ||
                          manualBrand}
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </VStack>
          </VStack>
        )}
      </VStack>
    </Container>
  )
}

const ImageLinksToPicturesForm: React.FC = () => {
  return (
    <Container maxW="container.xl" p={4}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Convert Image Links to Pictures
        </Text>
        <Text>This tool is currently under development.</Text>
      </VStack>
    </Container>
  )
}

/* -------------------------------------------------------------
   Crop tool – locked until backend is ready
   ------------------------------------------------------------- */
const ImageCropToolForm: React.FC = () => {
  const showToast = useCustomToast()

  return (
    <Container maxW="container.xl" p={4}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Image Crop Tool
        </Text>
        <Text>This tool is currently under development.</Text>
        <Button
          onClick={() =>
            showToast(
              "In Development",
              "This feature is not yet available.",
              "info",
            )
          }
        >
          Get Started
        </Button>
      </VStack>
    </Container>
  )
}

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
  const [selectedType, setSelectedType] = useState<
    "images" | "data" | "imageLinks" | "crop" | null
  >(null)

  if (selectedType === "images") return <GoogleImagesForm />
  if (selectedType === "data") return <DataWarehouseForm />
  if (selectedType === "imageLinks") return <ImageLinksToPicturesForm />
  if (selectedType === "crop") return <ImageCropToolForm /> // locked stub

  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={6} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card cursor="pointer" onClick={() => setSelectedType("images")}>
            <CardHeader>
              <HStack>
                <Icon as={SearchIcon} boxSize={6} color="primary.500" />
                <Text fontSize="xl" fontWeight="bold">
                  Scrape Google Images
                </Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text>Google Images</Text>
            </CardBody>
          </Card>
          <Card cursor="pointer" onClick={() => setSelectedType("data")}>
            <CardHeader>
              <HStack>
                <Icon as={FaWarehouse} boxSize={6} color="primary.500" />
                <Text fontSize="xl" fontWeight="bold">
                  Data Warehouse
                </Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text>Data Warehouse</Text>
            </CardBody>
          </Card>
          <Card
            cursor="pointer"
            onClick={() => setSelectedType("imageLinks")}
            opacity={0.5}
            _hover={{ opacity: 0.7 }}
          >
            <CardHeader>
              <HStack>
                <Icon as={CopyIcon} boxSize={6} color="primary.500" />
                <Text fontSize="xl" fontWeight="bold">
                  Image Links to Pictures
                </Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text>Convert image URLs to embedded pictures.</Text>
            </CardBody>
          </Card>
          <Card
            cursor="pointer"
            onClick={() => setSelectedType("crop")}
            opacity={0.5}
            _hover={{ opacity: 0.7 }}
          >
            <CardHeader>
              <HStack>
                <LockIcon boxSize={6} color="gray.500" />
                <Text fontSize="xl" fontWeight="bold">
                  Crop Images
                </Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text>
                Crop images on excel file
              </Text>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Container>
  )
}

export const Route = createFileRoute("/google-serp-cms")({
  component: CMSGoogleSerpForm,
})
