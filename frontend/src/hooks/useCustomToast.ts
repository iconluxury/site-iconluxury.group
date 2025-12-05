// src/hooks/useCustomToast.ts
import { useToast } from "@chakra-ui/react";
import { useCallback, useRef } from "react";

const useCustomToast = () => {
  const toast = useToast();
  const toastIdRef = useRef<string | number | null>(null);

  const showToast = useCallback(
    (title: string, description: string, status: "info" | "warning" | "success" | "error") => {
      if (toastIdRef.current) {
        toast.close(toastIdRef.current);
      }

      const id = toast({
        title,
        description,
        status,
        isClosable: true,
        position: "top" as const,
        duration: 4000,
      });

      toastIdRef.current = id;
    },
    [toast]
  );

  return showToast;
};

export default useCustomToast;