import { useEffect, useState } from "react"

const EMAIL_QUERY_KEYS = ["sendToEmail", "email", "userEmail"]

export const getIframeEmailParameter = (): string | null => {
  if (typeof window === "undefined") return null

  const candidateKeys = new Set(
    EMAIL_QUERY_KEYS.map((key) => key.toLowerCase()),
  )

  const checkParams = (params: URLSearchParams) => {
    for (const [rawKey, rawValue] of params.entries()) {
      if (candidateKeys.has(rawKey.toLowerCase())) {
        const value = rawValue.trim()
        if (value) return value
      }
    }
    return null
  }

  // Check search params
  const searchResult = checkParams(new URLSearchParams(window.location.search))
  if (searchResult) return searchResult

  // Check hash params
  const hash = window.location.hash
  if (hash.includes("?")) {
    const hashQueryResult = checkParams(new URLSearchParams(hash.split("?")[1]))
    if (hashQueryResult) return hashQueryResult
  } else if (hash.includes("=")) {
    const hashResult = checkParams(new URLSearchParams(hash.substring(1)))
    if (hashResult) return hashResult
  }

  return null
}

export const useIframeEmail = (): string | null => {
  const [iframeEmail, setIframeEmail] = useState<string | null>(() =>
    getIframeEmailParameter(),
  )

  useEffect(() => {
    if (iframeEmail) return
    const email = getIframeEmailParameter()
    if (email) setIframeEmail(email)
  }, [iframeEmail])

  return iframeEmail
}
