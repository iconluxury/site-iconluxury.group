import { Edit, MoreVertical, Trash } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

import type { ItemPublic, UserPublic } from "../../client"
import EditUser from "../Admin/EditUser"
import EditItem from "../Items/EditItem"
import Delete from "./DeleteAlert"

interface UserActionsMenuProps {
  type: "User"
  value: UserPublic
  disabled?: boolean
}

interface ItemActionsMenuProps {
  type: "Item"
  value: ItemPublic
  disabled?: boolean
}

type ActionsMenuProps = UserActionsMenuProps | ItemActionsMenuProps

const ActionsMenu = ({ type, value, disabled }: ActionsMenuProps) => {
  const [editIsOpen, setEditIsOpen] = useState(false)
  const [deleteIsOpen, setDeleteIsOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled}
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditIsOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit {type}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteIsOpen(true)}
            className="text-red-600 focus:text-red-600 focus:bg-red-100"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete {type}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {type === "User" ? (
        <EditUser
          user={value}
          isOpen={editIsOpen}
          onClose={() => setEditIsOpen(false)}
        />
      ) : (
        <EditItem
          item={value}
          isOpen={editIsOpen}
          onClose={() => setEditIsOpen(false)}
        />
      )}
      <Delete
        type={type}
        id={value.id}
        isOpen={deleteIsOpen}
        onClose={() => setDeleteIsOpen(false)}
      />
    </>
  )
}

export default ActionsMenu
