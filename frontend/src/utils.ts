import type { ApiError } from "./client"

export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: "Invalid email address",
}

export const namePattern = {
  value: /^[A-Za-z\s\u00C0-\u017F]{1,30}$/,
  message: "Invalid name",
}

export const passwordRules = (isRequired = true) => {
  const rules: any = {
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters",
    },
  }

  if (isRequired) {
    rules.required = "Password is required"
  }

  return rules
}

export const confirmPasswordRules = (
  getValues: () => any,
  isRequired = true,
) => {
  const rules: any = {
    validate: (value: string) => {
      const password = getValues().password || getValues().new_password
      return value === password ? true : "The passwords do not match"
    },
  }

  if (isRequired) {
    rules.required = "Password confirmation is required"
  }

  return rules
}

export const handleError = (err: ApiError, showToast: any) => {
  const errDetail = (err.body as any)?.detail
  let errorMessage = errDetail || "Something went wrong."
  if (Array.isArray(errDetail) && errDetail.length > 0) {
    errorMessage = errDetail[0].msg
  }
  showToast("Error", errorMessage, "error")
}

const DEV_FLAG_TRUE_VALUES = new Set(["true", "1", "yes", "on"])

const parseDevFlag = (value: string | boolean | null | undefined): boolean => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    return DEV_FLAG_TRUE_VALUES.has(value.trim().toLowerCase())
  }
  return false
}

const getRuntimeDevFlag = (): string | null => {
  if (typeof window === "undefined") return null

  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get("showDevUI")
  if (fromQuery) return fromQuery

  try {
    return window.localStorage.getItem("showDevUI")
  } catch (error) {
    console.warn("Unable to read showDevUI flag from localStorage", error)
    return null
  }
}

// UI helper: decide when to show developer banners/tags in any environment
// - Shows in Vite dev server automatically (import.meta.env.DEV)
// - Can be forced on in production builds by setting VITE_SHOW_DEV_UI or
//   by providing ?showDevUI=true in the URL / localStorage
export const showDevUI = (): boolean => {
  if (import.meta.env.DEV) return true

  if (parseDevFlag(import.meta.env.VITE_SHOW_DEV_UI)) return true

  return parseDevFlag(getRuntimeDevFlag())
}
