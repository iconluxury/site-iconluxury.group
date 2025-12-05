import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

import {
  type ApiError,
  type UserPublic as BaseUserPublic, // Rename to avoid conflict
  type UserUpdate as BaseUserUpdate,
  UsersService,
} from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { emailPattern, handleError } from "../../utils"

// Extend UserPublic to match database schema
interface ExtendedUserPublic extends BaseUserPublic {
  has_subscription?: boolean
  is_trial?: boolean
  is_deactivated?: boolean
}

interface UserUpdate extends BaseUserUpdate {
  has_subscription?: boolean
  is_trial?: boolean
  is_deactivated?: boolean
}

interface EditUserProps {
  user: ExtendedUserPublic
  isOpen: boolean
  onClose: () => void
}

interface UserUpdateForm extends UserUpdate {
  confirm_password: string
}

const EditUser = ({ user, isOpen, onClose }: EditUserProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      ...user,
      has_subscription: user.has_subscription || false,
      is_trial: user.is_trial || false,
      is_deactivated: user.is_deactivated || false,
    },
  })

  // Watch checkbox values to update state correctly
  const hasSubscription = watch("has_subscription")
  const isTrial = watch("is_trial")
  const isDeactivated = watch("is_deactivated")

  useEffect(() => {
    reset({
      ...user,
      has_subscription: user.has_subscription || false,
      is_trial: user.is_trial || false,
      is_deactivated: user.is_deactivated || false,
    })
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: (data: UserUpdateForm) => {
      const requestData: UserUpdate = {
        ...data,
        has_subscription: data.has_subscription || false,
        is_trial: data.is_trial || false,
        is_deactivated: data.is_deactivated || false,
      }
      ;(requestData as any).confirm_password = undefined
      return UsersService.updateUser({
        userId: user.id,
        requestBody: requestData,
      })
    },
    onSuccess: () => {
      showToast("Success!", "User updated successfully.", "success")
      onClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<UserUpdateForm> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: emailPattern,
                })}
                placeholder="Email"
                type="email"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                {...register("full_name")}
                placeholder="Full Name"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                {...register("password", {
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
                placeholder="Password"
                type="password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                {...register("confirm_password", {
                  validate: (value) => {
                    const { password } = getValues()
                    return password === value || "Passwords do not match"
                  },
                })}
                placeholder="Confirm Password"
                type="password"
              />
              {errors.confirm_password && (
                <p className="text-sm text-red-500">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_superuser"
                checked={watch("is_superuser")}
                onCheckedChange={(checked) =>
                  setValue("is_superuser", checked === true)
                }
              />
              <Label htmlFor="is_superuser">Is Superuser?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watch("is_active")}
                onCheckedChange={(checked) =>
                  setValue("is_active", checked === true)
                }
              />
              <Label htmlFor="is_active">Is Active?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_subscription"
                checked={hasSubscription}
                onCheckedChange={(checked) =>
                  setValue("has_subscription", checked === true, {
                    shouldDirty: true,
                  })
                }
              />
              <Label htmlFor="has_subscription">Has Subscription?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_trial"
                checked={isTrial}
                onCheckedChange={(checked) =>
                  setValue("is_trial", checked === true, { shouldDirty: true })
                }
              />
              <Label htmlFor="is_trial">Is Trial?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_deactivated"
                checked={isDeactivated}
                onCheckedChange={(checked) =>
                  setValue("is_deactivated", checked === true, {
                    shouldDirty: true,
                  })
                }
              />
              <Label htmlFor="is_deactivated">Is Deactivated?</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditUser
