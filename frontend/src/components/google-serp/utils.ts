import * as XLSX from "xlsx"
import { IMAGE_HEADER_PATTERN, MANUAL_BRAND_HEADER } from "./constants"
import type { CellValue, ColumnMapping, ColumnType, ExcelData, SheetConfig } from "./types"

export const formatMappingFieldLabel = (field: ColumnType | "imageColumn") => {
  if (field === "imageColumn") return "image target column"
  if (field === "msrp") return "MSRP"
  if (field === "style") return "style"
  if (field === "brand") return "brand"
  if (field === "category") return "category"
  if (field === "colorName") return "color"
  return field
}

export const createEmptyColumnMapping = (): ColumnMapping => ({
  style: null,
  brand: null,
  category: null,
  colorName: null,
  msrp: null,
  readImage: null,
  imageAdd: null,
})

export const EMPTY_EXCEL_DATA: ExcelData = { headers: [], rows: [] }
export const EMPTY_COLUMN_MAPPING: ColumnMapping = Object.freeze(
  createEmptyColumnMapping(),
)

export const cloneColumnMapping = (mapping: ColumnMapping): ColumnMapping => ({
  style: mapping.style,
  brand: mapping.brand,
  category: mapping.category,
  colorName: mapping.colorName,
  msrp: mapping.msrp,
  readImage: mapping.readImage,
  imageAdd: mapping.imageAdd,
})

export const withManualBrandValue = (
  sheet: SheetConfig,
  manualBrandValue: string | null,
): SheetConfig => {
  const hasManualColumn =
    sheet.excelData.headers[sheet.excelData.headers.length - 1] ===
    MANUAL_BRAND_HEADER

  if (manualBrandValue?.trim()) {
    const trimmed = manualBrandValue.trim()
    if (hasManualColumn) {
      const updatedRows = sheet.excelData.rows.map((row) => {
        const nextRow = [...row]
        if (nextRow.length < sheet.excelData.headers.length) {
          nextRow.length = sheet.excelData.headers.length
        }
        nextRow[nextRow.length - 1] = trimmed
        return nextRow
      })
      return {
        ...sheet,
        excelData: {
          headers: [...sheet.excelData.headers],
          rows: updatedRows,
        },
        manualBrandValue: trimmed,
      }
    }
    const newHeaders = [...sheet.excelData.headers, MANUAL_BRAND_HEADER]
    const newRows = sheet.excelData.rows.map((row) => [...row, trimmed])
    return {
      ...sheet,
      excelData: { headers: newHeaders, rows: newRows },
      manualBrandValue: trimmed,
    }
  }

  if (!manualBrandValue && hasManualColumn) {
    const newHeaders = sheet.excelData.headers.slice(0, -1)
    const newRows = sheet.excelData.rows.map((row) => row.slice(0, -1))
    const newMapping = cloneColumnMapping(sheet.columnMapping)
    if (newMapping.brand === newHeaders.length) {
      newMapping.brand = null
    }
    return {
      ...sheet,
      excelData: { headers: newHeaders, rows: newRows },
      columnMapping: newMapping,
      manualBrandValue: null,
    }
  }

  return {
    ...sheet,
    manualBrandValue: manualBrandValue ? manualBrandValue.trim() : null,
  }
}

export const getDisplayValue = (value: any): string => {
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

export const indexToColumnLetter = (index: number): string => {
  let column = ""
  let temp = index
  while (temp >= 0) {
    column = String.fromCharCode((temp % 26) + 65) + column
    temp = Math.floor(temp / 26) - 1
  }
  return column
}

export const detectHeaderRow = (rows: CellValue[][]): number => {
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
  }
  let bestIndex = 0
  let maxNonEmptyCells = 0
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const rowValues = rows[i]
      .map((cell) => String(cell ?? "").trim())
      .filter((value) => value !== "") as string[]
    const nonEmptyCount = rowValues.length
    if (nonEmptyCount < 2) continue
    const hasHeaderMatch = rowValues.some((value: string) =>
      Object.values(patterns).some((pattern) => pattern.test(value)),
    )
    if (hasHeaderMatch || nonEmptyCount > maxNonEmptyCells) {
      bestIndex = i
      maxNonEmptyCells = nonEmptyCount
      if (hasHeaderMatch) break
    }
  }
  return bestIndex
}

export const getColumnPreview = (
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

export const autoMapColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    style: null,
    brand: null,
    category: null,
    colorName: null,
    msrp: null,
    readImage: null,
    imageAdd: null,
  }
  const patterns = {
    style:
      /^(style|product style|style\s*(#|no|number|id)|sku|item\s*(#|no|number))/i,
    brand: /^(brand|manufacturer|make|label|designer|vendor)/i,
    msrp: /^(msrp|manufacturer\s*suggested\s*retail\s*price|list\s*price|suggested\s*retail)/i,
    image: /^(image|photo|picture|img|readImage|imageAdd)/i,
  }
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toUpperCase()
    if (!normalizedHeader) return
    if (patterns.style.test(normalizedHeader) && mapping.style === null)
      mapping.style = index
    else if (patterns.brand.test(normalizedHeader) && mapping.brand === null)
      mapping.brand = index
    else if (patterns.msrp.test(normalizedHeader) && mapping.msrp === null)
      mapping.msrp = index
    else if (
      patterns.image.test(normalizedHeader) &&
      mapping.readImage === null &&
      mapping.imageAdd === null
    ) {
      mapping.readImage = index
      mapping.imageAdd = index
    }
  })
  return mapping
}

export const getColumnMappingEntries = (
  mapping: ColumnMapping,
): [keyof ColumnMapping, number | null][] =>
  Object.entries(mapping) as [keyof ColumnMapping, number | null][]

export const looksLikeUrl = (value: CellValue | undefined): boolean =>
  typeof value === "string" && /^https?:\/\//i.test(value.trim())

export const getFirstNonEmptyValue = (
  rows: CellValue[][],
  columnIndex: number,
): CellValue | undefined => {
  for (const row of rows) {
    const value = row[columnIndex]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value
    }
  }
  return undefined
}

export const determineFallbackImageColumnIndex = (
  headers: string[],
  rows: CellValue[][],
): number | null => {
  if (headers.length === 0) return null
  const firstHeader = headers[0]
  if (firstHeader && IMAGE_HEADER_PATTERN.test(firstHeader)) {
    return 0
  }
  if (rows.length === 0) return null
  const sampleValue = getFirstNonEmptyValue(rows, 0)
  if (looksLikeUrl(sampleValue)) {
    return 0
  }
  return null
}

export const sanitizeWorksheet = (worksheet: XLSX.WorkSheet) => {
  const sanitized: XLSX.WorkSheet = { ...worksheet }

  const sanitizeDimensionEntries = (entries: any[] | undefined) => {
    if (!Array.isArray(entries)) return entries
    return entries.map((entry) => {
      if (!entry || typeof entry !== "object") return entry
      const { level, outlineLevel, ...rest } = entry as Record<string, any>
      return { ...rest }
    })
  }

  const cols = sanitized["!cols"] as any[] | undefined
  const rows = sanitized["!rows"] as any[] | undefined

  if (cols) sanitized["!cols"] = sanitizeDimensionEntries(cols) as any
  if (rows) sanitized["!rows"] = sanitizeDimensionEntries(rows) as any

  return sanitized
}
