import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { TicketsService } from "../../client"

export const Route = createFileRoute("/_layout/support-ticket")({
  component: SupportTicketPage,
})

type SupportTicketForm = {
  subject: string
  category: string
  priority: string
  description: string
}

function SupportTicketPage() {
  const { register, handleSubmit, reset, setValue } =
    useForm<SupportTicketForm>()
  const showToast = useCustomToast()
  const queryClient = useQueryClient()

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => TicketsService.readTickets({}),
  })

  const createTicketMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      TicketsService.createTicket({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      showToast(
        "Ticket Submitted",
        "Your support ticket has been created successfully.",
        "success",
      )
      reset()
    },
    onError: () => {
      showToast("Error", "Failed to submit ticket. Please try again.", "error")
    },
  })

  const onSubmit = (data: SupportTicketForm) => {
    createTicketMutation.mutate({
      title: data.subject,
      description: `Category: ${data.category}\nPriority: ${data.priority}\n\n${data.description}`,
    })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit Support Ticket</CardTitle>
          <CardDescription>
            Report an issue or request assistance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief summary of the issue"
                {...register("subject", { required: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(val) => setValue("category", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="account">Account Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select onValueChange={(val) => setValue("priority", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the issue..."
                className="min-h-[150px]"
                {...register("description", { required: true })}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createTicketMutation.isPending}
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket History</CardTitle>
          <CardDescription>View your past support tickets.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : tickets?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                tickets?.data.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium truncate max-w-[100px]">
                      {ticket.id}
                    </TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell className="truncate max-w-[300px]">
                      {ticket.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
