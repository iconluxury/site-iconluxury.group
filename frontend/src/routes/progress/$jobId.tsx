import { useParams } from "@tanstack/react-router"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import React, { useState, useEffect } from "react"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Separator } from "../../components/ui/separator"
import useCustomToast from "../../hooks/useCustomToast"

// --- INTERFACES ---

// Simplified interface for job details needed on this page
interface JobDetails {
  id: number
  inputFile: string
  fileLocationUrl: string
  fileEnd?: string
  fileStart: string
}

// Interface for the progress data from the API
interface ProgressData {
  fileId: number
  totalRecords: number
  step1Completed: number
  step1Progress: number
  step2Completed: number
  step2Progress: number
  step3Completed: number
  step3Progress: number
  step4Completed: number
  step4Progress: number
}

// --- COMPONENT ---

/**
 * A standalone page to display the real-time progress of a single scraping job.
 * It fetches job details and polls for progress updates until the job is complete.
 */
const JobProgressPage = () => {
  const { jobId } = useParams({ from: "/progress/$jobId" }) as { jobId: string }
  const [jobData, setJobData] = useState<JobDetails | null>(null)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const showToast = useCustomToast()

  // Effect 1: Fetch initial job data once on component mount
  useEffect(() => {
    const fetchJobData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const apiUrl = `https://external.iconluxury.group/api/scraping-jobs/${jobId}`
        const response = await fetch(apiUrl)
        if (!response.ok) {
          throw new Error(
            `Failed to fetch job data: ${response.status} - ${response.statusText}`,
          )
        }
        const data: JobDetails = await response.json()
        setJobData(data)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred"
        showToast("Fetch Error", errorMessage, "error")
        setError(errorMessage)
        setJobData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobData()
  }, [jobId, showToast])

  // Effect 2: Poll for progress data if the job is running
  useEffect(() => {
    // Start polling only if we have job data and the job is not finished.
    if (!jobData || jobData.fileEnd) {
      setProgressData(null) // Clear progress if job is done or no data
      return
    }

    let isCancelled = false

    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `https://external.iconluxury.group/api/scraping-jobs/${jobId}/progress`,
        )
        if (response.ok) {
          const data: ProgressData = await response.json()
          if (!isCancelled) {
            setProgressData(data)

            // If progress hits 100% on the last step, refetch the main job data
            if (data.step4Progress >= 100) {
              const jobResponse = await fetch(
                `https://external.iconluxury.group/api/scraping-jobs/${jobId}`,
              )
              if (jobResponse.ok) {
                const updatedJobData: JobDetails = await jobResponse.json()
                if (updatedJobData.fileEnd) {
                  setJobData(updatedJobData) // Update state to reflect completion
                }
              }
            }
          }
        } else {
          console.error("Failed to fetch job progress:", response.statusText)
        }
      } catch (err) {
        console.error("Error polling for job progress:", err)
      }
    }

    fetchProgress() // Initial fetch
    const intervalId = setInterval(fetchProgress, 5000) // Poll every 5 seconds

    // Cleanup function to stop polling when component unmounts or dependencies change
    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [jobData, jobId]) // Reruns when jobData is initially fetched

  // --- RENDER LOGIC ---

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-10 flex flex-col items-center justify-center h-[200px]">
        <Loader2 className="h-10 w-10 animate-spin text-green-500" />
        <p className="mt-4 text-gray-600">Loading Job Details...</p>
      </div>
    )
  }

  if (error || !jobData) {
    return (
      <div className="container mx-auto max-w-3xl py-10 text-center">
        <p className="text-red-500 text-lg">
          {error || "Job data could not be loaded."}
        </p>
      </div>
    )
  }

  // Define progress steps based on the available data
  const progressSteps = progressData
    ? [
        {
          label: "Step 1: Initial Sort",
          completed: progressData.step1Completed,
          progress: progressData.step1Progress,
        },
        {
          label: "Step 2: Image Validation",
          completed: progressData.step2Completed,
          progress: progressData.step2Progress,
        },
        {
          label: "Step 3: Search Sort",
          completed: progressData.step3Completed,
          progress: progressData.step3Progress,
        },
        {
          label: "Step 4: AI Analysis",
          completed: progressData.step4Completed,
          progress: progressData.step4Progress,
        },
      ]
    : []

  return (
    <div className="container mx-auto max-w-4xl py-8 bg-gray-50 min-h-screen">
      <div className="space-y-8">
        {/* Job Details Card */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">
                  Input File
                </span>
                <a
                  href={jobData.fileLocationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline break-all font-medium"
                >
                  {jobData.inputFile}
                </a>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">
                  Start Time
                </span>
                <span className="text-gray-800 text-lg">
                  {new Date(jobData.fileStart).toLocaleString()}
                </span>
              </div>
              {jobData.fileEnd && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">
                    Duration
                  </span>
                  <span className="text-gray-800 text-lg">
                    {(
                      (new Date(jobData.fileEnd).getTime() -
                        new Date(jobData.fileStart).getTime()) /
                      1000 /
                      60
                    ).toFixed(2)}{" "}
                    minutes
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar Section - only shows when job is running */}
        {progressData && !jobData.fileEnd && (
          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle>Processing Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {progressSteps.map((step, index) => (
                  <div key={index} className="w-full">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="font-medium text-gray-800">
                        {step.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        {step.completed} / {progressData.totalRecords} records
                      </span>
                    </div>
                    <Progress
                      value={step.progress}
                      className="h-3"
                      // Note: Shadcn Progress doesn't support colorScheme or hasStripe directly via props usually,
                      // but we can style it via className or if the component supports it.
                      // Assuming standard Shadcn Progress component.
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {Math.round(step.progress)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Message - only shows when job is done */}
        {jobData.fileEnd && (
          <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-md border border-green-200">
            <h3 className="text-lg font-bold text-green-700">
              Processing Complete!
            </h3>
            <p className="mt-2 text-green-600">
              The job finished successfully.
            </p>
            <Button
              className="mt-4 bg-green-600 hover:bg-green-700"
              onClick={() =>
                (window.location.href = `/scraping-api/scraping-jobs/${jobId}`)
              }
            >
              View Results
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- ROUTE DEFINITION ---

// Defines the route for this new page within the TanStack Router setup.
// This should be in a file like: `src/routes/_layout/scraping-api/scraping-jobs/$jobId/progress-only.tsx`
export const Route = createFileRoute("/progress/$jobId")({
  component: JobProgressPage,
})

export default JobProgressPage
