import { useQueryClient } from "@tanstack/react-query"
import { Menu } from "lucide-react"
import { useState } from "react"
import type { UserPublic } from "../../client"
import { Button } from "../ui/button"
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden absolute top-4 left-4 text-primary"
            aria-label="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[250px] p-0 bg-background sidebar"
        >
          <div className="flex flex-col h-full py-8 px-4">
            <div>
              <a
                href="https://dashboard.iconluxury.group"
                className="block mb-6"
              >
                <span className="text-lg font-bold p-4 block text-primary">
                  ICON LUXURY GROUP
                </span>
              </a>
              <SidebarItems onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <div className="hidden md:flex bg-muted/40 p-3 h-full sticky top-0 sidebar">
        <div className="flex flex-col justify-between p-4 rounded-md shadow-sm w-[250px] bg-card h-full">
          <div>
            <a href="https://dashboard.iconluxury.group" className="block mb-6">
              <span className="text-lg font-bold p-4 block text-primary">
                ICON LUXURY GROUP
              </span>
            </a>
            <SidebarItems />
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
