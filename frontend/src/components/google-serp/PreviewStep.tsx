import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AlertTriangle, Check, X } from "lucide-react"
import type React from "react"
import { SheetSelector } from "./SheetSelector"
import { MAX_PREVIEW_ROWS } from "./constants"
import type { CellValue, SheetConfig } from "./types"
import { getDisplayValue } from "./utils"

interface PreviewStepProps {
  sheetConfigs: SheetConfig[]
  activeSheetIndex: number
  headerIndex: number
  rawData: CellValue[][]
  sheetValidationResults: {
    sheetIndex: number
    missing: string[]
    isValid: boolean
  }[]
  onHeaderChange: (index: number) => void
  onToggleSheetSelection: (index: number) => void
  onActiveSheetChange: (index: number) => void
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  sheetConfigs,
  activeSheetIndex,
  headerIndex,
  rawData,
  sheetValidationResults,
  onHeaderChange,
  onToggleSheetSelection,
  onActiveSheetChange,
}) => {
  const activeSheet = sheetConfigs[activeSheetIndex]
  const hasMultipleSheets = sheetConfigs.length > 1
  const selectedSheetCount = sheetConfigs.filter((s) => s.isSelected).length

  const activeSheetValidation = sheetValidationResults[activeSheetIndex] ?? null
  const activeSheetIsReady = Boolean(activeSheetValidation?.isValid)
  const activeSheetMissingColumns = activeSheetValidation?.missing ?? []
  const activeSheetIsSelected = activeSheet?.isSelected ?? false
  const activeSheetStatusLabel = activeSheetIsSelected
    ? activeSheetIsReady
      ? "Ready"
      : "Needs mapping"
    : "Excluded"
  const ActiveSheetStatusIcon = activeSheetIsSelected
    ? activeSheetIsReady
      ? Check
      : AlertTriangle
    : X
  const activeSheetStatusColor = activeSheetIsSelected
    ? activeSheetIsReady
      ? "text-green-400"
      : "text-yellow-400"
    : "text-muted-foreground"
  const activeSheetStatusTooltip = activeSheetIsSelected
    ? activeSheetIsReady
      ? "All required columns are mapped."
      : activeSheetMissingColumns.length > 0
        ? `Missing required columns: ${activeSheetMissingColumns.join(", ")}`
        : "Map all required columns before submitting."
    : "Sheet will be skipped during submission."

  return (
    <div className="flex flex-col gap-4 items-stretch">
      {hasMultipleSheets && (
        <Card className="bg-card border-border">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col gap-2 items-stretch">
              <div className="flex flex-row justify-between items-center">
                <p className="font-semibold">Sheets</p>
                <div className="flex flex-row gap-2 items-center">
                  <Badge variant="secondary">
                    {selectedSheetCount} selected
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Viewing{" "}
                    {sheetConfigs[activeSheetIndex]?.name ||
                      `Sheet ${activeSheetIndex + 1}`}
                  </p>
                </div>
              </div>
              <SheetSelector
                sheetConfigs={sheetConfigs}
                activeSheetIndex={activeSheetIndex}
                sheetValidationResults={sheetValidationResults}
                onToggleSheetSelection={onToggleSheetSelection}
                onActiveSheetChange={onActiveSheetChange}
                size="xs"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-row gap-2 text-xs text-muted-foreground items-center">
                      <ActiveSheetStatusIcon
                        className={cn("h-3 w-3", activeSheetStatusColor)}
                      />
                      <p>{activeSheetStatusLabel}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{activeSheetStatusTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="text-xs text-muted-foreground">
                Select a sheet to preview its header row and sample data.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the checkbox to include or exclude sheets from submission.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-row items-center gap-2">
        <p>Select Header Row:</p>
        <select
          value={headerIndex}
          onChange={(e) => onHeaderChange(Number(e.target.value))}
          className="w-[150px] border rounded p-1"
          aria-label="Select header row"
        >
          {rawData.slice(0, 20).map((_, index) => (
            <option key={index} value={index}>
              Row {index + 1} {index === headerIndex ? "(Selected)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto border rounded-md p-2">
        <Table>
          <TableBody>
            {rawData.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={cn(
                  "cursor-pointer hover:bg-primary/10",
                  rowIndex === headerIndex && "bg-primary/20 font-bold",
                )}
                onClick={() => onHeaderChange(rowIndex)}
              >
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    className="whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                  >
                    {getDisplayValue(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
