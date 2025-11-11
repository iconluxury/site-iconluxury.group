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
import useCustomToast from "../hooks/useCustomToast";

interface SubmitImageLinkFormInputs {
  fileUploadLink: FileList;
  header_index: number;
  linkColumn?: string;
  searchColLink: string;
  brandColLink?: string;
  ColorColLink?: string;
  CategoryColLink?: string;
  sendToEmail?: string;
  manualBrand?: string;
  skipDataWarehouse: boolean;
}

const SubmitImageLinkForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubmitImageLinkFormInputs>();
  const showToast = useCustomToast();
  const [fileName, setFileName] = useState("");

  const brandColLink = watch("brandColLink");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName("");
    }
  };

  const onSubmit = async (data: SubmitImageLinkFormInputs) => {
    try {
      const formData = new FormData();
      formData.append("fileUploadLink", data.fileUploadLink[0]);
      formData.append("header_index", data.header_index.toString());
      formData.append("searchColLink", data.searchColLink);
      if (data.linkColumn) formData.append("linkColumn", data.linkColumn);
      if (data.brandColLink) formData.append("brandColLink", data.brandColLink);
      if (data.ColorColLink) formData.append("ColorColLink", data.ColorColLink);
      if (data.CategoryColLink)
        formData.append("CategoryColLink", data.CategoryColLink);
      if (data.sendToEmail) formData.append("sendToEmail", data.sendToEmail);
      if (data.manualBrand) formData.append("manualBrand", data.manualBrand);
      formData.append("skipDataWarehouse", data.skipDataWarehouse.toString());

      // This is a placeholder for the actual API call
      // You will need to replace this with your actual API call logic
      // const response = await YourApiService.submitImageLink(formData);

      // Mocking response for now
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(data);

      showToast(
        "Success",
        "Image link data submitted successfully.",
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
        Submit Image Link
      </Text>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired isInvalid={!!errors.fileUploadLink}>
            <FormLabel>Upload File</FormLabel>
            <Input
              type="file"
              {...register("fileUploadLink", { required: "File is required" })}
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

          <FormControl isRequired isInvalid={!!errors.searchColLink}>
            <FormLabel>Search Column</FormLabel>
            <Input
              {...register("searchColLink", {
                required: "Search column is required",
              })}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Brand Column</FormLabel>
            <Input {...register("brandColLink")} placeholder="e.g., A or MANUAL" />
          </FormControl>

          {brandColLink === "MANUAL" && (
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
            <FormLabel>Link Column</FormLabel>
            <Input {...register("linkColumn")} />
          </FormControl>

          <FormControl>
            <FormLabel>Color Column</FormLabel>
            <Input {...register("ColorColLink")} />
          </FormControl>

          <FormControl>
            <FormLabel>Category Column</FormLabel>
            <Input {...register("CategoryColLink")} />
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

export default SubmitImageLinkForm;
