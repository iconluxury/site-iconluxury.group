import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

interface DomainAggregation {
  domain: string
  totalResults: number
  positiveSortOrderCount: number
}

const ITEMS_PER_PAGE = 10 // Adjust this value as needed

const WhitelistGSerp: React.FC = () => {
  const [domains, setDomains] = useState<DomainAggregation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: "domain" | "totalResults" | "positiveSortOrderCount"
    direction: "asc" | "desc"
  }>({
    key: "positiveSortOrderCount",
    direction: "desc",
  })

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch(
          "https://external.iconluxury.group/api/whitelist-domains",
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch domains: ${response.status}`)
        }
        const data: DomainAggregation[] = await response.json()
        setDomains(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching domains:", error)
        setError("Failed to load data from the server.")
        setIsLoading(false)
      }
    }

    fetchDomains()
  }, [])

  // Sort domains based on sortConfig
  const sortedDomains = [...domains].sort((a, b) => {
    const { key, direction } = sortConfig
    if (key === "domain") {
      const aValue = a.domain.toLowerCase()
      const bValue = b.domain.toLowerCase()
      return direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    const aValue = a[key]
    const bValue = b[key]
    return direction === "asc" ? aValue - bValue : bValue - aValue
  })

  // Pagination calculations
  const totalPages = Math.ceil(sortedDomains.length / ITEMS_PER_PAGE)
  const paginatedDomains = sortedDomains.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const handleSort = (
    key: "domain" | "totalResults" | "positiveSortOrderCount",
  ) => {
    setSortConfig((prev) => {
      const newDirection =
        prev.key === key && prev.direction === "asc" ? "desc" : "asc"
      return { key, direction: newDirection }
    })
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Whitelist Domains</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("domain")}
                    className="flex items-center gap-1 p-0 h-auto font-bold"
                  >
                    Domain
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("totalResults")}
                    className="flex items-center gap-1 p-0 h-auto font-bold"
                  >
                    Total Results
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("positiveSortOrderCount")}
                    className="flex items-center gap-1 p-0 h-auto font-bold"
                  >
                    Positive Sort Order Count
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDomains.map((item) => (
                <TableRow key={item.domain}>
                  <TableCell className="font-medium">{item.domain}</TableCell>
                  <TableCell>{item.totalResults}</TableCell>
                  <TableCell>{item.positiveSortOrderCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default WhitelistGSerp
