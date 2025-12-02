import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader2 } from "lucide-react"
import type React from "react"

interface UploadStepProps {
  isLoading: boolean
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export const UploadStep: React.FC<UploadStepProps> = ({
  isLoading,
  onFileChange,
}) => {
  return (
    <div className="flex flex-col gap-4 items-stretch">
      <p className="text-lg font-bold">
        Upload Excel File for Google Images Scrape
      </p>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                disabled={isLoading}
                className="bg-background border-input cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80"
                aria-label="Upload Excel file"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload an Excel file (.xlsx or .xls) up to 10MB</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
    </div>
  )
}
