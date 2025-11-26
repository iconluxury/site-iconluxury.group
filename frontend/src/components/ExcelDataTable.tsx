import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Button } from "./ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import { Badge } from "./ui/badge"
import { ArrowUpDown } from "lucide-react"
import { memo, useMemo, useState } from "react"

export interface ExcelData {
  headers: string[]
  rows: { row: (string | number | boolean | null)[] }[]
}

export interface ColumnMapping {
  style: number | null
  brand: number | null
  imageAdd: number | null
  readImage: number | null
  category: number | null
  colorName: number | null
}

export interface ExcelDataTableProps {
  excelData: ExcelData
  columnMapping?: ColumnMapping
  onColumnClick?: (index: number) => void
  isManualBrand?: boolean
}

const ExcelDataTable = ({
  excelData,
  columnMapping,
  onColumnClick,
}: ExcelDataTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: number
    direction: "asc" | "desc" | null
  }>({ key: -1, direction: null })

  // Debug: Log the columnMapping to verify it's correct
  // console.log("columnMapping:", columnMapping)

  const getDisplayValue = (cell: string | number | boolean | null): string => {
    if (cell == null) return ""
    return String(cell)
  }

  const sortedRows = useMemo(() => {
    if (sortConfig.key === -1 || sortConfig.direction === null)
      return excelData.rows
    const sorted = [...excelData.rows].sort((a, b) => {
      const aValue = getDisplayValue(a.row[sortConfig.key])
      const bValue = getDisplayValue(b.row[sortConfig.key])
      if (sortConfig.direction === "asc") {
        return aValue.localeCompare(bValue)
      }
      return bValue.localeCompare(aValue)
    })
    return sorted
  }, [excelData.rows, sortConfig])

  const handleSort = (columnIndex: number) => {
    setSortConfig((prev) => ({
      key: columnIndex,
      direction:
        prev.key === columnIndex && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const isColumnMapped = (index: number): boolean => {
    if (!columnMapping) return false
    const isMapped = Object.values(columnMapping).includes(index)
    // console.log(
    //   `Column ${index} (${excelData.headers[index]}): isMapped = ${isMapped}`,
    // ) // Debug
    return isMapped
  }

  const getMappedField = (index: number): string => {
    if (!columnMapping) return ""
    const field = Object.entries(columnMapping).find(
      ([_, value]) => value === index,
    )?.[0]
    return field ? field.replace(/([A-Z])/g, " $1").trim() : ""
  }

  if (!excelData.headers.length || !excelData.rows.length) {
    return <div className="p-4 text-muted-foreground">No data to display</div>
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {excelData.headers.map((header, index) => {
              const isMapped = isColumnMapped(index)
              const mappedField = getMappedField(index)
              return (
                <TableHead
                  key={index}
                  onClick={
                    onColumnClick ? () => onColumnClick(index) : undefined
                  }
                  className={`
                    ${onColumnClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    ${isMapped ? "bg-yellow-100 dark:bg-yellow-900/20 border-b-2 border-yellow-500" : ""}
                  `}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2">
                          <span className={isMapped ? "text-yellow-800 dark:text-yellow-200 font-medium" : ""}>
                            {header || `Column ${index + 1}`}
                          </span>
                          {isMapped && (
                            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700 dark:text-yellow-300 text-[10px] px-1 py-0 h-5">
                              {mappedField}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSort(index)
                            }}
                          >
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {onColumnClick
                            ? isMapped
                              ? `Mapped as ${mappedField} (click to remap)`
                              : `Click to map ${header || `Column ${index + 1}`}`
                            : `Column ${header || index + 1}`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className={isColumnMapped(cellIndex) ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}>
                  {getDisplayValue(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default memo(ExcelDataTable)
