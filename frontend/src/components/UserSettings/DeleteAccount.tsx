import { Button } from "../ui/button"
import { useState } from "react"

import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="max-w-full">
      <h2 className="text-lg font-semibold py-4">Delete Account</h2>
      <p>
        Permanently delete your data and everything associated with your
        account.
      </p>
      <Button
        variant="destructive"
        className="mt-4"
        onClick={() => setIsOpen(true)}
      >
        Delete
      </Button>
      <DeleteConfirmation isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}
export default DeleteAccount
