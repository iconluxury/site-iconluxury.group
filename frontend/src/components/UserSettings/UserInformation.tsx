import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"

import {
  type ApiError,
  type UserPublic,
  type UserUpdateMe,
  UsersService,
} from "../../client"
import useAuth from "../../hooks/useAuth"
import useCustomToast from "../../hooks/useCustomToast"
import { emailPattern, handleError } from "../../utils"

const UserInformation = () => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UserPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showToast("Success!", "User updated successfully.", "success")
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit: SubmitHandler<UserUpdateMe> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    toggleEditMode()
  }

  return (
    <div className="max-w-full">
      <h2 className="text-lg font-semibold py-4">User Information</h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full md:w-1/2 space-y-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          {editMode ? (
            <Input
              id="name"
              {...register("full_name", { maxLength: 30 })}
              type="text"
              className="w-auto"
            />
          ) : (
            <p className="py-2 text-sm">{currentUser?.full_name || "N/A"}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          {editMode ? (
            <Input
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              type="email"
              className="w-auto"
            />
          ) : (
            <p className="py-2 text-sm">{currentUser?.email}</p>
          )}
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={editMode ? undefined : toggleEditMode}
            type={editMode ? "submit" : "button"}
            disabled={editMode ? !isDirty || isSubmitting : false}
          >
            {editMode ? "Save" : "Edit"}
          </Button>
          {editMode && (
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export default UserInformation
