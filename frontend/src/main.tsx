import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react" // This is fine
import React from "react" // Add this import
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"
import { OpenAPI } from "./client"
import { routeTree } from "./routeTree.gen"
import "./styles/global.css"
import { ThemeProvider } from "./components/theme-provider"
import theme from "./theme"
import { ChakraProvider } from "@chakra-ui/react"

OpenAPI.BASE = "https://api.iconluxury.group"
OpenAPI.TOKEN = async () => localStorage.getItem("access_token") || ""

const queryClient = new QueryClient()
const router = createRouter({ routeTree })

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" attribute="class">
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ChakraProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  </StrictMode>,
)
