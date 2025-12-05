import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type React from "react"
import type { DataWarehouseMode, SheetConfig } from "./types"
import {
  getColumnMappingEntries,
  getColumnPreview,
  indexToColumnLetter,
} from "./utils"

interface SubmitStepProps {
  sheetConfigs: SheetConfig[]
  activeSheetIndex: number
  emailRecipient: string
  isEmailValid: boolean
  mode: DataWarehouseMode
  currency: "USD" | "EUR"
  enableImageTargetMapping: boolean
  imageColumnIndex: number | null
  onCurrencyChange: (currency: "USD" | "EUR") => void
}

export const SubmitStep: React.FC<SubmitStepProps> = ({
  sheetConfigs,
  activeSheetIndex,
  emailRecipient,
  isEmailValid,
  mode,
  currency,
  enableImageTargetMapping,
  imageColumnIndex,
  onCurrencyChange,
}) => {
  const activeSheet = sheetConfigs[activeSheetIndex]
  const excelData = activeSheet?.excelData
  const columnMapping = activeSheet?.columnMapping
  const isManualBrandApplied = Boolean(activeSheet?.manualBrandValue)
  const manualBrand = activeSheet?.manualBrandValue

  if (!excelData || !columnMapping) return null

  return (
    <div className="flex flex-col gap-4 items-stretch">
      <div className="flex flex-col items-start gap-4">
        <p>Rows: {excelData.rows.length}</p>
        <div className="flex flex-col gap-2">
          <Label>Send results to email</Label>
          {emailRecipient ? (
            <p className="font-medium">{emailRecipient}</p>
          ) : (
            <p className="text-sm text-red-500">
              No email parameter detected. Add ?sendToEmail=example@domain.com
              (or email/userEmail) to the iframe URL.
            </p>
          )}
          {!isEmailValid && emailRecipient && (
            <p className="text-sm text-red-500 mt-1">
              The email supplied via the URL looks invalid. Update the iframe
              query parameter before submitting.
            </p>
          )}
        </div>
        {mode !== "imagesOnly" && (
          <div className="flex flex-row items-center gap-2">
            <p>Currency:</p>
            <select
              value={currency}
              onChange={(e) =>
                onCurrencyChange(e.target.value as "USD" | "EUR")
              }
              className="w-[100px] border rounded p-1"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        )}
        <p>Mapped Columns:</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getColumnMappingEntries(columnMapping)
              .filter(
                ([col, index]) =>
                  index !== null && col !== "readImage" && col !== "imageAdd",
              )
              .map(([col, index]) => (
                <TableRow key={col}>
                  <TableCell>{col}</TableCell>
                  <TableCell>
                    {excelData.headers[index!] ||
                      `Column ${indexToColumnLetter(index!)}`}
                  </TableCell>
                  <TableCell>
                    {getColumnPreview(index, excelData.rows)}
                  </TableCell>
                </TableRow>
              ))}
            {enableImageTargetMapping && imageColumnIndex !== null && (
              <TableRow>
                <TableCell>Image Target</TableCell>
                <TableCell>
                  {excelData.headers[imageColumnIndex] ||
                    `Column ${indexToColumnLetter(imageColumnIndex)}`}
                </TableCell>
                <TableCell>
                  {getColumnPreview(imageColumnIndex, excelData.rows)}
                </TableCell>
              </TableRow>
            )}
            {isManualBrandApplied && (
              <TableRow>
                <TableCell>Manual Brand</TableCell>
                <TableCell>BRAND (Manual)</TableCell>
                <TableCell>
                  {excelData.rows[0]?.[excelData.headers.length - 1] ||
                    manualBrand}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
