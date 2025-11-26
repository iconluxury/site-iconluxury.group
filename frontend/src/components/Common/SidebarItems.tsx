import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useLocation } from "@tanstack/react-router"
import {
  Archive,
  Calendar,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Home,
  Layers,
  LogOut,
  MessageSquare,
  Search,
  Shield,
  Users,
  Image,
  Database,
  Link as LinkIcon,
  Crop,
  Wrench,
  Settings,
  Package,
  BarChart,
  Briefcase,
  FileSpreadsheet,
  Layout,
} from "lucide-react"
import type { UserPublic } from "../../client"
import useAuth from "../../hooks/useAuth"

interface SidebarItem {
  title: string
  icon?: any
  path?: string
  subItems?: SidebarItem[]
  action?: () => void
}

const sidebarStructure: SidebarItem[] = [
  { title: "Dashboard", path: "/", icon: Home },
  { title: "Items", path: "/items", icon: Package },
  { title: "File Explorer", path: "/file-explorer", icon: Archive },
  {
    title: "Tools",
    icon: Wrench,
    subItems: [
      { title: "Google Images", path: "/tools/google-images", icon: Image },
      { title: "Data Warehouse", path: "/tools/data-warehouse", icon: Database },
      { title: "Image Links", path: "/tools/image-links", icon: LinkIcon },
      { title: "Crop Tool", path: "/tools/crop", icon: Crop },
      { title: "Reformat Excel", path: "/reformat-excel", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Scraper",
    icon: Search,
    subItems: [
      { title: "Jobs", path: "/scraping-api/explore", icon: Search },
      { title: "Scraping Jobs", path: "/scraping-api/scraping-jobs", icon: Briefcase },
      { title: "Insights", path: "/scraping-api/insights", icon: BarChart },
      { title: "Google SERP CMS", path: "/google-serp-cms", icon: Layout },
    ],
  },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Support Ticket", path: "/support-ticket", icon: HelpCircle },
  { title: "Sign out", icon: LogOut, action: () => {} },
]

interface SidebarItemsProps {
  onClose?: () => void
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const { logout } = useAuth()
  const location = useLocation()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const avatarOptions = ["https://i.pravatar.cc/150"]
  const hardcodedAvatar =
    avatarOptions[Math.floor(Math.random() * avatarOptions.length)]

  const finalSidebarStructure = [...sidebarStructure]
  if (
    currentUser?.is_superuser &&
    !finalSidebarStructure.some((item) => item.title === "Admin")
  ) {
    finalSidebarStructure.splice(finalSidebarStructure.length - 1, 0, {
      title: "Admin",
      icon: Shield,
      path: "/admin",
    })
  }

  const isEnabled = (title: string) => {
    if (
      [
        "Dashboard",
        "Orders",
        "Offers",
        "Customers",
        "Support",
        "Sign out",
      ].includes(title)
    ) {
      return true
    }
    if (
      [
        "Scraper",
        "Jobs",
        "File Explorer",
        "Google SERP",
        "Logs",
        "Network Logs",
        "Email Logs",
        "VPN",
        "Admin",
      ].includes(title)
    ) {
      return currentUser?.is_superuser || false
    }
    return true
  }

  const renderItems = (items: SidebarItem[]) =>
    items.map(({ icon: Icon, title, path, subItems, action }) => {
      const enabled = isEnabled(title)
      if (!enabled) {
        return null
      }
      const showAdminLabel = ["File Explorer", "VPN", "Admin"].includes(title)
      const isActive =
        path === location.pathname || (path === "/" && location.pathname === "")
      return (
        <div key={title} className="mb-2">
          {path ? (
            <Link
              to={path}
              className={`flex w-full p-2 rounded-md items-center justify-between transition-colors ${
                isActive
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-foreground hover:text-primary hover:bg-muted/50"
              }`}
              onClick={onClose}
            >
              <div className="flex items-center">
                {Icon && (
                  <Icon
                    className={`mr-2 h-4 w-4 ${
                      isActive ? "text-foreground" : "text-foreground"
                    }`}
                  />
                )}
                <span>{title}</span>
              </div>
              {showAdminLabel && (
                <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-full">
                  Admin
                </Badge>
              )}
            </Link>
          ) : action ? (
            <div
              className="flex w-full p-2 rounded-md text-foreground hover:text-primary hover:bg-muted/50 cursor-pointer items-center transition-colors"
              onClick={() => {
                if (title === "Sign out") logout()
                onClose?.()
              }}
            >
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              <span>{title}</span>
            </div>
          ) : (
            <div>
              <div className="p-2 font-bold">
                {title}
              </div>
              <div className="pl-4">{subItems && renderItems(subItems)}</div>
            </div>
          )}
        </div>
      )
    })

  return (
    <div className="sidebar">
      <div>{renderItems(finalSidebarStructure)}</div>
      {currentUser && (
        <Link
          to="/settings"
          className="flex w-full p-2 mt-4 rounded-md bg-muted/50 shadow-sm text-foreground border-2 border-transparent hover:text-primary hover:bg-muted hover:border-primary transition-all duration-200 items-center"
          onClick={onClose}
        >
          <Avatar className="h-8 w-8 mr-2 border-2 border-transparent hover:border-primary transition-all duration-200 grayscale hover:grayscale-0">
            <AvatarImage src={hardcodedAvatar} alt={currentUser.full_name || "User"} />
            <AvatarFallback>{currentUser.full_name ? currentUser.full_name.charAt(0) : "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate">{currentUser.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate whitespace-normal break-words">
              {currentUser.email || "email@example.com"}
            </p>
          </div>
        </Link>
      )}
    </div>
  )
}

export default SidebarItems
