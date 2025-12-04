import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader2, Upload } from "lucide-react"
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
    <div className="flex flex-col gap-4 items-stretch mt-6">
      {/* Title removed as per new UX */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) onFileChange({ target: { files: [file] } } as any)
        }}
        onClick={() => document.getElementById('file-upload-step')?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">Excel files (.xlsx, .xls) up to 50MB</p>
        </div>
        <Input
          id="file-upload-step"
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileChange}
          disabled={isLoading}
          className="hidden"
        />
      </div>
      {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
    </div>
  )
}
