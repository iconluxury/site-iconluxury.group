// components/SubmitCropForm.tsx
import {
  Box,
  Button,
  Card,
  CardBody,
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
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
} from "@chakra-ui/react"
import { ArrowBackIcon, CheckIcon, CloseIcon, WarningIcon } from "@chakra-ui/icons"
import * as XLSX from "xlsx"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import useCustomToast from "../hooks/useCustomToast"
import { showDevUI } from "../utils"

const SERVER_URL = "https://icon5-8005.iconluxury.today"

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = {
  style: number | null
  image: number | null
}
type SheetConfig = {
  name: string
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
}

const MAX_PREVIEW_ROWS = 20
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
  const [email, setEmail] = useState<string | null>(() => getIframeEmailParameter())
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
  if (typeof value === "object") return JSON.stringify(value)
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
    style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    image: /(picture|image|photo|img)/i,
  }
  let bestIndex = 0
  let maxNonEmpty = 0
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i].map((cell) => String(cell ?? "").trim())
    const count = rowValues.filter((v) => v !== "").length
    if (count < 2) continue
    const hasMatch = rowValues.some((v) =>
      patterns.style.test(v) || patterns.image.test(v)
    )
    if (hasMatch || count > maxNonEmpty) {
      bestIndex = i
      maxNonEmpty = count
      if (hasMatch) break
    }
  }
  return bestIndex
}

const getColumnPreview = (columnIndex: number | null, rows: CellValue[][]): string => {
  if (columnIndex === null || columnIndex < 0 || columnIndex >= (rows[0]?.length ?? 0))
    return "No values"
  const values = rows
    .map((row) => getDisplayValue(row[columnIndex]))
    .filter((v) => v.trim() !== "")
    .slice(0, 3)
  return values.length ? values.join(", ") : "No values"
}

const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = { style: null, image: null }
  const patterns = {
    style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    image: /(picture|image|photo|img)/i,
  }
  headers.forEach((header, index) => {
    const h = header.trim()
    if (!h) return
    if (patterns.style.test(h) && mapping.style === null) mapping.style = index
    if (patterns.image.test(h) && mapping.image === null) mapping.image = index
  })
  return mapping
}

const SubmitCropForm: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState<"upload" | "preview" | "map" | "submit">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [activeMappingField, setActiveMappingField] = useState<keyof ColumnMapping | null>(null)

  const activeSheet = sheetConfigs[activeSheetIndex] ?? null
  const excelData = activeSheet?.excelData ?? { headers: [], rows: [] }
  const rawData = activeSheet?.rawData ?? []
  const headerIndex = activeSheet?.headerIndex ?? 0
  const columnMapping = activeSheet?.columnMapping ?? { style: null, image: null }
  const hasMultipleSheets = sheetConfigs.length > 1

  const mappingPanelBg = useColorModeValue("white", "gray.800")
  const mappingPanelBorder = useColorModeValue("gray.200", "gray.700")
  const sheetInactiveBg = useColorModeValue("gray.100", "gray.700")
  const sheetInactiveHover = useColorModeValue("gray.200", "gray.600")
  const sheetWarningHover = useColorModeValue("yellow.100", "yellow.400")

  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendToEmail), [sendToEmail])
  const showToast = useCustomToast()

  const updateSheetConfig = useCallback(
    (index: number, transform: (sheet: SheetConfig) => SheetConfig) => {
      setSheetConfigs((prev) => {
        const next = [...prev]
        next[index] = transform(prev[index])
        return next
      })
    },
    [],
  )

  const handleActiveSheetChange = useCallback((index: number) => {
    setActiveSheetIndex(index)
    setActiveMappingField(null)
  }, [])

  const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["style", "image"]

  const headersAreValid = useMemo(
    () => excelData.headers.some((h) => String(h).trim() !== ""),
    [excelData.headers],
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setUploadedFile(file)
      setIsLoading(true)
      setStep("upload")
      try {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: "array" })
        const newConfigs: SheetConfig[] = []

        workbook.SheetNames.forEach((name) => {
          const ws = workbook.Sheets[name]
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as CellValue[][]
          if (json.length === 0) return

          const detectedHeader = detectHeaderRow(json)
          const headers = (json[detectedHeader] as any[]).map(String)
          const rows = json.slice(detectedHeader + 1) as CellValue[][]

          newConfigs.push({
            name,
            rawData: json,
            headerIndex: detectedHeader,
            excelData: { headers, rows },
            columnMapping: autoMapColumns(headers),
          })
        })

        if (newConfigs.length === 0) throw new Error("Empty file")

        setSheetConfigs(newConfigs)
        setActiveSheetIndex(0)
        setStep("preview")
      } catch {
        showToast("Error", "Failed to read file", "error")
        setUploadedFile(null)
      } finally {
        setIsLoading(false)
        event.target.value = ""
      }
    },
    [showToast],
  )

  const handleHeaderChange = useCallback(
    (idx: number) => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (s) => ({
        ...s,
        headerIndex: idx,
        excelData: {
          headers: s.rawData[idx].map(String),
          rows: s.rawData.slice(idx + 1) as CellValue[][],
        },
        columnMapping: autoMapColumns(s.rawData[idx].map(String)),
      }))
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleColumnMap = useCallback(
    (colIdx: number, field: keyof ColumnMapping) => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (s) => ({
        ...s,
        columnMapping: { ...s.columnMapping, [field]: colIdx },
      }))
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const handleColumnMapFromGrid = useCallback(
    (colIdx: number) => {
      if (activeMappingField) handleColumnMap(colIdx, activeMappingField)
      setActiveMappingField(null)
    },
    [activeMappingField, handleColumnMap],
  )

  const handleClearMapping = useCallback(
    (colIdx: number) => {
      if (!activeSheet) return
      updateSheetConfig(activeSheetIndex, (s) => {
        const newMap = { ...s.columnMapping }
        if (newMap.style === colIdx) newMap.style = null
        if (newMap.image === colIdx) newMap.image = null
        return { ...s, columnMapping: newMap }
      })
    },
    [activeSheet, activeSheetIndex, updateSheetConfig],
  )

  const mappedHighlight = useMemo(() => {
    const set = new Set<number>()
    if (columnMapping.style !== null) set.add(columnMapping.style)
    if (columnMapping.image !== null) set.add(columnMapping.image)
    return set
  }, [columnMapping])

  const selectedCol = activeMappingField ? columnMapping[activeMappingField] : null

  const validation = useMemo(() => {
    const missing = REQUIRED_FIELDS.filter((f) => columnMapping[f] === null)
    return { isValid: missing.length === 0 && excelData.rows.length > 0 && headersAreValid, missing }
  }, [columnMapping, excelData.rows.length, headersAreValid])

  const sheetValidations = useMemo(
    () =>
      sheetConfigs.map((s) => {
        const missing = REQUIRED_FIELDS.filter((f) => s.columnMapping[f] === null)
        return { isValid: missing.length === 0 && s.excelData.rows.length > 0 }
      }),
    [sheetConfigs],
  )

  const activeValid = sheetValidations[activeSheetIndex] ?? { isValid: false }
  const statusIcon = activeValid.isValid ? CheckIcon : WarningIcon
  const statusColor = activeValid.isValid ? "green.400" : "yellow.400"
  const statusText = activeValid.isValid ? "Ready" : "Needs mapping"

  const renderSheetButtons = useCallback(
    (size: "xs" | "sm" = "sm") => (
      <Wrap spacing={2}>
        {sheetConfigs.map((s, i) => {
          const isActive = i === activeSheetIndex
          const valid = sheetValidations[i]?.isValid
          return (
            <WrapItem key={i}>
              <Tooltip label={valid ? "Ready" : "Missing columns"}>
                <Button
                  size={size}
                  variant={isActive ? "solid" : "ghost"}
                  colorScheme={isActive ? "brand" : valid ? "gray" : "yellow"}
                  rightIcon={valid ? <CheckIcon /> : <WarningIcon />}
                  onClick={() => handleActiveSheetChange(i)}
                >
                  {s.name || `Sheet ${i + 1}`}
                </Button>
              </Tooltip>
            </WrapItem>
          )
        })}
      </Wrap>
    ),
    [activeSheetIndex, handleActiveSheetChange, sheetConfigs, sheetValidations],
  )

  const handleSubmit = useCallback(async () => {
    if (!validation.isValid || !sendToEmail || !isEmailValid) return

    setIsLoading(true)
    try {
      for (const [i, sheet] of sheetConfigs.entries()) {
        const m = sheet.columnMapping
        const aoa = [
          ...sheet.rawData.slice(0, sheet.headerIndex),
          sheet.excelData.headers,
          ...sheet.excelData.rows,
        ]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Sheet${i + 1}`)
        const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" })
        const name = `${uploadedFile!.name.replace(/\.[^.]+$/, "")}_crop.xlsx`

        const formData = new FormData()
        formData.append("fileUploadCrop", new File([buffer], name))
        formData.append("header_index", String(sheet.headerIndex + 1))
        formData.append("searchColCrop", indexToColumnLetter(m.style!))
        formData.append("cropColumn", indexToColumnLetter(m.image!))
        formData.append("sendToEmail", sendToEmail)

        const res = await fetch(`${SERVER_URL}/submitCrop`, { method: "POST", body: formData })
        if (!res.ok) throw new Error(await res.text())
      }
      showToast("Success", "All crop jobs submitted!", "success")
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: any) {
      showToast("Error", err.message || "Submission failed", "error")
    } finally {
      setIsLoading(false)
    }
  }, [validation.isValid, sendToEmail, isEmailValid, sheetConfigs, uploadedFile, showToast])

  const isDev = showDevUI()

  return (
    <Container maxW="container.xl" p={4}>
      <VStack spacing={6} align="stretch">
        {onBack && (
          <Button alignSelf="flex-start" variant="ghost" size="sm" leftIcon={<ArrowBackIcon />} onClick={onBack}>
            Back to tools
          </Button>
        )}

        <Box bg={isDev ? "red.50" : undefined} p={isDev ? 3 : 0} borderRadius="md" borderWidth={isDev ? 1 : 0} borderColor={isDev ? "red.200" : undefined}>
          {isDev && (
            <Alert status="warning" mb={4}>
              <AlertIcon />
              <AlertTitle>DEV MODE — Crop Tool (No Brand)</AlertTitle>
            </Alert>
          )}

          {/* Stepper */}
          <HStack justify="space-between" bg="neutral.50" p={2} borderRadius="md" mb={4}>
            <HStack spacing={4}>
              {["Upload", "Header Selection", "Map", "Submit"].map((s, i) => (
                <Text
                  key={s}
                  fontWeight={step === (i === 1 ? "preview" : i === 2 ? "map" : i === 3 ? "submit" : "upload") ? "bold" : "normal"}
                  color={step === (i === 1 ? "preview" : i === 2 ? "map" : i === 3 ? "submit" : "upload") ? "brand.600" : "subtle"}
                  cursor={i < ["upload", "preview", "map", "submit"].indexOf(step) ? "pointer" : "default"}
                  onClick={() => i < ["upload", "preview", "map", "submit"].indexOf(step) && setStep(i === 1 ? "preview" : i === 2 ? "map" : i === 3 ? "submit" : "upload")}
                >
                  {i + 1}. {s}
                </Text>
              ))}
            </HStack>
            {step !== "upload" && (
              <HStack>
                <Button onClick={() => setStep(step === "preview" ? "upload" : step === "map" ? "preview" : "map")} variant="outline" size="sm">
                  Back
                </Button>
                {step !== "submit" && (
                  <Button
                    onClick={() => setStep(step === "preview" ? "map" : "submit")}
                    size="sm"
                    isDisabled={step === "map" && !validation.isValid}
                  >
                    Next
                  </Button>
                )}
                {step === "submit" && (
                  <Button colorScheme="brand" onClick={handleSubmit} isLoading={isLoading} size="sm">
                    Submit
                  </Button>
                )}
              </HStack>
            )}
          </HStack>

          {/* Upload */}
          {step === "upload" && (
            <VStack spacing={4}>
              <Text fontSize="lg" fontWeight="bold">Crop Images — Remove Whitespace</Text>
              <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} p={1} bg="white" />
              {isLoading && <Spinner />}
            </VStack>
          )}

          {/* Preview */}
          {step === "preview" && (
            <VStack spacing={4}>
              {hasMultipleSheets && renderSheetButtons()}
              <HStack>
                <Text>Select Header Row:</Text>
                <Select value={headerIndex} onChange={(e) => handleHeaderChange(Number(e.target.value))} w="150px">
                  {rawData.slice(0, 20).map((_, i) => (
                    <option key={i} value={i}>Row {i + 1}</option>
                  ))}
                </Select>
              </HStack>
              <Box overflowX="auto" borderWidth={1} borderRadius="md" p={2}>
                <Table size="sm">
                  <Tbody>
                    {rawData.slice(0, MAX_PREVIEW_ROWS).map((row, i) => (
                      <Tr key={i} bg={i === headerIndex ? "brand.100" : undefined} cursor="pointer" onClick={() => handleHeaderChange(i)}>
                        {row.map((cell, j) => (
                          <Td key={j} maxW="200px" isTruncated>{getDisplayValue(cell)}</Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </VStack>
          )}

          {/* Map */}
          {step === "map" && (
            <Flex direction={{ base: "column", md: "row" }} gap={6}>
              <VStack w={{ base: "100%", md: "40%" }} spacing={4} align="stretch">
                {hasMultipleSheets && renderSheetButtons()}
                <Tooltip label={statusText}>
                  <HStack><Icon as={statusIcon} color={statusColor} /><Text>{statusText}</Text></HStack>
                </Tooltip>

                {(["style", "image"] as const).map((field) => (
                  <HStack key={field} p={2} borderRadius="md" borderWidth={activeMappingField === field ? 2 : 1} borderColor={activeMappingField === field ? SELECTED_BORDER_COLOR : "transparent"} bg={activeMappingField === field ? SELECTED_BG_SUBTLE : "transparent"} cursor="pointer" onClick={() => setActiveMappingField(field)}>
                    <Text w="180px" fontWeight="semibold">
                      {field === "style" ? "Style # Column" : "Image Column (pictures)"}
                      {field === "image" && <Badge ml={2} colorScheme="purple">REQUIRED</Badge>}
                      :
                    </Text>
                    <Select
                      value={columnMapping[field] ?? ""}
                      onChange={(e) => handleColumnMap(Number(e.target.value), field)}
                      placeholder="Unmapped"
                      flex={1}
                    >
                      <option value="">Unmapped</option>
                      {excelData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Col ${indexToColumnLetter(i)}`}</option>
                      ))}
                    </Select>
                    {columnMapping[field] !== null && (
                      <IconButton aria-label="clear" icon={<CloseIcon />} size="sm" onClick={() => handleClearMapping(columnMapping[field]!)} />
                    )}
                    <Text fontSize="sm" color="subtle">{getColumnPreview(columnMapping[field], excelData.rows)}</Text>
                  </HStack>
                ))}
              </VStack>

              <Box flex={1} overflowX="auto" borderWidth={1} borderRadius="md" p={2}>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      {excelData.headers.map((h, i) => {
                        const mapped = mappedHighlight.has(i)
                        const selected = selectedCol === i
                        return (
                          <Th
                            key={i}
                            bg={selected ? SELECTED_BG_STRONG : mapped ? MAPPED_BG : "neutral.100"}
                            cursor={activeMappingField ? "pointer" : "default"}
                            onClick={() => activeMappingField && handleColumnMapFromGrid(i)}
                          >
                            {h || `Col ${indexToColumnLetter(i)}`}
                          </Th>
                        )
                      })}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {excelData.rows.slice(0, MAX_PREVIEW_ROWS).map((row, i) => (
                      <Tr key={i}>
                        {row.map((cell, j) => (
                          <Td key={j} maxW="200px" isTruncated bg={mappedHighlight.has(j) ? MAPPED_BG : undefined}>
                            {getDisplayValue(cell)}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Flex>
          )}

          {/* Submit */}
          {step === "submit" && (
            <VStack spacing={6}>
              <Box p={4} bg="gray.50" borderRadius="md" w="100%">
                <Text fontWeight="bold" mb={3}>Summary</Text>
                <VStack align="start" spacing={1} fontSize="sm">
                  <Text>File: {uploadedFile?.name}</Text>
                  <Text>Style Column: {columnMapping.style !== null ? indexToColumnLetter(columnMapping.style) : "—"}</Text>
                  <Text color="purple.600" fontWeight="bold">
                    Images from Column: {columnMapping.image !== null ? indexToColumnLetter(columnMapping.image) : "—"}
                  </Text>
                </VStack>
              </Box>
              <Button colorScheme="brand" size="lg" onClick={handleSubmit} isLoading={isLoading}>
                Submit Crop Job
              </Button>
            </VStack>
          )}
        </Box>
      </VStack>
    </Container>
  )
}

export default SubmitCropForm