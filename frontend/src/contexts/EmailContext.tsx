import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { EmailPromptDialog } from "../components/EmailPromptDialog"
import { getIframeEmailParameter } from "../lib/email-utils"

interface EmailContextType {
  email: string | null
  setEmail: (email: string) => void
  requestEmail: () => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(() =>
    getIframeEmailParameter(),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSetEmail = (newEmail: string) => {
    setEmail(newEmail)
    setIsDialogOpen(false)
  }

  const requestEmail = () => {
    if (!email) {
      setIsDialogOpen(true)
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data) return

      if (typeof data === "object") {
        const email = data.email || data.userEmail || data.sendToEmail
        if (email && typeof email === "string") {
          handleSetEmail(email.trim())
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return (
    <EmailContext.Provider
      value={{ email, setEmail: handleSetEmail, requestEmail }}
    >
      {children}
      <EmailPromptDialog open={isDialogOpen} onSubmit={handleSetEmail} />
    </EmailContext.Provider>
  )
}

export const useEmailContext = () => {
  const context = useContext(EmailContext)
  if (!context) {
    throw new Error("useEmailContext must be used within an EmailProvider")
  }
  return context
}
