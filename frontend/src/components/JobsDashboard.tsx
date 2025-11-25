import {
  Box,
  Container,
  Flex,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import {
  FiBox,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi"

interface JobSummary {
  id: number
  inputFile: string
  fileEnd: string | null
  user: string
  rec: number
  img: number
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token")
}

async function fetchJobs(): Promise<JobSummary[]> {
  const token = getAuthToken()
  const response = await fetch(
    "https://external.iconluxury.group/api/scraping-jobs?page=1&page_size=100",
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

function JobsDashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobSummary[]>({
    queryKey: ["scraperJobs"],
    queryFn: fetchJobs,
  })

  const getStatus = (job: JobSummary) => {
    if (job.fileEnd) return "Completed"
    // This is a guess, the API doesn't provide a clear "In Progress" state
    if (job.img > 0 && !job.fileEnd) return "In Progress"
    return "Pending"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <FiCheckCircle color="green" />
      case "In Progress":
        return <FiRefreshCw color="blue" />
      case "Pending":
        return <FiClock color="orange" />
      case "Failed":
        return <FiXCircle color="red" />
      default:
        return <FiBox />
    }
  }

  const totalJobs = jobs.length
  const completedJobs = jobs.filter(
    (job) => getStatus(job) === "Completed",
  ).length
  const inProgressJobs = jobs.filter(
    (job) => getStatus(job) === "In Progress",
  ).length
  const pendingJobs = jobs.filter((job) => getStatus(job) === "Pending").length

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">
          Jobs Dashboard
        </Text>
      </Flex>

      {/* Summary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={4}>
        <StatBox title="Total Jobs" value={totalJobs} />
        <StatBox title="Completed" value={completedJobs} />
        <StatBox title="In Progress" value={inProgressJobs} />
        <StatBox title="Pending" value={pendingJobs} />
      </SimpleGrid>

      {/* Jobs List */}
      <Box
        bg="white"
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
      >
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Job Details
        </Text>
        <VStack spacing={4} align="stretch">
          {jobsLoading ? (
            <Text>Loading jobs...</Text>
          ) : (
            jobs.map((job) => {
              const status = getStatus(job)
              return (
                <Box
                  key={job.id}
                  p={4}
                  shadow="sm"
                  borderWidth="1px"
                  borderRadius="md"
                  bg="white"
                  borderColor="gray.200"
                >
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="bold">{job.inputFile}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {job.img} / {job.rec} items
                      </Text>
                    </Box>
                    <Flex align="center">
                      {getStatusIcon(status)}
                      <Text ml={2}>{status}</Text>
                    </Flex>
                  </Flex>
                </Box>
              )
            })
          )}
        </VStack>
      </Box>
    </Container>
  )
}

const StatBox = ({ title, value }: { title: string; value: number }) => (
  <Box
    bg="white"
    shadow="sm"
    borderWidth="1px"
    borderColor="gray.200"
    borderRadius="md"
  >
    <Stat p={4}>
      <StatLabel>{title}</StatLabel>
      <StatNumber>{value}</StatNumber>
    </Stat>
  </Box>
)

export default JobsDashboard
