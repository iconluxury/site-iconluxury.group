import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Text,
  VStack,
  Tooltip,
} from "@chakra-ui/react";
import * as XLSX from "xlsx";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import useCustomToast from "../hooks/useCustomToast";

interface SubmitCropFormInputs {
  fileUploadCrop: FileList;
  header_index: number;
  searchColCrop: string;
}

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://icon5-8005.iconluxury.today";
const ACCEPTED_FILE_TYPES = ".xlsx,.xls";

const normalizeColumn = (value?: string | null) =>
  value ? value.trim().toUpperCase() : "";

const SubmitCropForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubmitCropFormInputs>({
    defaultValues: {
      header_index: 1,
      searchColCrop: "",
    },
  });
  const showToast = useCustomToast();
  const [fileName, setFileName] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [step, setStep] = useState<"upload" | "submit">("upload");
  const fileList = watch("fileUploadCrop");
  const [recordCount, setRecordCount] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setFileName(file.name);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        setRecordCount(Array.isArray(rows) ? rows.length : null);
      } catch {
        setRecordCount(null);
      }
      // Auto-advance to submit step after selecting a file for consistent UX
      setStep("submit");
    } else {
      setFileName("");
      setRecordCount(null);
    }
  };

  const onSubmit = async (data: SubmitCropFormInputs) => {
    try {
      if (!data.fileUploadCrop || data.fileUploadCrop.length === 0) {
        showToast("Validation Error", "Please upload a file.", "error");
        return;
      }
      const file = data.fileUploadCrop[0];
      if (!(file instanceof File)) {
        showToast("Validation Error", "Invalid file selected.", "error");
        return;
      }

      // Derive a reasonable title from the file name (without extension)
      const title = file.name.replace(/\.[^.]+$/i, "");

      const formData = new FormData();
      formData.append("fileUploadCrop", file);
      // Provide a safe default header index for compatibility
      formData.append("header_index", "1");
  // Keep sending title for backend compatibility, though it's no longer shown in the UI
  formData.append("title", title);

      const response = await fetch(`${API_BASE_URL}/submitCrop`, {
        method: "POST",
        body: formData,
      });

      let payload: any = null;
      try {
        payload = await response.clone().json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const errorMessage =
          payload?.detail ||
          payload?.message ||
          (await response.text()) ||
          "There was an error submitting the form.";
        throw new Error(errorMessage);
      }

      showToast(
        "Success",
        payload?.message ?? "Crop data submitted successfully.",
        "success",
      );
      reset({ header_index: 1, searchColCrop: "" });
      setFileName("");
      setFileInputKey((prev) => prev + 1);
      setStep("upload");
      setRecordCount(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "There was an error submitting the form.";
      showToast("Error", message, "error");
    }
  };

  return (
    <Box p={4}>

      {/* Stepper - keep consistent with other tools */}
      <HStack justify="space-between" bg="neutral.50" p={2} borderRadius="md" align="center" mb={2}>
        <HStack spacing={4}>
          {(["Upload", "Submit"] as const).map((label, i) => (
            <Text
              key={label}
              fontWeight={step === label.toLowerCase() ? "bold" : "normal"}
              color={step === label.toLowerCase() ? "brand.600" : "subtle"}
              cursor={i < ["upload", "submit"].indexOf(step) ? "pointer" : "default"}
              onClick={() => {
                if (i < ["upload", "submit"].indexOf(step)) setStep(label.toLowerCase() as typeof step)
              }}
            >
              {i + 1}. {label}
            </Text>
          ))}
        </HStack>
        {step !== "upload" && (
          <HStack>
            <Button onClick={() => setStep("upload")} variant="outline" size="sm">
              Back
            </Button>
            {step !== "submit" && (
              <Button size="sm" onClick={() => setStep("submit")} isDisabled={!fileList || fileList.length === 0}>
                Next: Submit
              </Button>
            )}
            {step === "submit" && (
              <Button type="submit" form="crop-submit-form" colorScheme="brand" size="sm" isLoading={isSubmitting}>
                Submit
              </Button>
            )}
          </HStack>
        )}
      </HStack>

      {/* Tool title/name in between upload and step bar */}
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Crop Images
      </Text>

      {/* Upload */}
      {step === "upload" && (
        <VStack spacing={4} align="stretch">
          <FormControl isRequired isInvalid={!!errors.fileUploadCrop}>
            <FormLabel>Upload File</FormLabel>
            {(() => {
              const fileInputRegister = register("fileUploadCrop", {
                required: "File is required",
              });
              return (
                <Tooltip label="Upload an Excel file (.xlsx or .xls)">
                  <Input
                    key={fileInputKey}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    p={1}
                    bg="white"
                    borderColor="border"
                    aria-label="Upload Excel file"
                    {...fileInputRegister}
                    onChange={(event) => {
                      fileInputRegister.onChange(event);
                      handleFileChange(event);
                    }}
                  />
                </Tooltip>
              );
            })()}
            {fileName && <Text mt={2}>Selected file: {fileName}</Text>}
          </FormControl>
        </VStack>
      )}

      {/* Submit */}
      {step === "submit" && (
        <form id="crop-submit-form" onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={2} align="stretch">
            <Text fontWeight="semibold">Ready to submit</Text>
            <Text fontSize="sm" color="subtle">This will submit your file for cropping.</Text>
            <Box borderWidth="1px" borderRadius="md" p={3} bg="white" borderColor="gray.200">
              <VStack spacing={1} align="start">
                <Text><strong>File:</strong> {fileName || "(none)"}</Text>
                {recordCount !== null && (
                  <Text><strong>Rows:</strong> {recordCount}</Text>
                )}
              </VStack>
            </Box>
            <HStack justify="space-between" mt={2}>
              <Button variant="outline" onClick={() => setStep("upload")} size="sm">
                Back
              </Button>
              {/* Submit button is also available in the stepper header */}
            </HStack>
          </VStack>
        </form>
      )}
    </Box>
  );
};

export default SubmitCropForm;
