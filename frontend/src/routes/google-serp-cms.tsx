import React, { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Text,
  Button,
  VStack,
  HStack,
  Box,
  Input,
  FormControl,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Select,
  Spinner,
  Tooltip,
  Badge,
  Checkbox,
  IconButton,
  FormLabel,
  Card,
  CardBody,
  CardHeader,
  Icon,
  SimpleGrid,
} from '@chakra-ui/react';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { FaWarehouse } from 'react-icons/fa';
import { createFileRoute } from '@tanstack/react-router';
import * as XLSX from 'xlsx';
import useCustomToast from '../hooks/useCustomToast';

// Shared Constants and Types
type ColumnType = 'style' | 'brand' | 'category' | 'colorName' | 'msrp';
const SERVER_URL = 'https://external.iconluxury.group';
const MAX_PREVIEW_ROWS = 20;
const MAX_FILE_SIZE_MB = 50;

type CellValue = string | number | boolean | null;
type ExcelData = { headers: string[]; rows: CellValue[][] };
type ColumnMapping = Record<ColumnType | 'readImage' | 'imageAdd', number | null>;
type ToastFunction = (title: string, description: string, status: 'error' | 'warning' | 'success') => void;

// Shared Helper Functions
const getDisplayValue = (value: any): string => {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') {
    if (value.error) return value.error;
    if (value.result !== undefined) return getDisplayValue(value.result);
    if (value.text) return value.text;
    if (value.link) return value.text || value.link;
    return JSON.stringify(value);
  }
  return String(value);
};

const indexToColumnLetter = (index: number): string => {
  let column = '';
  let temp = index;
  while (temp >= 0) {
    column = String.fromCharCode((temp % 26) + 65) + column;
    temp = Math.floor(temp / 26) - 1;
  }
  return column;
};

const detectHeaderRow = (rows: CellValue[][]): number => {
  const patterns = {
    style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
  };
  let bestIndex = 0;
  let maxNonEmptyCells = 0;
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map(cell => String(cell ?? '').trim())
      .filter(value => value !== '') as string[];
    const nonEmptyCount = rowValues.length;
    if (nonEmptyCount < 2) continue;
    const hasHeaderMatch = rowValues.some((value: string) => Object.values(patterns).some(pattern => pattern.test(value)));
    if (hasHeaderMatch || nonEmptyCount > maxNonEmptyCells) {
      bestIndex = i;
      maxNonEmptyCells = nonEmptyCount;
      if (hasHeaderMatch) break;
    }
  }
  return bestIndex;
};

const getColumnPreview = (columnIndex: number | null, rows: CellValue[][]): string => {
  if (columnIndex === null || columnIndex < 0 || columnIndex >= rows[0]?.length) return 'No values';
  const values = rows
    .map(row => getDisplayValue(row[columnIndex]))
    .filter(value => value.trim() !== '')
    .slice(0, 3);
  return values.length > 0 ? values.join(', ') : 'No values';
};

const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    style: null,
    brand: null,
    category: null,
    colorName: null,
    msrp: null,
    readImage: null,
    imageAdd: null,
  };
  const patterns = {
    style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
    image: /^(image|photo|picture|img|readImage|imageAdd)/i,
  };
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toUpperCase();
    if (!normalizedHeader) return;
    if (patterns.style.test(normalizedHeader) && mapping.style === null) mapping.style = index;
    else if (patterns.brand.test(normalizedHeader) && mapping.brand === null) mapping.brand = index;
    else if (patterns.msrp.test(normalizedHeader) && mapping.msrp === null) mapping.msrp = index;
    else if (patterns.image.test(normalizedHeader) && mapping.readImage === null && mapping.imageAdd === null) {
      mapping.readImage = index;
      mapping.imageAdd = index;
    }
  });
  return mapping;
};

const getColumnMappingEntries = (mapping: ColumnMapping): [keyof ColumnMapping, number | null][] =>
  Object.entries(mapping) as [keyof ColumnMapping, number | null][];

const SELECTED_BG_STRONG = 'brand.100';
const SELECTED_BG_SUBTLE = 'brand.50';
const MAPPED_BG = 'neutral.100';
const SELECTED_BORDER_COLOR = 'brand.600';

// Google Images Form Component
const GoogleImagesForm: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'preview' | 'map' | 'submit'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] });
  const [rawData, setRawData] = useState<CellValue[][]>([]);
  const [headerIndex, setHeaderIndex] = useState<number>(1);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    brand: null,
    category: null,
    colorName: null,
    msrp: null,
    readImage: null,
    imageAdd: null,
  });
  const [activeMappingField, setActiveMappingField] = useState<ColumnType | null>(null);
  const [manualBrand, setManualBrand] = useState('');
  const [isManualBrandApplied, setIsManualBrandApplied] = useState(false);
  const [skipDataWarehouse, setSkipDataWarehouse] = useState(false);
  const [isIconDistro, setIsIconDistro] = useState(false);
  const showToast: ToastFunction = useCustomToast();

  const REQUIRED_COLUMNS: ColumnType[] = ['style', 'brand'];
  const OPTIONAL_COLUMNS: ColumnType[] = ['category', 'colorName', 'msrp'];
  const ALL_COLUMNS: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        showToast('File Error', 'No file selected', 'error');
        return;
      }
      if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
        showToast('File Error', 'Please upload an Excel file (.xlsx or .xls)', 'error');
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast('File Error', `File size exceeds ${MAX_FILE_SIZE_MB}MB`, 'error');
        return;
      }

      setFile(selectedFile);
      setIsLoading(true);
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) throw new Error('No worksheet found');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '' });
        if (jsonData.length === 0) throw new Error('Excel file is empty');

        const detectedHeaderIndex = detectHeaderRow(jsonData as CellValue[][]);
        const patterns = {
          style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
        };
        const firstRow: string[] = (jsonData[0] as any[]).map(cell => String(cell ?? '').trim());
        if (detectedHeaderIndex === 0 && !firstRow.some(cell => patterns.style.test(cell) || patterns.brand.test(cell))) {
          showToast('Warning', 'No clear header row detected; using first row. Please verify in the Header Selection step.', 'warning');
        }
        setRawData(jsonData as CellValue[][]);
        if (jsonData.length <= detectedHeaderIndex || detectedHeaderIndex < 0) {
          showToast('File Error', 'Invalid header row detected. Please select a header row in the Header Selection step.', 'error');
          setHeaderIndex(0);
          setExcelData({ headers: [], rows: [] });
          setFile(null);
          setStep('upload');
          return;
        }
        setHeaderIndex(detectedHeaderIndex);
        const headers = (jsonData[detectedHeaderIndex] as any[]).map(cell => String(cell ?? ''));
        const rows = jsonData.slice(detectedHeaderIndex + 1) as CellValue[][];
        setExcelData({ headers, rows });
        setColumnMapping(autoMapColumns(headers));
        setStep('preview');
      } catch (error) {
        showToast('File Processing Error', error instanceof Error ? error.message : 'Unknown error', 'error');
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (newHeaderIndex < 0 || newHeaderIndex >= rawData.length) return;
      setHeaderIndex(newHeaderIndex);
      const headers = rawData[newHeaderIndex].map(cell => String(cell ?? ''));
      const rows = rawData.slice(newHeaderIndex + 1) as CellValue[][];
      setExcelData({ headers, rows });
      setColumnMapping(autoMapColumns(headers));
      setIsManualBrandApplied(false);
      setManualBrand('');
      setActiveMappingField(null);
    },
    [rawData]
  );

  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (field && !ALL_COLUMNS.includes(field as ColumnType)) return;
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        (Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(key => {
          if (newMapping[key] === index && key !== 'readImage' && key !== 'imageAdd') {
            newMapping[key] = null;
          }
        });
        if (field && ALL_COLUMNS.includes(field as ColumnType)) {
          newMapping[field as keyof ColumnMapping] = index;
          if (field === 'brand') {
            setManualBrand('');
            setIsManualBrandApplied(false);
          }
        }
        return newMapping;
      });
    },
    []
  );

  const handleColumnMapFromGrid = useCallback(
    (index: number) => {
      if (activeMappingField === null) return;
      handleColumnMap(index, activeMappingField);
      setActiveMappingField(null);
    },
    [activeMappingField, handleColumnMap]
  );

  const handleClearMapping = useCallback(
    (index: number) => {
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        (Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(key => {
          if (newMapping[key] === index && key !== 'readImage' && key !== 'imageAdd') {
            newMapping[key] = null;
            if (key === 'brand') {
              setManualBrand('');
              setIsManualBrandApplied(false);
            }
          }
        });
        return newMapping;
      });
    },
    []
  );

  const mappedColumns = useMemo(
    () =>
      new Set(
        (Object.values(columnMapping).filter((value): value is number => typeof value === 'number') as number[])
      ),
    [columnMapping]
  );

  const selectedColumnIndex = activeMappingField !== null ? columnMapping[activeMappingField] : null;

  const applyManualBrand = useCallback(() => {
    if (!manualBrand.trim()) {
      showToast('Manual Brand Error', 'Please enter a non-empty brand name', 'warning');
      return;
    }
    setColumnMapping(prev => ({ ...prev, brand: null }));
    setExcelData(prev => {
      const newHeaders = [...prev.headers, 'BRAND (Manual)'];
      setColumnMapping(prevMapping => ({ ...prevMapping, brand: newHeaders.length - 1 }));
      setIsManualBrandApplied(true);
      return {
        headers: newHeaders,
        rows: prev.rows.map(row => [...row, manualBrand.trim()]),
      };
    });
    showToast('Success', `Manual brand "${manualBrand.trim()}" applied`, 'success');
    setManualBrand('');
    setActiveMappingField(null);
  }, [manualBrand, showToast]);

  const removeManualBrand = useCallback(() => {
    setExcelData(prev => ({
      headers: prev.headers.filter(header => header !== 'BRAND (Manual)'),
      rows: prev.rows.map(row => row.slice(0, -1)),
    }));
    setColumnMapping(prev => ({ ...prev, brand: null }));
    setIsManualBrandApplied(false);
    showToast('Success', 'Manual brand removed', 'success');
    setActiveMappingField(null);
  }, [showToast]);

  const validateForm = useMemo(() => {
    const missing = REQUIRED_COLUMNS.filter(
      col => columnMapping[col] === null && !(col === 'brand' && isManualBrandApplied)
    );
    return {
      isValid: missing.length === 0 && file && excelData.rows.length > 0,
      missing,
    };
  }, [columnMapping, isManualBrandApplied, file, excelData.rows.length]);

const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast('Validation Error', `Missing required columns: ${validateForm.missing.join(', ')}`, 'warning');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    
    formData.append('fileUploadImage', file!);
    formData.append('searchColImage', indexToColumnLetter(columnMapping.style!));
    
    if (isManualBrandApplied) {
      formData.append('brandColImage', 'MANUAL');
      const manualBrandValue = (excelData.rows[0]?.[excelData.headers.length - 1] as string) || '';
      formData.append('manualBrand', manualBrandValue);
    } else if (columnMapping.brand !== null) {
      formData.append('brandColImage', indexToColumnLetter(columnMapping.brand));
    }

    if (columnMapping.readImage || columnMapping.imageAdd) {
      formData.append('imageColumnImage', indexToColumnLetter(columnMapping.readImage || columnMapping.imageAdd!));
    }
    if (columnMapping.colorName !== null) {
      formData.append('ColorColImage', indexToColumnLetter(columnMapping.colorName));
    }
    if (columnMapping.category !== null) {
      formData.append('CategoryColImage', indexToColumnLetter(columnMapping.category));
    }
    formData.append('header_index', String(headerIndex + 1));
    formData.append('sendToEmail', 'nik@luxurymarket.com');
    formData.append('isIconDistro', String(isIconDistro));
    formData.append('skipDataWarehouse', String(skipDataWarehouse)); // Add new parameter

    try {
      const response = await fetch(`${SERVER_URL}/submitImage`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server Response:', response.status, errorText);
        throw new Error(`Server error: ${errorText || response.statusText}`);
      }

      showToast('Success', 'Form submitted successfully', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Fetch Error:', error);
      showToast('Submission Error', error instanceof Error ? error.message : 'Failed to submit', 'error');
      setStep('map');
    } finally {
      setIsLoading(false);
    }
  }, [
    validateForm,
    file,
    columnMapping,
    isManualBrandApplied,
    headerIndex,
    isIconDistro,
    skipDataWarehouse, // Add to dependencies
    showToast,
    excelData,
  ]);

  return (
    <Container maxW="container.xl" p={4} bg="surface" color="text">
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" bg="neutral.50" p={2} borderRadius="md" align="center">
          <HStack spacing={4}>
            {['Upload', 'Header Selection', 'Map', 'Submit'].map((s, i) => (
              <Text
                key={s}
                fontWeight={step === s.toLowerCase().replace('header selection', 'preview') ? 'bold' : 'normal'}
                color={step === s.toLowerCase().replace('header selection', 'preview') ? 'brand.600' : 'subtle'}
                cursor={i < ['upload', 'preview', 'map', 'submit'].indexOf(step) ? 'pointer' : 'default'}
                onClick={() => {
                  if (i < ['upload', 'preview', 'map', 'submit'].indexOf(step)) setStep(s.toLowerCase().replace('header selection', 'preview') as typeof step);
                }}
              >
                {i + 1}. {s}
              </Text>
            ))}
          </HStack>
          {step !== 'upload' && (
            <HStack>
              {step !== 'preview' && (
                <Button
                  onClick={() => setStep(['upload', 'preview', 'map', 'submit'][['upload', 'preview', 'map', 'submit'].indexOf(step) - 1] as typeof step)}
                  variant="outline"
                  size="sm"
                >
                  Back
                </Button>
              )}
              {step === 'preview' && (
                <Button onClick={() => setStep('upload')} variant="outline" size="sm">
                  Back
                </Button>
              )}
              {step !== 'submit' && (
                <Button
                  onClick={() => setStep(['preview', 'map', 'submit'][['upload', 'preview', 'map'].indexOf(step)] as typeof step)}
                  size="sm"
                  isDisabled={step === 'map' && !validateForm.isValid}
                >
                  Next: {['Header Selection', 'Map', 'Submit'][['upload', 'preview', 'map'].indexOf(step)]}
                </Button>
              )}
              {step === 'submit' && (
                <Button colorScheme="brand" onClick={handleSubmit} isLoading={isLoading} size="sm">
                  Submit
                </Button>
              )}
            </HStack>
          )}
        </HStack>

        {step === 'upload' && (
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">Upload Excel File for Google Images Scrape</Text>
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

        {step === 'preview' && (
  <VStack spacing={4} align="stretch">
    <HStack>
      <Text>Select Header Row:</Text>
      <Select
        value={headerIndex}
        onChange={e => handleHeaderChange(Number(e.target.value))}
        w="150px"
        aria-label="Select header row"
      >
        {rawData.slice(0, 20).map((_, index) => (
          <option key={index} value={index}>
            Row {index + 1} {index === headerIndex ? '(Selected)' : ''}
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
              bg={rowIndex === headerIndex ? 'primary.100' : undefined}
              fontWeight={rowIndex === headerIndex ? 'bold' : 'normal'}
              cursor="pointer"
              onClick={() => handleHeaderChange(rowIndex)}
              role="button"
              _hover={{ bg: rowIndex === headerIndex ? 'primary.200' : 'primary.50' }}
            >
              {row.map((cell, cellIndex) => (
                <Td
                  key={cellIndex}
                  maxW="200px"
                  isTruncated
                  border={rowIndex === headerIndex ? '2px solid' : '1px solid'}
                  borderColor={rowIndex === headerIndex ? 'brand.600' : 'border'}
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
          Showing first {MAX_PREVIEW_ROWS} rows of {rawData.length} total rows
        </Text>
      )}
    </Box>
  </VStack>
)}

  {step === 'map' && (
  <Flex direction={{ base: 'column', md: 'row' }} gap={4} align="stretch" maxH="70vh" overflow="auto">
  <VStack gap={4} align="stretch" bg="neutral.50" p={4} borderRadius="md" w={{ base: '100%', md: '40%' }} overflowY="auto">
      {!validateForm.isValid && (
        <Text color="red.500" fontSize="sm" fontWeight="medium">
          Missing required columns: {validateForm.missing.join(', ')}. Please map all required columns.
        </Text>
      )}
  <Text fontSize="sm" color="subtle">
        Select a field below, then click a column in the preview grid to map it instantly.
      </Text>
      <Text fontWeight="bold">Required Columns</Text>
      {REQUIRED_COLUMNS.map(field => (
        <HStack
          key={field}
          gap={2}
          align="center"
          p={2}
          borderRadius="md"
          borderWidth={activeMappingField === field ? '2px' : '1px'}
          borderColor={activeMappingField === field ? SELECTED_BORDER_COLOR : 'transparent'}
          bg={activeMappingField === field ? SELECTED_BG_SUBTLE : 'transparent'}
          cursor="pointer"
          onClick={() => setActiveMappingField(field)}
        >
          <Text w="120px" fontWeight="semibold">
            {field}:
          </Text>
          <Tooltip label={`Select Excel column for ${field}`}>
            <Select
              value={columnMapping[field] !== null ? columnMapping[field]! : ''}
              onChange={e => handleColumnMap(Number(e.target.value), field)}
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
                  disabled={mappedColumns.has(index) && columnMapping[field] !== index}
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
                onClick={() => handleClearMapping(columnMapping[field]!)}
              />
            </Tooltip>
          )}
          <Box w="150px" fontSize="sm" color="subtle" isTruncated>
            {getColumnPreview(columnMapping[field], excelData.rows)}
          </Box>
        </HStack>
      ))}
      {columnMapping.brand === null && !isManualBrandApplied && (
        <FormControl>
          <HStack gap={2}>
            <Text w="120px">Add Brand Column:</Text>
            <Tooltip label="Enter a brand to apply to all rows">
              <Input
                placeholder="Add Brand for All Rows (Optional)"
                value={manualBrand}
                onChange={e => setManualBrand(e.target.value)}
                aria-label="Manual brand input"
                flex="1"
              />
            </Tooltip>
            <Button
              colorScheme="brand"
              size="sm"
              onClick={applyManualBrand}
              isDisabled={!manualBrand.trim()}
            >
              Apply
            </Button>
            {isManualBrandApplied && (
              <Button colorScheme="red" variant="outline" size="sm" onClick={removeManualBrand}>
                Remove
              </Button>
            )}
          </HStack>
          {isManualBrandApplied && (
            <Badge colorScheme="brand" mt={2}>
              Manual Brand Column Applied
            </Badge>
          )}
        </FormControl>
      )}
      <Text fontWeight="bold" mt={4}>Optional Columns</Text>
      {OPTIONAL_COLUMNS.map(field => (
        <HStack
          key={field}
          gap={2}
          align="center"
          p={2}
          borderRadius="md"
          borderWidth={activeMappingField === field ? '2px' : '1px'}
          borderColor={activeMappingField === field ? SELECTED_BORDER_COLOR : 'transparent'}
          bg={activeMappingField === field ? SELECTED_BG_SUBTLE : 'transparent'}
          cursor="pointer"
          onClick={() => setActiveMappingField(field)}
        >
          <Text w="120px" fontWeight="semibold">
            {field}:
          </Text>
          <Tooltip label={`Select Excel column for ${field}`}>
            <Select
              value={columnMapping[field] !== null ? columnMapping[field]! : ''}
              onChange={e => handleColumnMap(Number(e.target.value), field)}
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
                  disabled={mappedColumns.has(index) && columnMapping[field] !== index}
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
                onClick={() => handleClearMapping(columnMapping[field]!)}
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
      w={{ base: '100%', md: '60%' }}
      maxH="70vh"
      mt={{ base: 4, md: 0 }}
    >
      <Table size="sm">
        <Thead>
          <Tr>
            {excelData.headers.map((header, index) => {
              const isMapped = mappedColumns.has(index);
              const isSelected = selectedColumnIndex === index;
              return (
                <Th
                  key={index}
                  bg={isSelected ? SELECTED_BG_STRONG : isMapped ? MAPPED_BG : 'neutral.100'}
                  position="sticky"
                  top={0}
                  border={(isSelected || isMapped) ? '2px solid' : undefined}
                  borderColor={isSelected || isMapped ? SELECTED_BORDER_COLOR : 'transparent'}
                  cursor={activeMappingField ? 'pointer' : 'default'}
                  onClick={() => handleColumnMapFromGrid(index)}
                  tabIndex={activeMappingField ? 0 : undefined}
                  onKeyDown={event => {
                    if (!activeMappingField) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleColumnMapFromGrid(index);
                    }
                  }}
                  role={activeMappingField ? 'button' : undefined}
                  aria-pressed={isSelected}
                  _hover={activeMappingField ? { bg: isSelected ? SELECTED_BG_STRONG : SELECTED_BG_SUBTLE } : undefined}
                >
                  {header || `Column ${indexToColumnLetter(index)}`}
                </Th>
              );
            })}
          </Tr>
        </Thead>
        <Tbody>
          {excelData.rows.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
            <Tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const isMissingRequired =
                  (columnMapping.style === cellIndex || columnMapping.brand === cellIndex) && !cell;
                const isSelectedColumn = selectedColumnIndex === cellIndex;
                const isMappedColumn = mappedColumns.has(cellIndex);
                const bgColor = isMissingRequired
                  ? 'danger.100'
                  : isSelectedColumn
                    ? SELECTED_BG_SUBTLE
                    : isMappedColumn
                      ? MAPPED_BG
                      : undefined;
                return (
                  <Td
                    key={cellIndex}
                    maxW="200px"
                    isTruncated
                    bg={bgColor}
                    cursor={activeMappingField ? 'pointer' : 'default'}
                    onClick={() => handleColumnMapFromGrid(cellIndex)}
                  >
                    {getDisplayValue(cell)}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  </Flex>
)}
       {step === 'submit' && (
          <VStack spacing={4} align="stretch">
            <VStack align="start" spacing={4}>
              <Text>Rows: {excelData.rows.length}</Text>
              <FormControl>
                <Checkbox
                  colorScheme="brand"
                  size="lg"
                  isChecked={isIconDistro}
                  onChange={e => setIsIconDistro(e.target.checked)}
                >
                  Output as New Distro
                </Checkbox>
                <Text fontSize="sm" color="subtle" mt={2} pl={8}>
                  If not selected, results will be populated into the uploaded file.
                </Text>
              </FormControl>
              <FormControl>
                <Checkbox
                  colorScheme="brand"
                  size="lg"
                  isChecked={skipDataWarehouse}
                  onChange={e => setSkipDataWarehouse(e.target.checked)}
                >
                  Skip Data Warehouse Processing
                </Checkbox>
                <Text fontSize="sm" color="subtle" mt={2} pl={8}>
                  If selected, data will not be processed for the data warehouse.
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
                    .filter(([col, index]) => index !== null && col !== 'readImage' && col !== 'imageAdd')
                    .map(([col, index]) => (
                      <Tr key={col}>
                        <Td>{col}</Td>
                        <Td>{excelData.headers[index!] || `Column ${indexToColumnLetter(index!)}`}</Td>
                        <Td>{getColumnPreview(index, excelData.rows)}</Td>
                      </Tr>
                    ))}
                  {isManualBrandApplied && (
                    <Tr>
                      <Td>Manual Brand</Td>
                      <Td>BRAND (Manual)</Td>
                      <Td>{excelData.rows[0]?.[excelData.headers.length - 1] || manualBrand}</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </VStack>
          </VStack>
        )}
      </VStack>
    </Container>
  );
};
// Data Warehouse Form Component
const DataWarehouseForm: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'preview' | 'map' | 'submit'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] });
  const [rawData, setRawData] = useState<CellValue[][]>([]);
  const [headerIndex, setHeaderIndex] = useState<number>(1);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    brand: null,
    category: null,
    colorName: null,
    msrp: null,
    readImage: null,
    imageAdd: null,
  });
  const [activeMappingField, setActiveMappingField] = useState<ColumnType | null>(null);
  const [manualBrand, setManualBrand] = useState('');
  const [isManualBrandApplied, setIsManualBrandApplied] = useState(false);
  const [isNewDistro, setIsNewDistro] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
  const showToast: ToastFunction = useCustomToast();

  const REQUIRED_COLUMNS: ColumnType[] = ['style', 'msrp'];
  const OPTIONAL_COLUMNS: ColumnType[] = ['brand'];
  const ALL_COLUMNS: ColumnType[] = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        showToast('File Error', 'No file selected', 'error');
        return;
      }
      if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
        showToast('File Error', 'Please upload an Excel file (.xlsx or .xls)', 'error');
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast('File Error', `File size exceeds ${MAX_FILE_SIZE_MB}MB`, 'error');
        return;
      }

      setFile(selectedFile);
      setIsLoading(true);
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) throw new Error('No worksheet found');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: true, defval: '' });
        if (jsonData.length === 0) throw new Error('Excel file is empty');

        const detectedHeaderIndex = detectHeaderRow(jsonData as CellValue[][]);
        const patterns = {
          style: /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
          msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
        };
        const firstRow: string[] = (jsonData[0] as any[]).map(cell => String(cell ?? '').trim());
        if (detectedHeaderIndex === 0 && !firstRow.some(cell => patterns.style.test(cell) || patterns.msrp.test(cell))) {
          showToast('Warning', 'No clear header row detected; using first row. Please verify in the Header Selection step.', 'warning');
        }
        setRawData(jsonData as CellValue[][]);
        if (jsonData.length <= detectedHeaderIndex || detectedHeaderIndex < 0) {
          showToast('File Error', 'Invalid header row detected. Please select a header row in the Header Selection step.', 'error');
          setHeaderIndex(0);
          setExcelData({ headers: [], rows: [] });
          setFile(null);
          setStep('upload');
          return;
        }
        setHeaderIndex(detectedHeaderIndex);
        const headers = (jsonData[detectedHeaderIndex] as any[]).map(cell => String(cell ?? ''));
        const rows = jsonData.slice(detectedHeaderIndex + 1) as CellValue[][];
        setExcelData({ headers, rows });
        setColumnMapping(autoMapColumns(headers));
        setStep('preview');
      } catch (error) {
        showToast('File Processing Error', error instanceof Error ? error.message : 'Unknown error', 'error');
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  const handleHeaderChange = useCallback(
    (newHeaderIndex: number) => {
      if (newHeaderIndex < 0 || newHeaderIndex >= rawData.length) return;
      setHeaderIndex(newHeaderIndex);
      const headers = rawData[newHeaderIndex].map(cell => String(cell ?? ''));
      const rows = rawData.slice(newHeaderIndex + 1) as CellValue[][];
      setExcelData({ headers, rows });
      setColumnMapping(autoMapColumns(headers));
      setIsManualBrandApplied(false);
      setManualBrand('');
      setActiveMappingField(null);
    },
    [rawData]
  );

  const handleColumnMap = useCallback(
    (index: number, field: string) => {
      if (field && !ALL_COLUMNS.includes(field as ColumnType)) return;
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        (Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(key => {
          if (newMapping[key] === index && key !== 'readImage' && key !== 'imageAdd') {
            newMapping[key] = null;
          }
        });
        if (field && ALL_COLUMNS.includes(field as ColumnType)) {
          newMapping[field as keyof ColumnMapping] = index;
          if (field === 'brand') {
            setManualBrand('');
            setIsManualBrandApplied(false);
          }
        }
        return newMapping;
      });
    },
    []
  );

  const handleColumnMapFromGrid = useCallback(
    (index: number) => {
      if (activeMappingField === null) return;
      handleColumnMap(index, activeMappingField);
      setActiveMappingField(null);
    },
    [activeMappingField, handleColumnMap]
  );

  const handleClearMapping = useCallback(
    (index: number) => {
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        (Object.keys(newMapping) as (keyof ColumnMapping)[]).forEach(key => {
          if (newMapping[key] === index && key !== 'readImage' && key !== 'imageAdd') {
            newMapping[key] = null;
            if (key === 'brand') {
              setManualBrand('');
              setIsManualBrandApplied(false);
            }
          }
        });
        return newMapping;
      });
    },
    []
  );

  const mappedColumns = useMemo(
    () =>
      new Set(
        (Object.values(columnMapping).filter((value): value is number => typeof value === 'number') as number[])
      ),
    [columnMapping]
  );

  const selectedColumnIndex = activeMappingField !== null ? columnMapping[activeMappingField] : null;

  const applyManualBrand = useCallback(() => {
    if (!manualBrand.trim()) {
      showToast('Manual Brand Error', 'Please enter a non-empty brand name', 'warning');
      return;
    }
    setColumnMapping(prev => ({ ...prev, brand: null }));
    setExcelData(prev => {
      const newHeaders = [...prev.headers, 'BRAND (Manual)'];
      setColumnMapping(prevMapping => ({ ...prevMapping, brand: newHeaders.length - 1 }));
      setIsManualBrandApplied(true);
      return {
        headers: newHeaders,
        rows: prev.rows.map(row => [...row, manualBrand.trim()]),
      };
    });
    showToast('Success', `Manual brand "${manualBrand.trim()}" applied`, 'success');
    setManualBrand('');
    setActiveMappingField(null);
  }, [manualBrand, showToast]);

  const removeManualBrand = useCallback(() => {
    setExcelData(prev => ({
      headers: prev.headers.filter(header => header !== 'BRAND (Manual)'),
      rows: prev.rows.map(row => row.slice(0, -1)),
    }));
    setColumnMapping(prev => ({ ...prev, brand: null }));
    setIsManualBrandApplied(false);
    showToast('Success', 'Manual brand removed', 'success');
    setActiveMappingField(null);
  }, [showToast]);

  const validateForm = useMemo(() => {
    const missing = REQUIRED_COLUMNS.filter(
      col => columnMapping[col] === null
    );
    return {
      isValid: missing.length === 0 && file && excelData.rows.length > 0,
      missing,
    };
  }, [columnMapping, file, excelData.rows.length]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm.isValid) {
      showToast('Validation Error', `Missing required columns: ${validateForm.missing.join(', ')}`, 'warning');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    
    formData.append('fileUploadImage', file!);
    formData.append('searchColImage', indexToColumnLetter(columnMapping.style!));
    formData.append('msrpColImage', indexToColumnLetter(columnMapping.msrp!));
    
    if (isManualBrandApplied) {
      formData.append('brandColImage', 'MANUAL');
      const manualBrandValue = (excelData.rows[0]?.[excelData.headers.length - 1] as string) || '';
      formData.append('manualBrand', manualBrandValue);
    } else if (columnMapping.brand !== null) {
      formData.append('brandColImage', indexToColumnLetter(columnMapping.brand));
    }

    if (columnMapping.readImage || columnMapping.imageAdd) {
      formData.append('imageColumnImage', indexToColumnLetter(columnMapping.readImage || columnMapping.imageAdd!));
    }
    if (columnMapping.colorName !== null) {
      formData.append('ColorColImage', indexToColumnLetter(columnMapping.colorName));
    }
    if (columnMapping.category !== null) {
      formData.append('CategoryColImage', indexToColumnLetter(columnMapping.category));
    }
    formData.append('header_index', String(headerIndex + 1));
    formData.append('sendToEmail', 'nik@luxurymarket.com');
    formData.append('isNewDistro', String(isNewDistro));
    formData.append('currency', currency);

    try {
      const response = await fetch(`${SERVER_URL}/datawarehouse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server Response:', response.status, errorText);
        throw new Error(`Server error: ${errorText || response.statusText}`);
      }

      showToast('Success', 'Form submitted successfully', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Fetch Error:', error);
      showToast('Submission Error', error instanceof Error ? error.message : 'Failed to submit', 'error');
      setStep('map');
    } finally {
      setIsLoading(false);
    }
  }, [
    validateForm,
    file,
    columnMapping,
    isManualBrandApplied,
    headerIndex,
    isNewDistro,
    currency,
    showToast,
    excelData,
  ]);

  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={6} align="stretch">
  <HStack justify="space-between" bg="neutral.50" p={2} borderRadius="md" align="center">
          <HStack spacing={4}>
            {['Upload', 'Header Selection', 'Map', 'Submit'].map((s, i) => (
              <Text
                key={s}
                fontWeight={step === s.toLowerCase().replace('header selection', 'preview') ? 'bold' : 'normal'}
                color={step === s.toLowerCase().replace('header selection', 'preview') ? 'brand.600' : 'subtle'}
                cursor={i < ['upload', 'preview', 'map', 'submit'].indexOf(step) ? 'pointer' : 'default'}
                onClick={() => {
                  if (i < ['upload', 'preview', 'map', 'submit'].indexOf(step)) setStep(s.toLowerCase().replace('header selection', 'preview') as typeof step);
                }}
              >
                {i + 1}. {s}
              </Text>
            ))}
          </HStack>
          {step !== 'upload' && (
            <HStack>
              {step !== 'preview' && (
                <Button
                  onClick={() => setStep(['upload', 'preview', 'map', 'submit'][['upload', 'preview', 'map', 'submit'].indexOf(step) - 1] as typeof step)}
                  variant="outline"
                  colorScheme="primary"
                  size="sm"
                >
                  Back
                </Button>
              )}
              {step === 'preview' && (
                <Button onClick={() => setStep('upload')} variant="outline" colorScheme="brand" size="sm">
                  Back
                </Button>
              )}
              {step !== 'submit' && (
                <Button
                  colorScheme="brand"
                  onClick={() => setStep(['preview', 'map', 'submit'][['upload', 'preview', 'map'].indexOf(step)] as typeof step)}
                  size="sm"
                  isDisabled={step === 'map' && !validateForm.isValid}
                >
                  Next: {['Header Selection', 'Map', 'Submit'][['upload', 'preview', 'map'].indexOf(step)]}
                </Button>
              )}
              {step === 'submit' && (
                <Button colorScheme="brand" onClick={handleSubmit} isLoading={isLoading} size="sm">
                  Submit
                </Button>
              )}
            </HStack>
          )}
        </HStack>

        {step === 'upload' && (
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">Upload Excel File for Data Warehouse Scrape</Text>
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

{step === 'preview' && (
  <VStack spacing={4} align="stretch">
    <HStack>
      <Text>Select Header Row:</Text>
      <Select
        value={headerIndex}
        onChange={e => handleHeaderChange(Number(e.target.value))}
        w="150px"
        aria-label="Select header row"
      >
        {rawData.slice(0, 20).map((_, index) => (
          <option key={index} value={index}>
            Row {index + 1} {index === headerIndex ? '(Selected)' : ''}
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
              bg={rowIndex === headerIndex ? 'primary.100' : undefined}
              fontWeight={rowIndex === headerIndex ? 'bold' : 'normal'}
              cursor="pointer"
              onClick={() => handleHeaderChange(rowIndex)}
              role="button"
              _hover={{ bg: rowIndex === headerIndex ? 'primary.200' : 'primary.50' }}
            >
              {row.map((cell, cellIndex) => (
                <Td
                  key={cellIndex}
                  maxW="200px"
                  isTruncated
                  border={rowIndex === headerIndex ? '2px solid' : '1px solid'}
                  borderColor={rowIndex === headerIndex ? 'brand.600' : 'border'}
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
          Showing first {MAX_PREVIEW_ROWS} rows of {rawData.length} total rows
        </Text>
      )}
    </Box>
  </VStack>
)}

{step === 'map' && (
  <Flex direction={{ base: 'column', md: 'row' }} gap={4} align="stretch" maxH="70vh" overflow="auto">
  <VStack gap={4} align="stretch" bg="neutral.50" p={4} borderRadius="md" w={{ base: '100%', md: '40%' }} overflowY="auto">
      {!validateForm.isValid && (
        <Text color="red.500" fontSize="sm" fontWeight="medium">
          Missing required columns: {validateForm.missing.join(', ')}. Please map all required columns.
        </Text>
      )}
  <Text fontSize="sm" color="subtle">
        Select a field below, then click a column in the preview grid to map it instantly.
      </Text>
      <Text fontWeight="bold">Required Columns</Text>
      {REQUIRED_COLUMNS.map(field => (
        <HStack
          key={field}
          gap={2}
          align="center"
          p={2}
          borderRadius="md"
          borderWidth={activeMappingField === field ? '2px' : '1px'}
          borderColor={activeMappingField === field ? SELECTED_BORDER_COLOR : 'transparent'}
          bg={activeMappingField === field ? SELECTED_BG_SUBTLE : 'transparent'}
          cursor="pointer"
          onClick={() => setActiveMappingField(field)}
        >
          <Text w="120px" fontWeight="semibold">
            {field}:
          </Text>
          <Tooltip label={`Select Excel column for ${field}`}>
            <Select
              value={columnMapping[field] !== null ? columnMapping[field]! : ''}
              onChange={e => handleColumnMap(Number(e.target.value), field)}
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
                  disabled={mappedColumns.has(index) && columnMapping[field] !== index}
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
                onClick={() => handleClearMapping(columnMapping[field]!)}
              />
            </Tooltip>
          )}
          <Box w="150px" fontSize="sm" color="subtle" isTruncated>
            {getColumnPreview(columnMapping[field], excelData.rows)}
          </Box>
        </HStack>
      ))}
      <Text fontWeight="bold" mt={4}>Optional Columns</Text>
      {OPTIONAL_COLUMNS.map(field => (
        <HStack
          key={field}
          gap={2}
          align="center"
          p={2}
          borderRadius="md"
          borderWidth={activeMappingField === field ? '2px' : '1px'}
          borderColor={activeMappingField === field ? SELECTED_BORDER_COLOR : 'transparent'}
          bg={activeMappingField === field ? SELECTED_BG_SUBTLE : 'transparent'}
          cursor="pointer"
          onClick={() => setActiveMappingField(field)}
        >
          <Text w="120px" fontWeight="semibold">
            {field}:
          </Text>
          <Tooltip label={`Select Excel column for ${field}`}>
            <Select
              value={columnMapping[field] !== null ? columnMapping[field]! : ''}
              onChange={e => handleColumnMap(Number(e.target.value), field)}
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
                  disabled={mappedColumns.has(index) && columnMapping[field] !== index}
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
                onClick={() => handleClearMapping(columnMapping[field]!)}
              />
            </Tooltip>
          )}
          <Box w="150px" fontSize="sm" color="subtle" isTruncated>
            {getColumnPreview(columnMapping[field], excelData.rows)}
          </Box>
        </HStack>
      ))}
      {columnMapping.brand === null && !isManualBrandApplied && (
        <FormControl>
          <HStack gap={2}>
            <Text w="120px">Add Brand Column:</Text>
            <Tooltip label="Enter a brand to apply to all rows">
              <Input
                placeholder="Add Brand for All Rows (Optional)"
                value={manualBrand}
                onChange={e => setManualBrand(e.target.value)}
                aria-label="Manual brand input"
                flex="1"
              />
            </Tooltip>
            <Button
              colorScheme="brand"
              size="sm"
              onClick={applyManualBrand}
              isDisabled={!manualBrand.trim()}
            >
              Apply
            </Button>
            {isManualBrandApplied && (
              <Button colorScheme="red" variant="outline" size="sm" onClick={removeManualBrand}>
                Remove
              </Button>
            )}
          </HStack>
          {isManualBrandApplied && (
            <Badge colorScheme="brand" mt={2}>
              Manual Brand Column Applied
            </Badge>
          )}
        </FormControl>
      )}
    </VStack>
    <Box
      overflow="auto"
      borderWidth="1px"
      borderRadius="md"
      p={2}
      w={{ base: '100%', md: '60%' }}
      maxH="70vh"
      mt={{ base: 4, md: 0 }}
    >
      <Table size="sm">
        <Thead>
          <Tr>
            {excelData.headers.map((header, index) => {
              const isMapped = mappedColumns.has(index);
              const isSelected = selectedColumnIndex === index;
              return (
                <Th
                  key={index}
                  bg={isSelected ? SELECTED_BG_STRONG : isMapped ? MAPPED_BG : 'neutral.100'}
                  position="sticky"
                  top={0}
                  border={(isSelected || isMapped) ? '2px solid' : undefined}
                  borderColor={isSelected || isMapped ? SELECTED_BORDER_COLOR : 'transparent'}
                  cursor={activeMappingField ? 'pointer' : 'default'}
                  onClick={() => handleColumnMapFromGrid(index)}
                  tabIndex={activeMappingField ? 0 : undefined}
                  onKeyDown={event => {
                    if (!activeMappingField) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleColumnMapFromGrid(index);
                    }
                  }}
                  role={activeMappingField ? 'button' : undefined}
                  aria-pressed={isSelected}
                  _hover={activeMappingField ? { bg: isSelected ? SELECTED_BG_STRONG : SELECTED_BG_SUBTLE } : undefined}
                >
                  {header || `Column ${indexToColumnLetter(index)}`}
                </Th>
              );
            })}
          </Tr>
        </Thead>
        <Tbody>
          {excelData.rows.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
            <Tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const isMissingRequired =
                  (columnMapping.style === cellIndex || columnMapping.msrp === cellIndex) && !cell;
                const isSelectedColumn = selectedColumnIndex === cellIndex;
                const isMappedColumn = mappedColumns.has(cellIndex);
                const bgColor = isMissingRequired
                  ? 'red.100'
                  : isSelectedColumn
                    ? SELECTED_BG_SUBTLE
                    : isMappedColumn
                      ? MAPPED_BG
                      : undefined;
                return (
                  <Td
                    key={cellIndex}
                    maxW="200px"
                    isTruncated
                    bg={bgColor}
                    cursor={activeMappingField ? 'pointer' : 'default'}
                    onClick={() => handleColumnMapFromGrid(cellIndex)}
                  >
                    {getDisplayValue(cell)}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  </Flex>
)}
        {step === 'submit' && (
          <VStack spacing={4} align="stretch">
            <VStack align="start" spacing={4}>
              <Text>Rows: {excelData.rows.length}</Text>
              <HStack>
                <Text>Currency:</Text>
                <Select value={currency} onChange={e => setCurrency(e.target.value as 'USD' | 'EUR')} w="100px">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </HStack>
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
                    .filter(([col, index]) => index !== null && col !== 'readImage' && col !== 'imageAdd')
                    .map(([col, index]) => (
                      <Tr key={col}>
                        <Td>{col}</Td>
                        <Td>{excelData.headers[index!] || `Column ${indexToColumnLetter(index!)}`}</Td>
                        <Td>{getColumnPreview(index, excelData.rows)}</Td>
                      </Tr>
                    ))}
                  {isManualBrandApplied && (
                    <Tr>
                      <Td>Manual Brand</Td>
                      <Td>BRAND (Manual)</Td>
                      <Td>{excelData.rows[0]?.[excelData.headers.length - 1] || manualBrand}</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </VStack>
          </VStack>
        )}
      </VStack>
    </Container>
  );
};

// Main Component
const CMSGoogleSerpForm: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'images' | 'data' | null>(null);

  if (selectedType === 'images') {
    return <GoogleImagesForm />;
  }

  if (selectedType === 'data') {
    return <DataWarehouseForm />;
  }

  return (
    <Container maxW="container.xl" p={4} bg="white" color="black">
      <VStack spacing={6} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card cursor="pointer" onClick={() => setSelectedType('images')}>
            <CardHeader>
              <HStack>
                <Icon as={SearchIcon} boxSize={6} color="primary.500" />
                <Text fontSize="xl" fontWeight="bold">Scrape Google Images</Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text>Google Images</Text>
            </CardBody>
          </Card>
          <Card cursor="pointer" onClick={() => setSelectedType('data')}>
            <CardHeader>
              <HStack>
                <Icon as={FaWarehouse} boxSize={6} color="primary.500" />
                <Text fontSize="xl" fontWeight="bold">Scrape Data Warehouse</Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Text>Internal product database</Text>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Container>
  );
};

// Export
export const Route = createFileRoute('/google-serp-cms')({
  component: () => (
      <CMSGoogleSerpForm />
  ),
});

export default CMSGoogleSerpForm;