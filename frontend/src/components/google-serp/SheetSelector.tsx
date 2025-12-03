import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AlertTriangle, Check, X } from "lucide-react"
import type React from "react"
import type { SheetConfig } from "./types"

interface SheetSelectorProps {
  sheetConfigs: SheetConfig[]
  activeSheetIndex: number
  sheetValidationResults: {
    sheetIndex: number
    missing: string[]
    isValid: boolean
  }[]
  onToggleSheetSelection: (index: number) => void
  onActiveSheetChange: (index: number) => void
  size?: "xs" | "sm" | "md"
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  sheetConfigs,
  activeSheetIndex,
  sheetValidationResults,
  onToggleSheetSelection,
  onActiveSheetChange,
  size = "sm",
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {sheetConfigs.map((sheet, index) => {
        const isActive = index === activeSheetIndex
        const isSelected = sheet.isSelected
        const validation = sheetValidationResults[index]
        const hasMissing = (validation?.missing ?? []).length > 0
        const showWarning = isSelected && hasMissing
        const sheetLabel = sheet.name || `Sheet ${index + 1}`
        const tooltipParts: string[] = [
          isSelected ? "Included in submission" : "Excluded from submission",
        ]
        if (isSelected) {
          tooltipParts.push(
            showWarning
              ? `Missing required: ${(validation?.missing ?? []).join(", ")}`
              : "Mapping ready",
          )
        } else if (hasMissing) {
          tooltipParts.push(
            `Missing required: ${(validation?.missing ?? []).join(", ")}`,
          )
        }
        const tooltipLabel = tooltipParts.join(" • ")

        return (
          <div key={sheet.name || index}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        onToggleSheetSelection(index)
                      }}
                      aria-label={`${
                        isSelected ? "Exclude" : "Include"
                      } ${sheetLabel}`}
                    />
                    <Button
                      size={
                        size === "xs"
                          ? "sm"
                          : ((size === "md" ? "default" : size) as any)
                      }
                      variant={
                        isActive ? "default" : isSelected ? "ghost" : "outline"
                      }
                      className={cn(
                        "gap-2",
                        isActive ? "font-bold" : "font-semibold",
                        !isSelected && "opacity-70",
                        showWarning &&
                          !isActive &&
                          "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
                      )}
                      onClick={() => onActiveSheetChange(index)}
                    >
                      {sheetLabel}
                      {!isSelected ? (
                        <X className="h-3 w-3" />
                      ) : showWarning ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      })}
    </div>
  )
}
