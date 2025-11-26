import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"

import { type ApiError, LoginService, type NewPassword } from "../client"
import { isLoggedIn } from "../hooks/useAuth"
import useCustomToast from "../hooks/useCustomToast"
import { handleError, passwordRules } from "../utils"

interface NewPasswordForm extends NewPassword {
  confirm_password: string
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function ResetPassword() {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<NewPasswordForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      new_password: "",
    },
  })
  const showToast = useCustomToast()
  const navigate = useNavigate()

  const resetPassword = async (data: NewPassword) => {
    const token = new URLSearchParams(window.location.search).get("token")
    if (!token) return
    await LoginService.resetPassword({
      requestBody: { new_password: data.new_password, token: token },
    })
  }

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      showToast("Success!", "Password updated successfully.", "success")
      reset()
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
  })

  const onSubmit: SubmitHandler<NewPasswordForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-primary text-center mb-2">
          Reset Password
        </h1>
        <p className="text-center text-muted-foreground">
          Please enter your new password and confirm it to reset your password.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Set Password</Label>
            <Input
              id="password"
              {...register("new_password", passwordRules())}
              placeholder="Password"
              type="password"
            />
            {errors.new_password && (
              <p className="text-sm text-destructive">
                {errors.new_password.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              {...register("confirm_password", {
                validate: (value) =>
                  value === getValues().new_password ||
                  "The passwords do not match",
              })}
              placeholder="Confirm Password"
              type="password"
            />
            {errors.confirm_password && (
              <p className="text-sm text-destructive">
                {errors.confirm_password.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
