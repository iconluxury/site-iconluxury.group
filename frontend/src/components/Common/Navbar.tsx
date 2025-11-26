import type { ComponentType, ElementType } from "react"
import { useState } from "react"

import { Button } from "../ui/button"
import { Plus } from "lucide-react"

interface NavbarProps {
  type: string
  addModalAs: ComponentType<{ isOpen: boolean; onClose: () => void }> | ElementType
}

const Navbar = ({ type, addModalAs }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)

  const AddModal = addModalAs
  return (
    <>
      <div className="flex py-8 gap-4">
        {/* TODO: Complete search functionality */}
        {/* <InputGroup w={{ base: 100%, md: auto }}>
                    <InputLeftElement pointerEvents=none>
                        <Icon as={FaSearch} color=ui.dim />
                    </InputLeftElement>
                    <Input type=text placeholder=Search fontSize={{ base: sm, md: inherit }} borderRadius=8px />
                </InputGroup> */}
        <Button
          variant="default"
          className="gap-1 text-sm md:text-base"
          onClick={onOpen}
        >
          <Plus className="h-4 w-4" /> Add {type}
        </Button>
        <AddModal isOpen={isOpen} onClose={onClose} />
      </div>
    </>
  )
}

export default Navbar
