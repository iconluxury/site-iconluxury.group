import React from 'react';
import { 
  Box, 
  Text, 
  Alert, 
  AlertIcon, 
  VStack 
} from "@chakra-ui/react";

const ComingSoon: React.FC = () => {
  return (
    <Box maxW="100%" mx="auto" px={{ base: 6, md: 12 }} py={10}>
      <VStack spacing={6} align="stretch">
        <Alert 
          status="info" 
          borderRadius="md" 
          bg="gray.50"
          color="gray.800"
        >
          <AlertIcon color="blue.500" /> 
          <Text fontSize="sm">
           Features are in development. 
          </Text>
        </Alert>
      </VStack>
    </Box>
  );
};

export default ComingSoon;