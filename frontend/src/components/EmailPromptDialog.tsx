import { useState } from "react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

interface EmailPromptDialogProps {
  open: boolean
  onSubmit: (email: string) => void
}

export function EmailPromptDialog({ open, onSubmit }: EmailPromptDialogProps) {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      onSubmit(email.trim())
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Prevent closing by clicking outside or escape, as it is required
      >
        <DialogHeader>
          <DialogTitle>Email Required</DialogTitle>
          <DialogDescription>
            Please enter your email address to continue using this tool.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <Button type="submit">Continue</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
