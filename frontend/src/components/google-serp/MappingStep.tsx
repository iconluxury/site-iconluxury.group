import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  GOOGLE_IMAGES_OPTIONAL_COLUMNS,
  GOOGLE_IMAGES_REQUIRED_COLUMNS,
  MAX_PREVIEW_ROWS,
} from "./constants"
import type {
  ColumnMapping,
  ColumnType,
  SheetConfig,
} from "./types"
import {
  formatMappingFieldLabel,
  getColumnPreview,
  getDisplayValue,
  indexToColumnLetter,
} from "./utils"

interface MappingStepProps {
  sheetConfigs: SheetConfig[]
  activeSheetIndex: number
  activeMappingField: ColumnType | "imageColumn" | null
  manualBrand: string
  sheetValidationResults: {
    sheetIndex: number
    missing: string[]
    isValid: boolean
  }[]
  validateForm: {
    isValid: boolean
    missing: ColumnType[]
  }
  headersAreValid: boolean
  mappedDataColumns: Set<number>
  mappedColumnsForHighlight: Set<number>
  selectedColumnIndex: number | null
  enableImageTargetMapping: boolean
  imageColumnIndex: number | null
  isManualBrandApplied: boolean
  onToggleSheetSelection: (index: number) => void
  onActiveSheetChange: (index: number) => void
  onSetActiveMappingField: (field: ColumnType | "imageColumn" | null) => void
  onDataColumnMap: (index: number, field: ColumnType) => void
  onClearMapping: (index: number) => void
  onManualBrandChange: (value: string) => void
  onApplyManualBrand: () => void
  onRemoveManualBrand: () => void
  onImageColumnMap: (index: number | null) => void
  onColumnMapFromGrid: (index: number) => void
}

export const MappingStep: React.FC<MappingStepProps> = ({
  sheetConfigs,
  activeSheetIndex,
  activeMappingField,
  manualBrand,
  sheetValidationResults,
  validateForm,
  headersAreValid,
  mappedDataColumns,
  mappedColumnsForHighlight,
  selectedColumnIndex,
  enableImageTargetMapping,
  imageColumnIndex,
  isManualBrandApplied,
  onToggleSheetSelection,
  onActiveSheetChange,
  onSetActiveMappingField,
  onDataColumnMap,
  onClearMapping,
  onManualBrandChange,
  onApplyManualBrand,
  onRemoveManualBrand,
  onImageColumnMap,
  onColumnMapFromGrid,
}) => {
  const activeSheet = sheetConfigs[activeSheetIndex]
  const excelData = activeSheet?.excelData
  const columnMapping = activeSheet?.columnMapping
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

  if (!excelData || !columnMapping) return null

  return (
    <div className="flex flex-col md:flex-row gap-4 items-stretch max-h-[70vh] overflow-auto">
      <div className="flex flex-col gap-4 items-stretch bg-transparent p-4 rounded-md border border-border w-full md:w-[40%] overflow-y-auto">
        {hasMultipleSheets && (
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 items-stretch">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <p className="font-semibold">Sheets</p>
                    <p className="text-xs text-muted-foreground">
                      Pick a sheet to adjust its column mapping.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {selectedSheetCount} selected
                  </Badge>
                </div>
                <SheetSelector
                  sheetConfigs={sheetConfigs}
                  activeSheetIndex={activeSheetIndex}
                  sheetValidationResults={sheetValidationResults}
                  onToggleSheetSelection={onToggleSheetSelection}
                  onActiveSheetChange={onActiveSheetChange}
                  size="sm"
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
                  {`Currently editing: ${
                    sheetConfigs[activeSheetIndex]?.name ||
                    `Sheet ${activeSheetIndex + 1}`
                  }`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Toggle a checkbox to include or exclude a sheet from the
                  submission.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {!validateForm.isValid && (
          <p className="text-red-500 text-sm font-medium">
            Missing required columns:{" "}
            {validateForm.missing
              .map((field) => formatMappingFieldLabel(field))
              .join(", ")}
            . Please map all required columns.
          </p>
        )}
        {!headersAreValid && (
          <p className="text-red-500 text-sm font-medium">
            Selected header row is empty. Choose a different header row before
            mapping.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Select a field below, then click a column in the preview grid to map
          it instantly.
        </p>
        <p className="font-bold">Required Columns</p>
        {GOOGLE_IMAGES_REQUIRED_COLUMNS.map((field) => (
          <div
            key={field}
            className={cn(
              "flex flex-row gap-2 items-center p-2 rounded-md border cursor-pointer",
              activeMappingField === field
                ? "border-primary bg-primary/10"
                : "border-transparent",
            )}
            onClick={() => onSetActiveMappingField(field)}
          >
            <p className="w-[120px] font-semibold">{field}:</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <select
                    value={
                      columnMapping[field] !== null ? columnMapping[field]! : ""
                    }
                    onChange={(e) =>
                      onDataColumnMap(Number(e.target.value), field)
                    }
                    onFocus={() => onSetActiveMappingField(field)}
                    onClick={() => onSetActiveMappingField(field)}
                    className="flex-1 border rounded p-1"
                    aria-label={`Map ${field} column`}
                  >
                    <option value="">Unmapped</option>
                    {excelData.headers.map((header, index) => (
                      <option
                        key={index}
                        value={index}
                        disabled={
                          mappedDataColumns.has(index) &&
                          columnMapping[field] !== index
                        }
                      >
                        {header || `Column ${indexToColumnLetter(index)}`}
                      </option>
                    ))}
                  </select>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select Excel column for {field}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {columnMapping[field] !== null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClearMapping(columnMapping[field]!)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear mapping</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="w-[150px] text-sm text-muted-foreground truncate">
              {getColumnPreview(columnMapping[field], excelData.rows)}
            </div>
          </div>
        ))}
        {GOOGLE_IMAGES_OPTIONAL_COLUMNS.length > 0 && (
          <>
            <p className="font-bold mt-4">Optional Columns</p>
            {GOOGLE_IMAGES_OPTIONAL_COLUMNS.map((field) => (
              <div
                key={field}
                className={cn(
                  "flex flex-row gap-2 items-center p-2 rounded-md border cursor-pointer",
                  activeMappingField === field
                    ? "border-primary bg-primary/10"
                    : "border-transparent",
                )}
                onClick={() => onSetActiveMappingField(field)}
              >
                <p className="w-[120px] font-semibold">{field}:</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <select
                        value={
                          columnMapping[field] !== null
                            ? columnMapping[field]!
                            : ""
                        }
                        onChange={(e) =>
                          onDataColumnMap(Number(e.target.value), field)
                        }
                        onFocus={() => onSetActiveMappingField(field)}
                        onClick={() => onSetActiveMappingField(field)}
                        className="flex-1 border rounded p-1"
                        aria-label={`Map ${field} column`}
                      >
                        <option value="">Unmapped</option>
                        {excelData.headers.map((header, index) => (
                          <option
                            key={index}
                            value={index}
                            disabled={
                              mappedDataColumns.has(index) &&
                              columnMapping[field] !== index
                            }
                          >
                            {header || `Column ${indexToColumnLetter(index)}`}
                          </option>
                        ))}
                      </select>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select Excel column for {field}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {columnMapping[field] !== null && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClearMapping(columnMapping[field]!)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear mapping</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div className="w-[150px] text-sm text-muted-foreground truncate">
                  {getColumnPreview(columnMapping[field], excelData.rows)}
                </div>
              </div>
            ))}
          </>
        )}
        {GOOGLE_IMAGES_OPTIONAL_COLUMNS.includes("brand") &&
          columnMapping.brand === null &&
          !isManualBrandApplied && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <p className="w-[120px]">Add Brand Column:</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        placeholder="Add Brand for All Rows (Optional)"
                        value={manualBrand}
                        onChange={(e) => onManualBrandChange(e.target.value)}
                        aria-label="Manual brand input"
                        className="flex-1"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enter a brand to apply to all rows</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  size="sm"
                  onClick={onApplyManualBrand}
                  disabled={!manualBrand.trim()}
                >
                  Apply
                </Button>
                {isManualBrandApplied && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onRemoveManualBrand}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {isManualBrandApplied && (
                <Badge className="mt-2">Manual Brand Column Applied</Badge>
              )}
            </div>
          )}
        {enableImageTargetMapping && (
          <>
            <p className="font-bold mt-4">Image Target Column</p>
            <div
              className={cn(
                "flex flex-row gap-2 items-center p-2 rounded-md border cursor-pointer",
                activeMappingField === "imageColumn"
                  ? "border-primary bg-primary/10"
                  : "border-transparent",
              )}
              onClick={() => onSetActiveMappingField("imageColumn")}
            >
              <p className="w-[120px] font-semibold">Target Anchor:</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <select
                      value={imageColumnIndex ?? ""}
                      onChange={(e) =>
                        onImageColumnMap(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      onFocus={() => onSetActiveMappingField("imageColumn")}
                      onClick={() => onSetActiveMappingField("imageColumn")}
                      className="flex-1 border rounded p-1"
                      aria-label="Map image column"
                    >
                      <option value="">Unmapped</option>
                      {excelData.headers.map((header, index) => (
                        <option key={index} value={index}>
                          {header || `Column ${indexToColumnLetter(index)}`}
                        </option>
                      ))}
                    </select>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Select the column that contains the target anchor used to
                      place downloaded images
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {imageColumnIndex !== null && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          onImageColumnMap(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear mapping</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <div className="w-[150px] text-sm text-muted-foreground truncate">
                {getColumnPreview(imageColumnIndex, excelData.rows)}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="overflow-auto border rounded-md p-2 w-full md:w-[60%] max-h-[70vh] mt-4 md:mt-0">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            <TableRow>
              {excelData.headers.map((header, index) => {
                const isMapped = mappedColumnsForHighlight.has(index)
                const isSelected = selectedColumnIndex === index
                return (
                  <TableHead
                    key={index}
                    className={cn(
                      "sticky top-0 cursor-pointer",
                      isSelected
                        ? "bg-primary/20 border-2 border-primary"
                        : isMapped
                          ? "bg-primary/10"
                          : "bg-muted",
                      activeMappingField && "hover:bg-primary/10",
                    )}
                    onClick={() => onColumnMapFromGrid(index)}
                    tabIndex={activeMappingField ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (!activeMappingField) return
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onColumnMapFromGrid(index)
                      }
                    }}
                    role={activeMappingField ? "button" : undefined}
                    aria-pressed={isSelected}
                  >
                    {header || `Column ${indexToColumnLetter(index)}`}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {excelData.rows.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => {
                  const isMissingRequired =
                    (columnMapping.style === cellIndex ||
                      columnMapping.msrp === cellIndex) &&
                    !cell
                  const isSelectedColumn = selectedColumnIndex === cellIndex
                  const isMappedColumn =
                    mappedColumnsForHighlight.has(cellIndex)

                  return (
                    <TableCell
                      key={cellIndex}
                      className={cn(
                        "max-w-[200px] truncate",
                        isMissingRequired
                          ? "bg-red-100"
                          : isSelectedColumn
                            ? "bg-primary/10"
                            : isMappedColumn
                              ? "bg-green-50"
                              : "",
                        activeMappingField
                          ? "cursor-pointer"
                          : "cursor-default",
                      )}
                      onClick={() => onColumnMapFromGrid(cellIndex)}
                    >
                      {getDisplayValue(cell)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
