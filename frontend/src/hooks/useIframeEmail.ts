import { useEffect } from "react"
import { useEmailContext } from "../contexts/EmailContext"
import { getIframeEmailParameter } from "../lib/email-utils"

export { getIframeEmailParameter }

export const useIframeEmail = (): string | null => {
  const { email, requestEmail } = useEmailContext()

  useEffect(() => {
    if (!email) {
      requestEmail()
    }
  }, [email, requestEmail])

  return email
}
