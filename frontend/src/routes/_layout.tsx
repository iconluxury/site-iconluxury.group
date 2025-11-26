import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"

import Sidebar from "../components/Common/Sidebar"
import useAuth, { isLoggedIn } from "../hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  const { isLoading } = useAuth()

  return (
    <div className="flex max-w-full h-auto relative">
      <Sidebar />
      {isLoading ? (
        <div className="flex justify-center items-center h-screen w-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  )
}
