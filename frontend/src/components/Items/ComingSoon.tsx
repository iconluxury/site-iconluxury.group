import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import type React from "react"

const ComingSoon: React.FC = () => {
  return (
    <div className="max-w-full mx-auto px-6 md:px-12 py-10">
      <div className="flex flex-col gap-6 items-stretch">
        <Alert className="bg-gray-50 text-gray-800 border-none rounded-md">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm">
            Features are in development.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export default ComingSoon
