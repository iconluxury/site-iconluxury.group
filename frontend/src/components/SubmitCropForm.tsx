// components/SubmitCropForm.tsx
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Text,
  VStack,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Spinner,
} from "@chakra-ui/react"
import * as XLSX from "xlsx"
import React, { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import useCustomToast from "../hooks/useCustomToast"
import { showDevUI } from "../utils"

interface SubmitCropFormInputs {
  fileUploadCrop: FileList
}

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://icon5-8005.iconluxury.today"
const ACCEPTED_FILE_TYPES = ".xlsx,.xls"

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

const SubmitCropForm: React.FC = () => {
  const iframeEmail = useIframeEmail()
  const sendToEmail = useMemo(() => iframeEmail?.trim() ?? "", [iframeEmail])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitCropFormInputs>()

  const showToast = useCustomToast()
  const [fileName, setFileName] = useState("")
  const [fileInputKey, setFileInputKey] = useState(0)
  const [step, setStep] = useState<"upload" | "map" | "submit">("upload")
  const [headerRow, setHeaderRow] = useState(5)
  const [searchCol, setSearchCol] = useState("")
  const [brandCol, setBrandCol] = useState("")
  const [cropCol, setCropCol] = useState("A") // DEFAULT TO A — 99.9% of cases
  const [manualBrand, setManualBrand] = useState("")
  const [isManualBrand, setIsManualBrand] = useState(false)

  const fileList = watch("fileUploadCrop")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file) {
      setFileName(file.name)
      setStep("map")
    } else {
      setFileName("")
      setStep("upload")
    }
  }

  const onSubmit = async (data: SubmitCropFormInputs) => {
    if (!data.fileUploadCrop || data.fileUploadCrop.length === 0) {
      showToast("Error", "Please upload a file", "error")
      return
    }

    const file = data.fileUploadCrop[0]
    const formData = new FormData()
    formData.append("fileUploadCrop", file)
    formData.append("header_index", String(headerRow))
    formData.append("searchColCrop", searchCol)
    formData.append("cropColumn", cropCol) // THIS IS THE KEY

    if (isManualBrand && manualBrand.trim()) {
      formData.append("brandColCrop", "MANUAL")
      formData.append("manualBrand", manualBrand.trim())
    } else if (brandCol) {
      formData.append("brandColCrop", brandCol)
    }

    if (sendToEmail) {
      formData.append("sendToEmail", sendToEmail)
    }

    try {
      const response = await fetch(`${API_BASE_URL}/submitCrop`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.detail || result.message || "Submission failed")
      }

      showToast(
        "Success!",
        `Crop job submitted! File ID: ${result.file_id} — Images from column ${cropCol} will be cropped.`,
        "success",
      )

      reset()
      setFileName("")
      setFileInputKey((k) => k + 1)
      setStep("upload")
      setHeaderRow(5)
      setSearchCol("")
      setBrandCol("")
      setCropCol("A")
      setManualBrand("")
      setIsManualBrand(false)
    } catch (err: any) {
      showToast("Error", err.message || "Failed to submit", "error")
    }
  }

  const isDev = showDevUI()

  return (
    <Box p={6} bg={isDev ? "red.50" : "white"} borderRadius="lg" boxShadow="md">
      {isDev && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          <AlertTitle>DEV MODE</AlertTitle>
          <AlertDescription>Crop Tool — Now with Image Column Mapping</AlertDescription>
        </Alert>
      )}

      <Text fontSize="2xl" fontWeight="bold" mb={6} textAlign="center">
        Crop Images — Remove Whitespace
      </Text>

      {/* Step Indicator */}
      <HStack justify="center" mb={6} spacing={8}>
        {["Upload", "Map Columns", "Submit"].map((s, i) => (
          <HStack key={s} spacing={3}>
            <Badge colorScheme={step === (i === 0 ? "upload" : i === 1 ? "map" : "submit") ? "brand" : "gray"}>
              {i + 1}
            </Badge>
            <Text fontWeight={step === (i === 0 ? "upload" : i === 1 ? "map" : "submit") ? "bold" : "normal"}>
              {s}
            </Text>
            {i < 2 && <Box w={12} h="1px" bg="gray.300" />}
          </HStack>
        ))}
      </HStack>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Upload Step */}
        {step === "upload" && (
          <VStack spacing={5}>
            <FormControl isRequired isInvalid={!!errors.fileUploadCrop}>
              <FormLabel>Upload Excel File</FormLabel>
              <Input
                key={fileInputKey}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                {...register("fileUploadCrop", { required: "File required" })}
                onChange={handleFileChange}
                p={2}
              />
            </FormControl>
            {fileName && (
              <Text color="green.600" fontWeight="medium">
                Selected: {fileName}
              </Text>
            )}
          </VStack>
        )}

        {/* Map Step */}
        {step === "map" && (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <FormLabel>Header Row</FormLabel>
              <Input
                type="number"
                value={headerRow}
                onChange={(e) => setHeaderRow(Number(e.target.value))}
                min={1}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Style # Column</FormLabel>
              <Select value={searchCol} onChange={(e) => setSearchCol(e.target.value)} placeholder="Select column">
                {["A","B","C","D","E","F","G","H","I","J"].map((c) => (
                  <option key={c} value={c}>
                    Column {c} {c === "D" ? "(Most Common)" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Brand Column (Optional)</FormLabel>
              <Select
                value={isManualBrand ? "MANUAL" : brandCol}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "MANUAL") {
                    setIsManualBrand(true)
                    setBrandCol("")
                  } else {
                    setIsManualBrand(false)
                    setBrandCol(val)
                  }
                }}
                placeholder="Select or use MANUAL"
              >
                <option value="MANUAL">MANUAL — Enter Below</option>
                {["A","B","C","D","E"].map((c) => (
                  <option key={c} value={c}>
                    Column {c} {c === "B" ? "(Most Common)" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>

            {isManualBrand && (
              <FormControl>
                <FormLabel>Manual Brand Name</FormLabel>
                <Input
                  value={manualBrand}
                  onChange={(e) => setManualBrand(e.target.value)}
                  placeholder="e.g. ICON LUXURY"
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>
                Image Column (where pictures are pasted)
                <Badge ml={2} colorScheme="purple">CRITICAL</Badge>
              </FormLabel>
              <Select value={cropCol} onChange={(e) => setCropCol(e.target.value)}>
                {["A","B","C","D","E","F","G","H","I","J"].map((c) => (
                  <option key={c} value={c}>
                    Column {c} {c === "A" ? "(99% of files)" : ""}
                  </option>
                ))}
              </Select>
              <Text fontSize="sm" color="gray.600" mt={2}>
                This is the column with actual images pasted in Excel. Almost always Column A.
              </Text>
            </FormControl>

            <HStack justify="space-between">
              <Button onClick={() => setStep("upload")} variant="outline">
                Back
              </Button>
              <Button
                colorScheme="brand"
                onClick={() => setStep("submit")}
                isDisabled={!searchCol || !cropCol}
              >
                Next: Review & Submit
              </Button>
            </HStack>
          </VStack>
        )}

        {/* Submit Step */}
        {step === "submit" && (
          <VStack spacing={6} align="stretch">
            <Box p={4} bg="gray.50" borderRadius="md">
              <Text fontWeight="bold" mb={3}>Job Summary</Text>
              <VStack align="start" spacing={2} fontSize="sm">
                <Text><strong>File:</strong> {fileName}</Text>
                <Text><strong>Header Row:</strong> {headerRow}</Text>
                <Text><strong>Style Column:</strong> {searchCol}</Text>
                <Text>
                  <strong>Brand:</strong> {isManualBrand ? manualBrand || "MANUAL" : brandCol || "None"}
                </Text>
                <Text color="purple.600" fontWeight="bold">
                  Images will be cropped from Column {cropCol}
                </Text>
              </VStack>
            </Box>

            <HStack justify="space-between">
              <Button onClick={() => setStep("map")} variant="outline">
                Back
              </Button>
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                isLoading={isSubmitting}
              >
                {isSubmitting ? <Spinner size="sm" /> : "Submit Crop Job"}
              </Button>
            </HStack>
          </VStack>
        )}
      </form>
    </Box>
  )
}

export default SubmitCropForm