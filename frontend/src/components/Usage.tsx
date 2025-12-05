import { Box, Text, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid } from "@chakra-ui/react";

interface UsageProps {
  toolId?: string;
}

// Simulated data for different endpoints
const endpointUsageData: Record<string, { requestsToday: number; requestsThisMonth: number; successRate: number; gigsUsedToday: number; gigsUsedThisMonth: number; costPerGigabyte: number }> = {
    "SOUTHAMERICA-WEST1": {
      requestsToday: 1200,
      requestsThisMonth: 36000,
      successRate: 98.7,
      gigsUsedToday: 2.0,
      gigsUsedThisMonth: 60.0,
      costPerGigabyte: 0.05,
    },
    "US-CENTRAL1": {
      requestsToday: 1800,
      requestsThisMonth: 54000,
      successRate: 99.2,
      gigsUsedToday: 2.8,
      gigsUsedThisMonth: 84.0,
      costPerGigabyte: 0.04,
    },
    "US-EAST1": {
      requestsToday: 1500,
      requestsThisMonth: 45000,
      successRate: 99.0,
      gigsUsedToday: 2.5,
      gigsUsedThisMonth: 75.0,
      costPerGigabyte: 0.045,
    },
    "US-EAST4": {
      requestsToday: 13080,
      requestsThisMonth: 349000,
      successRate: 98.8,
      gigsUsedToday: 20.3,
      gigsUsedThisMonth: 690.0,
      costPerGigabyte: 0.043,
    },
    "US-WEST1": {
      requestsToday: 1000,
      requestsThisMonth: 30000,
      successRate: 98.9,
      gigsUsedToday: 1.9,
      gigsUsedThisMonth: 57.0,
      costPerGigabyte: 0.06,
    },
    "EUROPE-WEST4": {
      requestsToday: 1100,
      requestsThisMonth: 33000,
      successRate: 99.1,
      gigsUsedToday: 2.1,
      gigsUsedThisMonth: 63.0,
      costPerGigabyte: 0.048,
    },
    "G-IMAGE-SERP-EUROPE-WEST1": {
      requestsToday: 900,
      requestsThisMonth: 27000,
      successRate: 97.5,
      gigsUsedToday: 1.5,
      gigsUsedThisMonth: 45.0,
      costPerGigabyte: 0.06,
    },
    "G-IMAGE-SERP-US-CENTRAL1": {
      requestsToday: 1100,
      requestsThisMonth: 33000,
      successRate: 98.0,
      gigsUsedToday: 1.8,
      gigsUsedThisMonth: 54.0,
      costPerGigabyte: 0.05,
    },
  };

const Usage = ({ toolId }: UsageProps) => {
  // Case 1: No toolId provided
  if (!toolId) {
    return (
      <Box p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Usage
        </Text>
        <Text color="gray.500">No endpoint specified.</Text>
      </Box>
    );
  }

  // Fetch usage data for the given toolId
  const usageData = endpointUsageData[toolId];

  // Case 2: toolId provided but no data available
  if (!usageData) {
    return (
      <Box p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Usage for {toolId}
        </Text>
        <Text color="gray.500">No data available for this endpoint.</Text>
      </Box>
    );
  }

  // Case 3: Data available, display usage statistics
  return (
    <Box p={4}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Usage for {toolId}
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        <Stat>
          <StatLabel>Requests Today</StatLabel>
          <StatNumber>{usageData.requestsToday.toLocaleString()}</StatNumber>
          <StatHelpText>Daily usage</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Requests This Month</StatLabel>
          <StatNumber>{usageData.requestsThisMonth.toLocaleString()}</StatNumber>
          <StatHelpText>Monthly total</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Success Rate</StatLabel>
          <StatNumber>{usageData.successRate}%</StatNumber>
          <StatHelpText>Request success</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Gigabytes Used Today</StatLabel>
          <StatNumber>{usageData.gigsUsedToday.toFixed(1)} GB</StatNumber>
          <StatHelpText>Daily data usage</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Gigabytes Used This Month</StatLabel>
          <StatNumber>{usageData.gigsUsedThisMonth.toFixed(1)} GB</StatNumber>
          <StatHelpText>Monthly data usage</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Cost Per Gigabyte</StatLabel>
          <StatNumber>${usageData.costPerGigabyte.toFixed(2)}</StatNumber>
          <StatHelpText>Rate per GB</StatHelpText>
        </Stat>
      </SimpleGrid>
    </Box>
  );
};

export default Usage;