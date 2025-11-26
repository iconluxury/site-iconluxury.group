import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import React, { useState, useEffect } from "react"
import { FiGithub } from "react-icons/fi"
import PromoSERP from "../../../components/ComingSoon"
import ApiStatusManagement from "../../../components/UserSettings/ApiStatusManagement"

import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table"
import { Separator } from "../../../components/ui/separator"

interface JobSummary {
  id: number
  inputFile: string
  fileEnd: string | null
  user: string
  rec: number
  img: number
}

interface SubscriptionStatus {
  hasSubscription: boolean
  isTrial: boolean
  isDeactivated: boolean
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token")
}

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken()
  const response = await fetch(
    "https://api.iconluxury.group/api/v1/subscription-status/serp",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  )
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized: Please log in again.")
    }
    throw new Error(`Failed to fetch subscription status: ${response.status}`)
  }
  return response.json()
}

async function fetchJobs(page: number): Promise<JobSummary[]> {
  const token = getAuthToken()
  const response = await fetch(
    `https://external.iconluxury.group/api/scraping-jobs?page=${page}&page_size=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  )
  if (!response.ok) throw new Error(`Failed to fetch jobs: ${response.status}`)
  return response.json()
}

export const Route = createFileRoute("/_layout/scraping-api/explore")({
  component: Explore,
})

function Explore() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "pending"
  >("all")

  const {
    data: subscriptionStatus,
    isLoading: isSubLoading,
    error: subError,
  } = useQuery({
    queryKey: ["subscriptionStatus", "serp"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes("Unauthorized")) return false
      return failureCount < 3
    },
  })

  const { data: freshJobs, isFetching } = useQuery({
    queryKey: ["scraperJobs", page],
    queryFn: () => fetchJobs(page),
    placeholderData: keepPreviousData,
    enabled:
      !!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial,
  })

  const { data: apiStatusSettings } = useQuery({
    queryKey: ["apiStatusSettings"],
    queryFn: () => {
      const storedSettings = localStorage.getItem("apiStatusSettings")
      return storedSettings
        ? JSON.parse(storedSettings)
        : {
            "dev-service-distro-image": {
              isActive: true,
              isLimited: false,
              isDeactivated: false,
            },
            "prod-service-distro-image": {
              isActive: true,
              isLimited: false,
              isDeactivated: false,
            },
            "beta-service-distro-image": {
              isActive: true,
              isLimited: false,
              isDeactivated: false,
            },
          }
    },
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (freshJobs) {
      setJobs((prev) => (page === 1 ? freshJobs : [...prev, ...freshJobs]))
    }
  }, [freshJobs, page])

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.inputFile
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && job.fileEnd !== null) ||
      (statusFilter === "pending" && job.fileEnd === null)
    return matchesSearch && matchesStatus
  })

  const handleLoadMore = () => setPage((prev) => prev + 1)

  if (isSubLoading) {
    return (
      <div className="container mx-auto p-6 bg-white text-gray-800">
        <p>Loading your data...</p>
      </div>
    )
  }

  if (subError) {
    return (
      <div className="container mx-auto p-6 bg-white text-gray-800">
        <p className="text-red-500">
          {subError.message === "Unauthorized: Please log in again."
            ? "Session expired. Please log in again."
            : "Error loading status. Please try again later."}
        </p>
        {subError.message.includes("Unauthorized") && (
          <Button
            className="mt-4"
            variant="default"
            onClick={() => navigate({ to: "/login" })}
          >
            Log In
          </Button>
        )}
      </div>
    )
  }

  const { hasSubscription, isTrial, isDeactivated } = subscriptionStatus || {
    hasSubscription: false,
    isTrial: false,
    isDeactivated: false,
  }
  const isLocked = !hasSubscription && !isTrial
  const isFullyDeactivated = isDeactivated && !hasSubscription

  // Get status for each environment
  const devStatus = apiStatusSettings?.["dev-service-distro-image"] || {
    isActive: true,
    isLimited: false,
    isDeactivated: false,
  }
  const prodStatus = apiStatusSettings?.["prod-service-distro-image"] || {
    isActive: true,
    isLimited: false,
    isDeactivated: false,
  }
  const betaStatus = apiStatusSettings?.["beta-service-distro-image"] || {
    isActive: true,
    isLimited: false,
    isDeactivated: false,
  }

  const getStatusBadge = (status: {
    isActive: boolean
    isLimited: boolean
    isDeactivated: boolean
  }) => {
    if (status.isDeactivated) return { text: "Down", color: "red" }
    if (status.isLimited) return { text: "Limited", color: "yellow" }
    if (status.isActive) return { text: "Active", color: "green" }
    return { text: "Unknown", color: "red" }
  }

  const devBadge = getStatusBadge(devStatus)
  const prodBadge = getStatusBadge(prodStatus)
  const betaBadge = getStatusBadge(betaStatus)

  return (
    <div className="container mx-auto p-6 bg-white text-gray-800">
      <div className="flex items-center justify-between py-6 flex-wrap gap-4">
        <div className="text-left flex-1">
          <h1 className="text-xl font-bold text-black">
            Scraping Jobs
          </h1>
          <p className="text-sm text-gray-600">
            View and manage scraping jobs
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      {isLocked ? (
        <PromoSERP />
      ) : isFullyDeactivated ? (
        <div className="flex justify-between items-center w-full p-4 bg-red-50 rounded-md">
          <p className="text-gray-800">Your tools have been deactivated.</p>
          <Button
            variant="destructive"
            onClick={() => navigate({ to: "/proxies/pricing" })}
          >
            Reactivate Now
          </Button>
        </div>
      ) : (
        <div className="flex gap-6 justify-between items-stretch flex-wrap">
          <div className="flex-1 min-w-full md:min-w-[65%]">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Search Jobs by Input File..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-[250px] border-green-300 focus:border-green-500 focus:ring-green-500 bg-white text-gray-800 placeholder:text-gray-500"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "all" | "completed" | "pending")
                }
              >
                <SelectTrigger className="w-full md:w-[200px] border-green-300 focus:border-green-500 focus:ring-green-500 bg-white text-gray-700">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow 
                          key={job.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate({
                              to: "/scraping-api/scraping-jobs/$jobId",
                              params: { jobId: job.id.toString() },
                            })
                          }
                        >
                          <TableCell className="font-medium">{job.id}</TableCell>
                          <TableCell>{job.inputFile}</TableCell>
                          <TableCell>{job.rec} records, {job.img} images</TableCell>
                          <TableCell>
                            <Badge variant={job.fileEnd ? "default" : "secondary"}>
                              {job.fileEnd ? "Completed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate({
                                  to: "/scraping-api/scraping-jobs/$jobId",
                                  params: { jobId: job.id.toString() },
                                })
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {filteredJobs.length === 0 && !isFetching && (
                <p className="text-sm text-gray-500">
                  No jobs match your criteria
                </p>
              )}
              {isFetching ? (
                <p className="text-sm text-gray-500">
                  Loading more...
                </p>
              ) : (
                filteredJobs.length > 0 && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleLoadMore}
                    >
                      Load More
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Explore
