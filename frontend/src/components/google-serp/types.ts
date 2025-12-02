import type { IconType } from "react-icons"

export type ColumnType = "style" | "brand" | "category" | "colorName" | "msrp"

export type CellValue = string | number | boolean | null
export type ExcelData = { headers: string[]; rows: CellValue[][] }
export type ColumnMapping = Record<
  ColumnType | "readImage" | "imageAdd",
  number | null
>

export type SheetConfig = {
  name: string
  originalIndex: number
  rawData: CellValue[][]
  headerIndex: number
  excelData: ExcelData
  columnMapping: ColumnMapping
  manualBrandValue: string | null
  isSelected: boolean
}

export type ToastFunction = (
  title: string,
  description: string,
  status: "error" | "warning" | "success",
) => void

export type FormWithBackProps = {
  onBack?: () => void
  backLabel?: string
}

export type DataWarehouseMode = "imagesAndMsrp" | "imagesOnly" | "msrpOnly"

export type DataWarehouseModeConfig = {
  label: string
  description: string
  requiredColumns: ColumnType[]
  optionalColumns: ColumnType[]
  requireImageColumn: boolean
  allowImageColumnMapping: boolean
  icon: IconType
}

export type DataWarehouseFormProps = FormWithBackProps & {
  mode: DataWarehouseMode
}
export type DataWarehouseMappingField = ColumnType
