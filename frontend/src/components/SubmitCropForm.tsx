import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import useCustomToast from "../hooks/useCustomToast"

interface SubmitCropFormInputs {
  fileUploadCrop: FileList
  header_index: number
  cropColumn?: string
  searchColCrop: string
  brandColCrop?: string
  ColorColCrop?: string
  CategoryColCrop?: string
  sendToEmail?: string
  manualBrand?: string
  skipDataWarehouse: boolean
}

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://icon5-8005.iconluxury.today"
const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.csv"

const normalizeColumn = (value?: string | null) =>
  value ? value.trim().toUpperCase() : ""

const appendColumnIfPresent = (
  formData: FormData,
  key: string,
  value?: string,
) => {
  const normalized = normalizeColumn(value)
  if (normalized) {
    formData.append(key, normalized)
  }
}

const SubmitCropForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitCropFormInputs>({
    defaultValues: {
      header_index: 1,
      skipDataWarehouse: false,
    },
  })
  const showToast = useCustomToast()
  const [fileName, setFileName] = useState("")
  const [fileInputKey, setFileInputKey] = useState(0)

  const brandColCrop = watch("brandColCrop")
  const isManualBrand = useMemo(
    () => normalizeColumn(brandColCrop) === "MANUAL",
    [brandColCrop],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name)
    } else {
      setFileName("")
    }
  }

  const onSubmit = async (data: SubmitCropFormInputs) => {
    try {
      if (!data.fileUploadCrop || data.fileUploadCrop.length === 0) {
        showToast("Validation Error", "Please upload a file.", "error")
        return
      }
      const file = data.fileUploadCrop[0]
      if (!(file instanceof File)) {
        showToast("Validation Error", "Invalid file selected.", "error")
        return
      }

      if (data.header_index < 1 || Number.isNaN(data.header_index)) {
        showToast(
          "Validation Error",
          "Header index must be greater than or equal to 1.",
          "error",
        )
        return
      }

      const searchColumn = normalizeColumn(data.searchColCrop)
      if (!searchColumn) {
        showToast("Validation Error", "Search column is required.", "error")
        return
      }

      if (isManualBrand && !data.manualBrand?.trim()) {
        showToast(
          "Validation Error",
          "Manual brand is required when Brand Column is MANUAL.",
          "error",
        )
        return
      }

      const formData = new FormData()
      formData.append("fileUploadCrop", file)
      formData.append("header_index", data.header_index.toString())
      formData.append("searchColCrop", searchColumn)
      appendColumnIfPresent(formData, "cropColumn", data.cropColumn)

      const brandColumnNormalized = normalizeColumn(data.brandColCrop)
      if (brandColumnNormalized) {
        formData.append("brandColCrop", brandColumnNormalized)
      }
      if (isManualBrand && data.manualBrand?.trim()) {
        formData.set("brandColCrop", "MANUAL")
        formData.append("manualBrand", data.manualBrand.trim())
      }

      appendColumnIfPresent(formData, "ColorColCrop", data.ColorColCrop)
      appendColumnIfPresent(formData, "CategoryColCrop", data.CategoryColCrop)

      if (data.sendToEmail?.trim()) {
        formData.append("sendToEmail", data.sendToEmail.trim())
      }

      formData.append(
        "skipDataWarehouse",
        String(Boolean(data.skipDataWarehouse)),
      )

      const response = await fetch(`${API_BASE_URL}/submitCrop`, {
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
        payload?.message ?? "Crop data submitted successfully.",
        "success",
      )
      reset({
        header_index: 1,
        searchColCrop: "",
        cropColumn: "",
        brandColCrop: "",
        ColorColCrop: "",
        CategoryColCrop: "",
        sendToEmail: "",
        manualBrand: "",
        skipDataWarehouse: false,
      })
      setFileName("")
      setFileInputKey((prev) => prev + 1)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "There was an error submitting the form."
      showToast("Error", message, "error")
    }
  }

  return (
    <Box p={4}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Submit Crop
      </Text>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired isInvalid={!!errors.fileUploadCrop}>
            <FormLabel>Upload File</FormLabel>
            {(() => {
              const fileInputRegister = register("fileUploadCrop", {
                required: "File is required",
              })
              return (
                <Input
                  key={fileInputKey}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  p={1}
                  {...fileInputRegister}
                  onChange={(event) => {
                    fileInputRegister.onChange(event)
                    handleFileChange(event)
                  }}
                />
              )
            })()}
            {fileName && <Text mt={2}>Selected file: {fileName}</Text>}
          </FormControl>

          <FormControl isRequired isInvalid={!!errors.header_index}>
            <FormLabel>Header Index</FormLabel>
            <NumberInput min={1}>
              <NumberInputField
                {...register("header_index", {
                  required: "Header index is required",
                  valueAsNumber: true,
                  min: { value: 1, message: "Header index must be >= 1" },
                })}
              />
            </NumberInput>
          </FormControl>

          <FormControl isRequired isInvalid={!!errors.searchColCrop}>
            <FormLabel>Search Column</FormLabel>
            <Input
              {...register("searchColCrop", {
                required: "Search column is required",
              })}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Brand Column</FormLabel>
            <Input
              {...register("brandColCrop")}
              placeholder="e.g., A or MANUAL"
            />
          </FormControl>

          {isManualBrand && (
            <FormControl isRequired isInvalid={!!errors.manualBrand}>
              <FormLabel>Manual Brand</FormLabel>
              <Input
                {...register("manualBrand", {
                  required:
                    "Manual brand is required when Brand Column is MANUAL",
                })}
              />
            </FormControl>
          )}

          <FormControl>
            <FormLabel>Crop Column</FormLabel>
            <Input {...register("cropColumn")} />
          </FormControl>

          <FormControl>
            <FormLabel>Color Column</FormLabel>
            <Input {...register("ColorColCrop")} />
          </FormControl>

          <FormControl>
            <FormLabel>Category Column</FormLabel>
            <Input {...register("CategoryColCrop")} />
          </FormControl>

          <FormControl>
            <FormLabel>Send To Email</FormLabel>
            <Input type="email" {...register("sendToEmail")} />
          </FormControl>

          <FormControl>
            <Checkbox {...register("skipDataWarehouse")}>
              Skip Data Warehouse
            </Checkbox>
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSubmitting}
            mt={4}
          >
            Submit
          </Button>
        </VStack>
      </form>
    </Box>
  )
}

export default SubmitCropForm
