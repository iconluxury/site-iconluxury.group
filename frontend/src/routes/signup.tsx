import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"

import type { UserRegister } from "../client"
import useAuth, { isLoggedIn } from "../hooks/useAuth"
import { confirmPasswordRules, emailPattern, passwordRules } from "../utils"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

function SignUp() {
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    signUpMutation.mutate(data)
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center md:flex-row">
      <div className="container flex h-screen max-w-sm flex-col items-stretch justify-center gap-4 mx-auto">
        <span className="text-2xl font-bold text-primary self-center mb-4">ICON LUXURY GROUP</span>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Input
              id="full_name"
              minLength={3}
              {...register("full_name", { required: "Full Name is required" })}
              placeholder="Full Name"
              type="text"
            />
            {errors.full_name && (
              <span className="text-red-500 text-sm">
                {errors.full_name.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
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
              <span className="text-red-500 text-sm">
                {errors.email.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Input
              id="password"
              {...register("password", passwordRules())}
              placeholder="Password"
              type="password"
            />
            {errors.password && (
              <span className="text-red-500 text-sm">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Input
              id="confirm_password"
              {...register("confirm_password", confirmPasswordRules(getValues))}
              placeholder="Repeat Password"
              type="password"
            />
            {errors.confirm_password && (
              <span className="text-red-500 text-sm">
                {errors.confirm_password.message}
              </span>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Sign Up
          </Button>
        </form>
        <div className="text-center">
          Already have an account?{" "}
          <RouterLink to="/login" className="text-blue-500 hover:underline">
            Log In
          </RouterLink>
        </div>
      </div>
    </div>
  )
}

export default SignUp
