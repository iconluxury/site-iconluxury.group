import { createFileRoute } from "@tanstack/react-router"
import React from "react"

export const Route = createFileRoute("/_layout/submit-form/success")({
  component: SuccessPage,
})

function SuccessPage() {
  return (
    <div className="container mx-auto max-w-full py-10">
      <div className="flex flex-col gap-6 items-center">
        <h1 className="text-2xl font-bold text-green-400">Success!</h1>
      </div>
    </div>
  )
}

export default SuccessPage
