import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react" // This is fine
import React from "react" // Add this import
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"
import { OpenAPI } from "./client"
import { ThemeProvider } from "./components/theme-provider"
import { EmailProvider } from "./contexts/EmailContext"
import { routeTree } from "./routeTree.gen"
import "./styles/global.css"
import theme from "./theme"

OpenAPI.BASE = "https://api.iconluxury.group"
OpenAPI.TOKEN = async () => localStorage.getItem("access_token") || ""

const queryClient = new QueryClient()
const router = createRouter({ routeTree })

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" attribute="class">
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <EmailProvider>
            <RouterProvider router={router} />
          </EmailProvider>
        </QueryClientProvider>
      </ChakraProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  </StrictMode>,
)
