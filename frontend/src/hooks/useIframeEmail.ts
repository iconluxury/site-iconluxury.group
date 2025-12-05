import { useEffect } from "react"
import { useEmailContext } from "../contexts/EmailContext"
import { getIframeEmailParameter } from "../lib/email-utils"
import useAuth from "./useAuth"

export { getIframeEmailParameter }

export const useIframeEmail = (): string | null => {
  const { email, requestEmail } = useEmailContext()
  const { user } = useAuth()

  useEffect(() => {
    if (!email && !user?.email) {
      requestEmail()
    }
  }, [email, requestEmail, user])

  return email || user?.email || null
}
