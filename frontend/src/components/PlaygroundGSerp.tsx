import { ExternalLink, Loader2 } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Textarea } from "./ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

const proxyData: Record<string, { region: string; url: string }[]> = {
  "Google Cloud": [
    {
      region: "SOUTHAMERICA-WEST1",
      url: "https://southamerica-west1-image-scraper-451516.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-CENTRAL1",
      url: "https://us-central1-image-scraper-451516.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-EAST1",
      url: "https://us-east1-image-scraper-451516.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-EAST4",
      url: "https://us-east4-image-scraper-451516.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST1",
      url: "https://us-west1-image-scraper-451516.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST4",
      url: "https://europe-west4-image-scraper-451516.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST4",
      url: "https://us-west4-image-proxy-453319.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST1",
      url: "https://europe-west1-image-proxy-453319.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-NORTH1",
      url: "https://europe-north1-image-proxy-453319.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-EAST1",
      url: "https://asia-east1-image-proxy-453319.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-SOUTH1",
      url: "https://us-south1-gen-lang-client-0697423475.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST3",
      url: "https://us-west3-gen-lang-client-0697423475.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-EAST5",
      url: "https://us-east5-gen-lang-client-0697423475.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-SOUTHEAST1",
      url: "https://asia-southeast1-gen-lang-client-0697423475.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST2",
      url: "https://us-west2-gen-lang-client-0697423475.cloudfunctions.net/main/fetch",
    },
    {
      region: "NORTHAMERICA-NORTHEAST2",
      url: "https://northamerica-northeast2-image-proxy2-453320.cloudfunctions.net/main/fetch",
    },
    {
      region: "SOUTHAMERICA-EAST1",
      url: "https://southamerica-east1-image-proxy2-453320.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST8",
      url: "https://europe-west8-icon-image3.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-SOUTHWEST1",
      url: "https://europe-southwest1-icon-image3.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST6",
      url: "https://europe-west6-icon-image3.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST3",
      url: "https://europe-west3-icon-image3.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST2",
      url: "https://europe-west2-icon-image3.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST9",
      url: "https://europe-west9-image-proxy2-453320.cloudfunctions.net/main/fetch",
    },
    {
      region: "MIDDLEEAST-WEST1",
      url: "https://me-west1-image-proxy4.cloudfunctions.net/main/fetch",
    },
    {
      region: "MIDDLEEAST-CENTRAL1",
      url: "https://me-central1-image-proxy4.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST12",
      url: "https://europe-west12-image-proxy4.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST10",
      url: "https://europe-west10-image-proxy4.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-NORTHEAST2",
      url: "https://asia-northeast2-image-proxy4.cloudfunctions.net/main/fetch",
    },
    {
      region: "NORTHAMERICA-NORTHEAST1",
      url: "https://northamerica-northeast1-proxy2-455013.cloudfunctions.net/main/fetch",
    },
  ],
  AWS: [
    { region: "us-east-1", url: "https://us-east-1-aws-scraper.example.com" },
    { region: "eu-west-1", url: "https://eu-west-1-aws-scraper.invalid" },
  ],
  Azure: [
    {
      region: "eastus",
      url: "https://prod-fetch.azurewebsites.net/api/HttpTrigger1?code=aW--Ht7EhrEfmS1BQLz4236XyYXlCK4G-70_1rl0Ot7zAzFuZIXBYA==",
    },
    { region: "westeurope", url: "https://westeurope-azure-scraper.broken" },
  ],
  DigitalOcean: [
    { region: "nyc1", url: "https://nyc1-do-scraper.example.com" },
    { region: "ams3", url: "https://ams3-do-scraper.unreachable" },
  ],
  DataProxy: [
    {
      region: "US-EAST4",
      url: "https://us-east4-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "SOUTHAMERICA-WEST1",
      url: "https://southamerica-west1-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-CENTRAL1",
      url: "https://us-central1-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-EAST1",
      url: "https://us-east1-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-EAST2",
      url: "https://us-east2-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST1",
      url: "https://us-west1-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST3",
      url: "https://us-west3-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST4",
      url: "https://us-west4-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "NORTHAMERICA-NORTHEAST3",
      url: "https://northamerica-northeast3-proxy1-454912.cloudfunctions.net/main/fetch",
    },
    {
      region: "NORTHAMERICA-NORTHEAST2",
      url: "https://northamerica-northeast2-proxy2-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-CENTRAL1",
      url: "https://us-central1-proxy2-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-EAST5",
      url: "https://us-east5-proxy2-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST2",
      url: "https://us-west2-proxy2-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-WEST6",
      url: "https://us-west6-proxy2-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-SOUTHEAST1",
      url: "https://asia-southeast1-proxy2-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "AUSTRALIA-SOUTHEAST1",
      url: "https://australia-southeast1-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "AUSTRALIA-SOUTHEAST2",
      url: "https://australia-southeast2-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "SOUTHAMERICA-EAST1",
      url: "https://southamerica-east1-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "SOUTHAMERICA-EAST2",
      url: "https://southamerica-east2-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "SOUTHAMERICA-WEST1",
      url: "https://southamerica-west1-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "US-SOUTH1",
      url: "https://us-south1-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-SOUTH1",
      url: "https://asia-south1-proxy3-455013.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-NORTH1",
      url: "https://europe-north1-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-SOUTHWEST1",
      url: "https://europe-southwest1-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST1",
      url: "https://europe-west1-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST4",
      url: "https://europe-west4-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST5",
      url: "https://europe-west5-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST6",
      url: "https://europe-west6-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST8",
      url: "https://europe-west8-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-CENTRAL2",
      url: "https://europe-central2-proxy4-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST12",
      url: "https://europe-west12-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST2",
      url: "https://europe-west2-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST3",
      url: "https://europe-west3-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST6",
      url: "https://europe-west6-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST9",
      url: "https://europe-west9-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST11",
      url: "https://europe-west11-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-NORTHEAST1",
      url: "https://asia-northeast1-proxy5-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-EAST1",
      url: "https://asia-east1-proxy6-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-EAST2",
      url: "https://asia-east2-proxy6-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "ASIA-NORTHEAST2",
      url: "https://asia-northeast2-proxy6-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "EUROPE-WEST10",
      url: "https://europe-west10-proxy6-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "MIDDLEEAST-CENTRAL1",
      url: "https://me-central1-proxy6-455014.cloudfunctions.net/main/fetch",
    },
    {
      region: "MIDDLEEAST-CENTRAL2",
      url: "https://me-central2-proxy6-455014.cloudfunctions.net/main/fetch",
    },
  ],
}

const PlaygroundGSerp: React.FC = () => {
  const [url, setUrl] = useState<string>(
    "https://www.google.com/search?q=flowers&udm=2",
  )
  const [provider, setProvider] = useState<string>("DataProxy")
  const [selectedUrl, setSelectedUrl] = useState<string>(
    proxyData.DataProxy[0].url,
  )
  const [regionFilter, setRegionFilter] = useState<string>("")
  const [response, setResponse] = useState<string>("")
  const [htmlPreview, setHtmlPreview] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleProviderChange = (value: string) => {
    setProvider(value)
    setRegionFilter("")
    setSelectedUrl(proxyData[value][0].url)
  }

  const handleUrlChange = (value: string) => {
    setSelectedUrl(value)
  }

  const handleTestRequest = async () => {
    setIsLoading(true)
    setResponse("")
    setHtmlPreview("")

    try {
      const res = await fetch(selectedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()
      console.log("API Response:", data)
      setResponse(JSON.stringify(data, null, 2))
      if (data.result) {
        console.log("Setting HTML preview:", data.result.substring(0, 100))
        setHtmlPreview(data.result)
      } else {
        console.log("No HTML content found in data.result")
      }
    } catch (error) {
      setResponse(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const filtered = proxyData[provider].filter((proxy) =>
      proxy.region.toLowerCase().includes(regionFilter.toLowerCase()),
    )
    if (filtered.length > 0) {
      if (!filtered.some((proxy) => proxy.url === selectedUrl)) {
        setSelectedUrl(filtered[0].url)
      }
    } else {
      setSelectedUrl("")
    }
  }, [provider, regionFilter])

  const filteredProxies = proxyData[provider].filter((proxy) =>
    proxy.region.toLowerCase().includes(regionFilter.toLowerCase()),
  )

  return (
    <div className="p-4 w-full">
      <div className="mb-6">
        <h2 className="text-md font-semibold mb-2">Test Parameters</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor="search-url" className="text-sm">
                Search URL
              </Label>
              <Input
                id="search-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://www.google.com/search?q=flowers&udm=2"
                className="mt-1"
                required
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Label htmlFor="provider" className="text-sm">
                Provider
              </Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider" className="mt-1">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(proxyData).map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor="endpoint-url" className="text-sm">
                Endpoint URL
              </Label>
              <Input
                id="region-filter"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="Filter regions"
                className="mt-1 mb-2"
              />
              {filteredProxies.length > 0 ? (
                <Select value={selectedUrl} onValueChange={handleUrlChange}>
                  <SelectTrigger id="endpoint-url">
                    <SelectValue placeholder="Select endpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProxies.map((proxy) => (
                      <SelectItem key={proxy.url} value={proxy.url}>
                        {proxy.region} - {proxy.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="No regions match the filter" />
                  </SelectTrigger>
                </Select>
              )}
            </div>
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleTestRequest}
                      disabled={isLoading || !url.trim() || !selectedUrl}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      POST
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send test request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-md font-semibold mb-2">Response</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-[400px] border rounded-md bg-muted/10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <Textarea
              value={response}
              readOnly
              className="h-[400px] font-mono text-xs bg-slate-950 text-slate-50 resize-y"
              placeholder="Response will appear here after testing"
            />
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-md font-semibold">HTML Preview</h2>
            {htmlPreview && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newWindow = window.open("", "_blank")
                        if (newWindow) {
                          newWindow.document.write(htmlPreview)
                          newWindow.document.close()
                        } else {
                          alert(
                            "Popup blocked. Please allow popups for this site.",
                          )
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open preview in new tab</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {htmlPreview && (
            <iframe
              srcDoc={htmlPreview}
              className="w-full h-[400px] border rounded-md bg-white"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default PlaygroundGSerp
