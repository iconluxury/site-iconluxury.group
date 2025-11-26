import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useMutation } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import { type ApiError, type UpdatePassword, UsersService } from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { confirmPasswordRules, handleError, passwordRules } from "../../utils"

interface UpdatePasswordForm extends UpdatePassword {
  confirm_password: string
}

const ChangePassword = () => {
  const showToast = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordForm>({
    mode: "onBlur",
    criteriaMode: "all",
  })

  const mutation = useMutation({
    mutationFn: (data: UpdatePassword) =>
      UsersService.updatePasswordMe({ requestBody: data }),
    onSuccess: () => {
      showToast("Success!", "Password updated successfully.", "success")
      reset()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
  })

  const onSubmit: SubmitHandler<UpdatePasswordForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <div className="max-w-full">
      <h2 className="text-lg font-semibold py-4">Change Password</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full md:w-1/2 space-y-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="current_password">Current Password</Label>
          <Input
            id="current_password"
            {...register("current_password", {
              required: "Current password is required",
            })}
            placeholder="Password"
            type="password"
            className="w-auto"
          />
          {errors.current_password && (
            <p className="text-sm text-red-500">
              {errors.current_password.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Set Password</Label>
          <Input
            id="password"
            {...register("new_password", passwordRules())}
            placeholder="Password"
            type="password"
            className="w-auto"
          />
          {errors.new_password && (
            <p className="text-sm text-red-500">
              {errors.new_password.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input
            id="confirm_password"
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Password"
            type="password"
            className="w-auto"
          />
          {errors.confirm_password && (
            <p className="text-sm text-red-500">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          Save
        </Button>
      </form>
    </div>
  )
}

export default ChangePassword
