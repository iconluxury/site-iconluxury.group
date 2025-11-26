import { useState } from "react"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import { Eye, EyeOff } from "lucide-react"
import { type SubmitHandler, useForm } from "react-hook-form"

import type { Body_login_login_access_token as AccessToken } from "../client"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import useAuth, { isLoggedIn } from "../hooks/useAuth"
import { emailPattern } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
})

function Login() {
  const [show, setShow] = useState(false)
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { username: "", password: "" },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  // Social media logo components
  const GitHubLogo = () => (
    <a
      href="https://github.com/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80 transition-opacity"
    >
      <img
        src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
        alt="GitHub Logo"
        className="w-8 h-8"
      />
    </a>
  )

  const LinkedInLogo = () => (
    <a
      href="https://www.linkedin.com/company/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80 transition-opacity"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
        alt="LinkedIn Logo"
        className="w-8 h-8"
      />
    </a>
  )

  const XLogo = () => (
    <a
      href="https://twitter.com/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80 transition-opacity"
    >
      <img src="/assets/images/twitter-x.svg" alt="X Logo" className="w-8 h-8" />
    </a>
  )

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-background">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-none py-10 px-6 md:px-10 flex flex-col gap-6">
        <a
          href="https://iconluxury.group"
          target="_blank"
          rel="noopener noreferrer"
          className="self-center"
        >
          <span className="text-2xl font-bold text-primary">ICON LUXURY GROUP</span>
        </a>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Input
              id="username"
              {...register("username", {
                required: "Username is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
              required
              className={errors.username || error ? "border-destructive" : ""}
            />
            {errors.username && (
              <p className="text-sm text-destructive font-medium">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Input
                {...register("password", { required: "Password is required" })}
                type={show ? "text" : "password"}
                placeholder="Password"
                required
                className={error ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <RouterLink
            to="/recover-password"
            className="text-primary font-semibold self-end hover:underline"
          >
            Forgot password?
          </RouterLink>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Logging In..." : "Log In"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center">
          Don't have an account?{" "}
          <RouterLink to="/signup" className="text-primary font-semibold hover:underline">
            Sign up
          </RouterLink>
        </p>

        <div className="flex justify-center items-center gap-4 mt-8">
          <GitHubLogo />
          <LinkedInLogo />
          <XLogo />
        </div>
      </div>
    </div>
  )
}

export default Login
