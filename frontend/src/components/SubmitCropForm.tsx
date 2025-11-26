import {
  ArrowBackIcon,
  CheckIcon,
  CloseIcon,
  WarningIcon,
} from "@chakra-ui/icons"
// components/SubmitCropForm.tsx
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  Container,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
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
  VStack,
  VStack as VStackChakra,
  Wrap,
  WrapItem,
  useColorModeValue,
} from "@chakra-ui/react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"
import { showDevUI } from "../utils"

const SERVER_URL = "https://icon5-8005.iconluxury.today"

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
const SELECTED_BG_STRONG = "brand.100"
const SELECTED_BG_SUBTLE = "brand.50"
const MAPPED_BG = "neutral.100"
const SELECTED_BORDER_COLOR = "brand.600"

const EMAIL_QUERY_KEYS = ["sendToEmail", "email", "userEmail"] as const
const getIframeEmailParameter = (): string | null => {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const candidateKeys = new Set(EMAIL_QUERY_KEYS.map((k) => k.toLowerCase()))
  for (const [k, v] of params.entries()) {
    if (candidateKeys.has(k.toLowerCase())) {
      const trimmed = v.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}
const useIframeEmail = (): string | null => {
  const [email, setEmail] = useState<string | null>(() =>
    getIframeEmailParameter(),
  )
  useEffect(() => {
    if (!email) {
      const e = getIframeEmailParameter()
      if (e) setEmail(e)
    }
  }, [email])
  return email
}

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

  const mappingPanelBg = useColorModeValue("white", "gray.800")
  const mappingPanelBorder = useColorModeValue("gray.200", "gray.700")
  const sheetInactiveBg = useColorModeValue("gray.100", "gray.700")
  const sheetInactiveHover = useColorModeValue("gray.200", "gray.600")
  const sheetWarningHover = useColorModeValue("yellow.100", "yellow.400")

  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const isEmailValid = useMemo(() => {
    if (!sendToEmail) return true
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
  const ActiveSheetStatusIcon = activeSheetIsReady ? CheckIcon : WarningIcon
  const activeSheetStatusColor = activeSheetIsReady ? "green.400" : "yellow.400"
  const activeSheetStatusTooltip = activeSheetIsReady
    ? "Style column mapped. Image columns are detected automatically when present."
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
          const icon = isComplete ? (
            <CheckIcon boxSize={3} />
          ) : (
            <WarningIcon boxSize={3} />
          )
          const sheetLabel = sheet.name || `Sheet ${index + 1}`
          const tooltipLabel = isComplete
            ? "Style column mapped; images auto-detected"
            : hasMissing
              ? `Missing: ${(validation?.missing ?? []).join(", ")}`
              : "Map required columns"
          return (
            <WrapItem key={sheet.name || index}>
              <Tooltip label={tooltipLabel} placement="top" hasArrow>
                <Button
                  size={size}
                  variant={isActive ? "solid" : "ghost"}
                  colorScheme={
                    isActive ? "brand" : isComplete ? "gray" : "yellow"
                  }
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
    if (sendToEmail && !isEmailValid) {
      showToast(
        "Invalid Email",
        "The email supplied via URL parameters isn't valid. Update or remove the email before submitting.",
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
        if (sendToEmail) {
          formData.append("sendToEmail", sendToEmail)
        }
        formData.append(
          "replaceImageColumn",
          replaceImageColumn ? "true" : "false",
        )

        const response = await fetch(`${SERVER_URL}/submitCrop`, {
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

  const isDev = showDevUI()

  return (
    <Container maxW="container.xl" p={4} bg="surface" color="text">
      <VStackChakra spacing={6} align="stretch">
        {onBack && (
          <Button
            alignSelf="flex-start"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowBackIcon />}
            onClick={() => {
              setStep("upload")
              onBack()
            }}
          >
            Back to tools
          </Button>
        )}

        <Box
          bg={isDev ? "red.50" : undefined}
          borderWidth={isDev ? "1px" : undefined}
          borderColor={isDev ? "red.200" : undefined}
          borderRadius="md"
          p={isDev ? 3 : 0}
        >
          {isDev && (
            <Alert status="error" variant="subtle" borderRadius="md" mb={3}>
              <AlertIcon />
              <VStackChakra align="start" spacing={0}>
                <AlertTitle>Developer Mode</AlertTitle>
                <AlertDescription>Not for production use.</AlertDescription>
              </VStackChakra>
            </Alert>
          )}

          {/* Stepper */}
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
                    isDisabled={!validateForm.isValid || !isEmailValid}
                  >
                    Submit
                  </Button>
                )}
              </HStack>
            )}
          </HStack>

          {/* Upload */}
          {step === "upload" && (
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="bold">
                Crop Images
              </Text>
              <FormControl>
                <Tooltip label="Upload an Excel file (.xlsx or .xls) up to 50MB">
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

          {/* Preview / Header selection */}
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
                          Viewing{" "}
                          {sheetConfigs[activeSheetIndex]?.name ||
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
                        Select a sheet to preview its header row and sample
                        data.
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
                >
                  {rawData.slice(0, 20).map((_, index) => (
                    <option key={index} value={index}>
                      Row {index + 1}{" "}
                      {index === headerIndex ? "(Selected)" : ""}
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
                        bg={
                          rowIndex === headerIndex ? "primary.100" : undefined
                        }
                        fontWeight={
                          rowIndex === headerIndex ? "bold" : "normal"
                        }
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
                              rowIndex === headerIndex
                                ? "2px solid"
                                : "1px solid"
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

          {/* Map */}
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
                          Currently editing:{" "}
                          {sheetConfigs[activeSheetIndex]?.name ||
                            `Sheet ${activeSheetIndex + 1}`}
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
                  Select the style field below, then click a column in the
                  preview grid to map it instantly.
                </Text>

                {(["style"] as (keyof ColumnMapping)[]).map((field) => (
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
                    onClick={() => setActiveMappingField(field)}
                  >
                    <Text w="180px" fontWeight="semibold">
                      Style # Column:
                    </Text>
                    <Tooltip label="Select Excel column for style">
                      <Select
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
                        placeholder="Unmapped"
                        flex="1"
                      >
                        <option value="">Unmapped</option>
                        {excelData.headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header || `Column ${indexToColumnLetter(index)}`}
                          </option>
                        ))}
                      </Select>
                    </Tooltip>
                    {columnMapping[field] !== null && (
                      <Tooltip label="Clear mapping">
                        <IconButton
                          aria-label="Clear style mapping"
                          icon={<CloseIcon />}
                          size="sm"
                          onClick={() =>
                            handleClearMapping(columnMapping[field]!)
                          }
                        />
                      </Tooltip>
                    )}
                    <Box w="150px" fontSize="sm" color="subtle" isTruncated>
                      {getColumnPreview(columnMapping[field], excelData.rows)}
                    </Box>
                  </HStack>
                ))}
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
                            const isMissingRequired = REQUIRED_FIELDS.some(
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
                                onClick={() =>
                                  handleColumnMapFromGrid(cellIndex)
                                }
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

          {/* Submit */}
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
                      ?sendToEmail=example@domain.com to the iframe URL.
                    </Text>
                  )}
                  {!isEmailValid && sendToEmail && (
                    <Text fontSize="sm" color="red.500" mt={1}>
                      Invalid email. Please update the iframe URL.
                    </Text>
                  )}
                </FormControl>
                <FormControl>
                  <Checkbox
                    isChecked={replaceImageColumn}
                    onChange={(event) =>
                      setReplaceImageColumn(event.target.checked)
                    }
                  >
                    Replace original image column with cropped output
                  </Checkbox>
                  <Text fontSize="sm" color="subtle" mt={1}>
                    {replaceImageColumn
                      ? "Only the cropped images will remain in the detected image column."
                      : "Deselect to keep both the original and cropped image columns."}
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
                    {(["style"] as (keyof ColumnMapping)[])
                      .filter((key) => columnMapping[key] !== null)
                      .map((key) => (
                        <Tr key={key}>
                          <Td>Style # Column</Td>
                          <Td>
                            {excelData.headers[columnMapping[key] as number] ||
                              `Column ${indexToColumnLetter(
                                columnMapping[key] as number,
                              )}`}
                          </Td>
                          <Td>
                            {getColumnPreview(
                              columnMapping[key],
                              excelData.rows,
                            )}
                          </Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
                <Text fontSize="sm" color="subtle">
                  Image columns are detected automatically when present; no
                  mapping required.
                </Text>
              </VStack>
            </VStack>
          )}
        </Box>
      </VStackChakra>
    </Container>
  )
}

export default SubmitCropForm
