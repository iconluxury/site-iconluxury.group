import { CloseIcon } from "@chakra-ui/icons"
import {
  Box,
  Button,
  FormControl,
  HStack,
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
} from "@chakra-ui/react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import useCustomToast from "../hooks/useCustomToast"

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://icon5-8005.iconluxury.today"
const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.csv"
const MAX_PREVIEW_ROWS = 20
const MAX_FILE_SIZE_MB = 50

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = {
  linkColumn: number | null
  searchColLink: number | null
}
type ToastFunction = (
  title: string,
  description: string,
  status: "error" | "warning" | "success",
) => void

const SELECTED_BG_STRONG = "brand.100"
const SELECTED_BG_SUBTLE = "brand.50"
const MAPPED_BG = "neutral.100"
const SELECTED_BORDER_COLOR = "brand.600"

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
  let bestIndex = 0
  let maxNonEmptyCells = 0
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map((cell) => String(cell ?? "").trim())
      .filter((value) => value !== "") as string[]
    const nonEmptyCount = rowValues.length
    if (nonEmptyCount > maxNonEmptyCells) {
      bestIndex = i
      maxNonEmptyCells = nonEmptyCount
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

const SubmitImageLinkForm: React.FC = () => {
  const [step, setStep] = useState<"upload" | "map" | "submit">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    rows: [],
  })
  const [rawData, setRawData] = useState<CellValue[][]>([])
  const [headerIndex, setHeaderIndex] = useState<number>(0)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    linkColumn: null,
    searchColLink: null,
  })
  const [activeMappingField, setActiveMappingField] = useState<
    "linkColumn" | "searchColLink" | null
  >(null)

  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])
  const showToast: ToastFunction = useCustomToast()

  const mappingPanelBg = useColorModeValue("white", "gray.800")
  const mappingPanelBorder = useColorModeValue("gray.200", "gray.700")

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
        return
      }
      if (
        ![
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ].includes(selectedFile.type)
      ) {
        showToast(
          "File Error",
          "Please upload an Excel file (.xlsx, .xls) or CSV file",
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
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!worksheet) throw new Error("No worksheet found")
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: true,
          defval: "",
        }) as CellValue[][]
        if (jsonData.length === 0) throw new Error("Excel file is empty")

        const detectedHeaderIndex = detectHeaderRow(jsonData)
        setRawData(jsonData)
        setHeaderIndex(detectedHeaderIndex)
        const headers = jsonData[detectedHeaderIndex].map((cell) =>
          String(cell ?? ""),
        )
        const rows = jsonData.slice(detectedHeaderIndex + 1)
        setExcelData({ headers, rows })
        setStep("map")
      } catch (error) {
        showToast(
          "File Processing Error",
          error instanceof Error ? error.message : "Unknown error",
          "error",
        )
        setUploadedFile(null)
      } finally {
        setIsLoading(false)
        event.target.value = ""
      }
    },
    [showToast],
  )

  const handleColumnMap = useCallback((index: number, field: string) => {
    if (field && !["linkColumn", "searchColLink"].includes(field)) return
    setColumnMapping((prev) => {
      const newMapping = { ...prev }
      // Unmap any field currently using this index
      for (const key of Object.keys(newMapping) as (keyof ColumnMapping)[]) {
        if (newMapping[key] === index) {
          newMapping[key] = null
        }
      }
      // Set the new mapping
      if (field) {
        newMapping[field as keyof ColumnMapping] = index
      }
      return newMapping
    })
  }, [])

  const handleColumnMapFromGrid = useCallback(
    (index: number) => {
      if (activeMappingField === null) return
      handleColumnMap(index, activeMappingField)
      setActiveMappingField(null)
    },
    [activeMappingField, handleColumnMap],
  )

  const handleClearMapping = useCallback((index: number) => {
    setColumnMapping((prev) => {
      const newMapping = { ...prev }
      for (const key of Object.keys(newMapping) as (keyof ColumnMapping)[]) {
        if (newMapping[key] === index) {
          newMapping[key] = null
        }
      }
      return newMapping
    })
  }, [])

  const mappedColumns = useMemo(() => {
    return new Set(
      Object.values(columnMapping).filter(
        (value): value is number => typeof value === "number",
      ),
    )
  }, [columnMapping])

  const selectedColumnIndex =
    activeMappingField !== null ? columnMapping[activeMappingField] : null

  const headersAreValid = useMemo(
    () => excelData.headers.some((header) => String(header).trim() !== ""),
    [excelData.headers],
  )

  const validateForm = useMemo(() => {
    const missing: string[] = []
    if (columnMapping.searchColLink === null) missing.push("searchColLink")
    if (columnMapping.linkColumn === null) missing.push("linkColumn")
    return {
      isValid:
        missing.length === 0 &&
        uploadedFile &&
        excelData.rows.length > 0 &&
        headersAreValid,
      missing,
    }
  }, [columnMapping, uploadedFile, excelData.rows.length, headersAreValid])

  const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast(
        "Validation Error",
        `Missing required columns: ${validateForm.missing.join(", ")}`,
        "warning",
      )
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

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("fileUploadLink", uploadedFile!)
      formData.append("header_index", String(headerIndex + 1))
      formData.append(
        "searchColLink",
        indexToColumnLetter(columnMapping.searchColLink!),
      )
      formData.append(
        "linkColumn",
        indexToColumnLetter(columnMapping.linkColumn!),
      )
      formData.append("sendToEmail", sendToEmail)

      const response = await fetch(`${API_BASE_URL}/submitLink`, {
        method: "POST",
        body: formData,
      })

      let payload: any = null
      try {
        payload = await response.clone().json()
      } catch (error) {
        payload = null
      }

      if (!response.ok) {
        const errorMessage =
          payload?.detail ||
          payload?.message ||
          (await response.text()) ||
          "There was an error submitting the form."
        throw new Error(errorMessage)
      }

      showToast(
        "Success",
        payload?.message ?? "Image link data submitted successfully.",
        "success",
      )
      // Reset form
      setStep("upload")
      setUploadedFile(null)
      setExcelData({ headers: [], rows: [] })
      setRawData([])
      setColumnMapping({ linkColumn: null, searchColLink: null })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "There was an error submitting the form."
      showToast("Error", message, "error")
    } finally {
      setIsLoading(false)
    }
  }, [
    validateForm,
    sendToEmail,
    isEmailValid,
    uploadedFile,
    headerIndex,
    columnMapping,
    showToast,
  ])

  return (
    <Box p={4}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Submit Image Link
      </Text>
      <VStack spacing={6} align="stretch">
        <HStack
          justify="space-between"
          bg="neutral.50"
          p={2}
          borderRadius="md"
          align="center"
        >
          <HStack spacing={4}>
            {["Upload", "Map", "Submit"].map((s, i) => (
              <Text
                key={s}
                fontWeight={step === s.toLowerCase() ? "bold" : "normal"}
                color={step === s.toLowerCase() ? "brand.600" : "subtle"}
                cursor={
                  i < ["upload", "map", "submit"].indexOf(step)
                    ? "pointer"
                    : "default"
                }
                onClick={() => {
                  if (i < ["upload", "map", "submit"].indexOf(step))
                    setStep(s.toLowerCase() as typeof step)
                }}
              >
                {i + 1}. {s}
              </Text>
            ))}
          </HStack>
          {step !== "upload" && (
            <HStack>
              {step !== "map" ? (
                <Button
                  onClick={() => setStep("map")}
                  variant="outline"
                  size="sm"
                >
                  Back
                </Button>
              ) : (
                <Button
                  onClick={() => setStep("upload")}
                  variant="outline"
                  size="sm"
                >
                  Back
                </Button>
              )}
              {step === "map" && (
                <Button
                  onClick={() => setStep("submit")}
                  size="sm"
                  isDisabled={!validateForm.isValid}
                >
                  Next: Submit
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

        {step === "upload" && (
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Upload Excel File
            </Text>
            <FormControl>
              <Tooltip label="Upload an Excel file (.xlsx, .xls, .csv) up to 50MB">
                <Input
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
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

        {step === "map" && (
          <Box>
            <VStack
              gap={4}
              align="stretch"
              bg="transparent"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor={mappingPanelBorder}
              mb={4}
            >
              {!validateForm.isValid && (
                <Text color="red.500" fontSize="sm" fontWeight="medium">
                  Missing required columns: {validateForm.missing.join(", ")}.
                  Please map all required columns.
                </Text>
              )}
              {!headersAreValid && (
                <Text color="red.500" fontSize="sm" fontWeight="medium">
                  Selected header row is empty. Please re-upload a valid file.
                </Text>
              )}
              <Text fontSize="sm" color="subtle">
                Select a field below, then click a column in the preview grid to
                map it.
              </Text>
              <Text fontWeight="bold">Required Columns</Text>
              {(["searchColLink", "linkColumn"] as const).map((field) => (
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
                  <Text w="120px" fontWeight="semibold">
                    {field === "searchColLink"
                      ? "Search Column"
                      : "Link Column"}
                    :
                  </Text>
                  <Tooltip
                    label={`Select Excel column for ${
                      field === "searchColLink" ? "Search" : "Link"
                    }`}
                  >
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
                      aria-label={`Map ${field} column`}
                      flex="1"
                    >
                      <option value="">Unmapped</option>
                      {excelData.headers.map((header, index) => (
                        <option
                          key={index}
                          value={index}
                          disabled={
                            mappedColumns.has(index) &&
                            columnMapping[field] !== index
                          }
                        >
                          {header || `Column ${indexToColumnLetter(index)}`}
                        </option>
                      ))}
                    </Select>
                  </Tooltip>
                  {columnMapping[field] !== null && (
                    <Tooltip label="Clear mapping">
                      <IconButton
                        aria-label={`Clear ${field} mapping`}
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
              maxH="60vh"
            >
              <Table size="sm">
                <Thead>
                  <Tr>
                    {excelData.headers.map((header, index) => {
                      const isMapped = mappedColumns.has(index)
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
                          const isSelectedColumn =
                            selectedColumnIndex === cellIndex
                          const isMappedColumn = mappedColumns.has(cellIndex)
                          const bgColor = isSelectedColumn
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
          </Box>
        )}

        {step === "submit" && (
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Review and Submit
            </Text>
            <Text>
              <strong>File:</strong> {uploadedFile?.name}
            </Text>
            <Text>
              <strong>Rows:</strong> {excelData.rows.length}
            </Text>
            <Text>
              <strong>Send to:</strong> {sendToEmail || "No email detected"}
            </Text>
            {!isEmailValid && sendToEmail && (
              <Text fontSize="sm" color="red.500">
                The email supplied via the URL is invalid.
              </Text>
            )}
            {!sendToEmail && (
              <Text fontSize="sm" color="red.500">
                No email parameter detected. Add ?sendToEmail=example@domain.com
                to the iframe URL.
              </Text>
            )}
            <Text fontWeight="bold" mt={4}>
              Mapped Columns:
            </Text>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Field</Th>
                  <Th>Column</Th>
                  <Th>Preview</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Search Column</Td>
                  <Td>
                    {columnMapping.searchColLink !== null
                      ? excelData.headers[columnMapping.searchColLink] ||
                        `Column ${indexToColumnLetter(
                          columnMapping.searchColLink,
                        )}`
                      : "Not mapped"}
                  </Td>
                  <Td>
                    {getColumnPreview(
                      columnMapping.searchColLink,
                      excelData.rows,
                    )}
                  </Td>
                </Tr>
                <Tr>
                  <Td>Link Column</Td>
                  <Td>
                    {columnMapping.linkColumn !== null
                      ? excelData.headers[columnMapping.linkColumn] ||
                        `Column ${indexToColumnLetter(
                          columnMapping.linkColumn,
                        )}`
                      : "Not mapped"}
                  </Td>
                  <Td>
                    {getColumnPreview(columnMapping.linkColumn, excelData.rows)}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </VStack>
        )}
      </VStack>
    </Box>
  )
}

export default SubmitImageLinkForm
