import { useCallback } from "react"
import { toast } from "sonner"

type ToastStatus = "info" | "warning" | "success" | "error"

const mapStatusToToaster = (status: ToastStatus) => {
  switch (status) {
    case "success":
      return toast.success
    case "warning":
      return toast.warning
    case "error":
      return toast.error
    default:
      return toast.info
  }
}

const useCustomToast = () => {
  return useCallback(
    (title: string, description: string, status: ToastStatus = "info") => {
      const show = mapStatusToToaster(status)
      show(title, {
        description,
        duration: 4000,
        closeButton: true,
      })
    },
    [],
  )
}

export default useCustomToast
