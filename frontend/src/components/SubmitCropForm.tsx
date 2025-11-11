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
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { UsersService } from "../client";
import useCustomToast from "../hooks/useCustomToast";

interface SubmitCropFormInputs {
  fileUploadCrop: FileList;
  header_index: number;
  cropColumn?: string;
  searchColCrop: string;
  brandColCrop?: string;
  ColorColCrop?: string;
  CategoryColCrop?: string;
  sendToEmail?: string;
  manualBrand?: string;
  skipDataWarehouse: boolean;
}

const SubmitCropForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitCropFormInputs>();
  const showToast = useCustomToast();
  const [fileName, setFileName] = useState("");

  const brandColCrop = watch("brandColCrop");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName("");
    }
  };

  const onSubmit = async (data: SubmitCropFormInputs) => {
    try {
      const formData = new FormData();
      formData.append("fileUploadCrop", data.fileUploadCrop[0]);
      formData.append("header_index", data.header_index.toString());
      formData.append("searchColCrop", data.searchColCrop);
      if (data.cropColumn) formData.append("cropColumn", data.cropColumn);
      if (data.brandColCrop) formData.append("brandColCrop", data.brandColCrop);
      if (data.ColorColCrop) formData.append("ColorColCrop", data.ColorColCrop);
      if (data.CategoryColCrop)
        formData.append("CategoryColCrop", data.CategoryColCrop);
      if (data.sendToEmail) formData.append("sendToEmail", data.sendToEmail);
      if (data.manualBrand) formData.append("manualBrand", data.manualBrand);
      formData.append("skipDataWarehouse", data.skipDataWarehouse.toString());

      // This is a placeholder for the actual API call
      // You will need to replace this with your actual API call logic
      // For example, using UsersService or another service client.
      // const response = await YourApiService.submitCrop(formData);

      // Mocking response for now
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(data);

      showToast(
        "Success",
        "Crop data submitted successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        "Error",
        "There was an error submitting the form.",
        "error"
      );
    }
  };

  return (
    <Box p={4}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Submit Crop
      </Text>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired isInvalid={!!errors.fileUploadCrop}>
            <FormLabel>Upload File</FormLabel>
            <Input
              type="file"
              {...register("fileUploadCrop", { required: "File is required" })}
              onChange={handleFileChange}
              p={1}
            />
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
            <Input {...register("brandColCrop")} placeholder="e.g., A or MANUAL" />
          </FormControl>

          {brandColCrop === "MANUAL" && (
            <FormControl isRequired isInvalid={!!errors.manualBrand}>
              <FormLabel>Manual Brand</FormLabel>
              <Input
                {...register("manualBrand", {
                  required: "Manual brand is required when Brand Column is MANUAL",
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
  );
};

export default SubmitCropForm;
