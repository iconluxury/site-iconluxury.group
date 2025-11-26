import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"

const changes = [
  {
    version: "1.2.0",
    date: "2025-11-26",
    items: [
      "Added new Tools section in sidebar",
      "Integrated Google Images, Data Warehouse, Image Links, and Crop tools",
      "Updated Dashboard layout with Feed and Changelog",
    ],
  },
  {
    version: "1.1.0",
    date: "2025-11-20",
    items: ["Improved scraping job performance", "Added user agent management"],
  },
  {
    version: "1.0.0",
    date: "2025-11-01",
    items: ["Initial release", "Basic scraping functionality"],
  },
]

export default function Changelog() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Changelog</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {changes.map((change, index) => (
              <div key={index}>
                <h3 className="font-semibold text-lg">
                  {change.version}{" "}
                  <span className="text-sm text-muted-foreground font-normal">
                    ({change.date})
                  </span>
                </h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                  {change.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
