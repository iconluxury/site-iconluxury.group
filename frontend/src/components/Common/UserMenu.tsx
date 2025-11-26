import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { LogOut, User } from "lucide-react"
import useAuth from "../../hooks/useAuth"

const UserMenu = () => {
  const { logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block fixed top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-gray-50 border-yellow-300 hover:bg-yellow-100 hover:border-yellow-400 active:bg-yellow-200 active:border-yellow-500"
              data-testid="user-menu"
            >
              <User className="h-[18px] w-[18px] text-gray-800" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-50 border-gray-200 text-gray-800 shadow-md">
            {/* <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center cursor-pointer hover:bg-yellow-100 hover:text-yellow-500">
                <User className="mr-2 h-[18px] w-[18px] text-gray-600" />
                Settings
              </Link>
            </DropdownMenuItem> */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 font-bold hover:bg-red-100 cursor-pointer focus:text-red-500 focus:bg-red-100"
            >
              <LogOut className="mr-2 h-[18px] w-[18px] text-red-500" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export default UserMenu
