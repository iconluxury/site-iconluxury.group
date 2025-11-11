import { useState, useCallback } from "react"
import * as XLSX from "xlsx"

type CellValue = string | number | boolean | null
type ExcelData = { headers: string[]; rows: CellValue[][] }
type ColumnMapping = Record<
  "style" | "brand" | "category" | "colorName" | "msrp" | "readImage" | "imageAdd",
  number | null
>

// Assuming these types are defined elsewhere, e.g., in a types.ts file
export interface Sheet {
  name: string
  data: (string | null)[][]
  manualBrandValue?: string
}

export interface Header {
  original: string
  mapped: string
  valid: boolean
}

export interface SheetConfig {
  name: string
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
  manualBrandValue: string | null
}

export const withManualBrandValue = (
  sheet: SheetConfig,
  value: string,
): SheetConfig => {
  return {
    ...sheet,
    manualBrandValue: value,
  }
}

export const withoutManualBrandValue = (sheet: SheetConfig): SheetConfig => {
  return { ...sheet, manualBrandValue: null }
}

export const useExcelProcessor = () => {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [rawData, setRawData] = useState<(string | null)[][]>([])
  const [headers, setHeaders] = useState<Header[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const processFile = useCallback(async (selectedFile: File) => {
    setIsProcessing(true)
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (data) {
        const workbook = XLSX.read(data, { type: "binary" })
        const newSheets: Sheet[] = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name]
          const sheetData = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
          }) as (string | null)[][]
          return { name, data: sheetData }
        })

        setSheets(newSheets)

        const newSheetConfigs: SheetConfig[] = newSheets.map((sheet) => {
          const headerIndex = 0 // Or detect it
          const headers = (sheet.data[headerIndex] || []).map(String)
          const rows = sheet.data.slice(headerIndex + 1)
          return {
            name: sheet.name,
            rawData: sheet.data,
            headerIndex,
            excelData: { headers, rows },
            columnMapping: {
              style: null,
              brand: null,
              category: null,
              colorName: null,
              msrp: null,
              readImage: null,
              imageAdd: null,
            },
            manualBrandValue: null,
          }
        })

        setSheetConfigs(newSheetConfigs)
        setActiveSheetIndex(0)

        if (newSheets.length > 0) {
          setRawData(newSheets[0].data)
        }
      }
      setIsProcessing(false)
    }
    reader.readAsBinaryString(selectedFile)
  }, [])

  const reset = useCallback(() => {
    setSheets([])
    setActiveSheetIndex(0)
    setSheetConfigs([])
    setFile(null)
    setRawData([])
    setIsProcessing(false)
  }, [])

  return {
    sheets,
    activeSheetIndex,
    setActiveSheetIndex,
    sheetConfigs,
    setSheetConfigs,
    file,
    rawData,
    isProcessing,
    processFile,
    reset,
  }
}
