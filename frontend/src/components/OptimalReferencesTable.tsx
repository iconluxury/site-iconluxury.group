import { useEffect, useState } from "react"
import { Card, CardContent } from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

interface Reference {
  category: string
  url: string
}

interface ReferencesData {
  [key: string]: string
}

const OptimalReferencesTable = () => {
  const [references, setReferences] = useState<Reference[]>([])

  // Fetch data from the GitHub URL on component mount
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/iconluxurygroup/settings-static-data/refs/heads/main/optimal-references.json",
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.json() as Promise<ReferencesData>
      })
      .then((data) => {
        // Transform the JSON object into an array of Reference objects
        const fetchedReferences = Object.entries(data).map(
          ([category, url]) => ({
            category,
            url,
          }),
        )
        setReferences(fetchedReferences)
      })
      .catch((error) => {
        console.error("Error fetching references:", error)
        setReferences([]) // Fallback to empty array on error
      })
  }, []) // Empty dependency array ensures this runs only once on mount

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Image URL</TableHead>
              <TableHead>Image</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {references.map((ref) => (
              <TableRow key={ref.category}>
                <TableCell>{ref.category}</TableCell>
                <TableCell className="max-w-xs truncate" title={ref.url}>
                  {ref.url}
                </TableCell>
                <TableCell>
                  <img
                    src={ref.url}
                    alt={ref.category}
                    className="h-[100px] w-[100px] object-cover rounded-md"
                    loading="lazy"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default OptimalReferencesTable
