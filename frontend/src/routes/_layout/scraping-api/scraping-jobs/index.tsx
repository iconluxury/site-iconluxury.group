import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Container,
  Box,
  Text,
  Flex,
  Button,
  VStack,
  Heading,
} from "@chakra-ui/react";

const ScrapingJobsIndexPage = () => {
  return (
    <Container maxW="full" py={6}>
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Heading fontSize="2xl" fontWeight="bold">Scraping Jobs</Heading>
          <Text fontSize="sm" color="gray.500" mt={2}>
            Manage and monitor your scraping jobs for uploaded data.
          </Text>
        </Box>
      </Flex>
      <VStack spacing={6} align="stretch">
        <Box p={6} shadow="md" borderWidth="1px" borderRadius="lg">
          <Text fontSize="lg" fontWeight="bold" mb={4}>Get Started</Text>
          <Text mb={4}>
            View all your scraping jobs, check their status, and download results from the Explore page.
          </Text>
          <Button as={Link} to="/scraping-api/explore" colorScheme="blue">
            Explore Jobs
          </Button>
        </Box>
        <Box p={6} shadow="md" borderWidth="1px" borderRadius="lg">
          <Text fontSize="lg" fontWeight="bold" mb={4}>How It Works</Text>
          <Text mb={4}>
            Upload an input file with product data, and our system will scrape images and details using the specified API. Track progress and download the enriched file once complete.
          </Text>
        </Box>
      </VStack>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/scraping-api/scraping-jobs/")({
  component: ScrapingJobsIndexPage,
});

export default ScrapingJobsIndexPage;