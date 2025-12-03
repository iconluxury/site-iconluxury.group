import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { useState } from "react"

interface CurlDisplayProps {
  url: string
  method: string
  formDataEntries: Record<string, string | File | null>
}

export function CurlDisplay({ url, method, formDataEntries }: CurlDisplayProps) {
  const [copied, setCopied] = useState(false)

  const generateCurl = () => {
    let cmd = `curl -X ${method} '${url}' \\\n`
    Object.entries(formDataEntries).forEach(([key, value]) => {
      if (value === null) return
      if (value instanceof File) {
        cmd += `  -F "${key}=@${value.name}" \\\n`
      } else {
        cmd += `  -F "${key}=${value}" \\\n`
      }
    })
    // Remove last backslash and newline if present
    if (cmd.endsWith("\\\n")) {
        return cmd.slice(0, -2)
    }
    return cmd
  }

  const curlCommand = generateCurl()

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="mt-4 bg-slate-950 text-slate-50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between py-2 border-b border-slate-800">
        <CardTitle className="text-sm font-mono text-slate-300">cURL Command (Dev Mode)</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-slate-300 hover:text-white hover:bg-slate-800">
          <Copy className="h-4 w-4 mr-2" />
          {copied ? "Copied!" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-green-400">
          {curlCommand}
        </pre>
      </CardContent>
    </Card>
  )
}
