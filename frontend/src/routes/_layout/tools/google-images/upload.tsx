import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm, Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { SERVER_URL } from "@/components/google-serp/constants"
import useCustomToast from "@/hooks/useCustomToast"
import { useIframeEmail } from "@/hooks/useIframeEmail"
import { ArrowLeft, Loader2 } from "lucide-react"

export const Route = createFileRoute("/_layout/tools/google-images/upload")({
  component: GoogleImagesPage,
})

type FormData = {
  file: FileList
  email: string
  brandCol: string
  styleCol: string
  categoryCol: string
  colorCol: string
  imageCol: string
  isIconDistro: boolean
  isAiMode: boolean
  skipDataWarehouse: boolean
}

function GoogleImagesPage() {
  const navigate = useNavigate()
  const showToast = useCustomToast()
  const iframeEmail = useIframeEmail()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm<FormData>({
    defaultValues: {
      email: "",
      brandCol: "A",
      styleCol: "B",
      isIconDistro: false,
      isAiMode: false,
      skipDataWarehouse: false,
    }
  })

  useEffect(() => {
    if (iframeEmail) {
      setValue("email", iframeEmail)
    }
  }, [iframeEmail, setValue])

  const onSubmit = async (data: FormData) => {
    if (!data.file || data.file.length === 0) {
      showToast("Error", "Please select a file", "error")
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append("fileUploadImage", data.file[0])
    formData.append("sendToEmail", data.email)
    formData.append("brandColImage", data.brandCol)
    formData.append("searchColImage", data.styleCol)
    if (data.categoryCol) formData.append("CategoryColImage", data.categoryCol)
    if (data.colorCol) formData.append("ColorColImage", data.colorCol)
    if (data.imageCol) formData.append("imageColumnImage", data.imageCol)
    
    formData.append("header_index", "1")
    formData.append("sheetIndex", "1")
    
    formData.append("isIconDistro", String(data.isIconDistro))
    formData.append("isAiMode", String(data.isAiMode))
    formData.append("skipDataWarehouse", String(data.skipDataWarehouse))

    try {
      const response = await fetch(`${SERVER_URL}/submitImage`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error: ${errorText || response.statusText}`)
      }

      showToast("Success", "Job submitted successfully", "success")
      // navigate({ to: ".." })
    } catch (error) {
      console.error("Submission Error:", error)
      showToast("Error", error instanceof Error ? error.message : "Failed to submit", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate({ to: ".." })} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
            <CardHeader>
                <CardTitle>Google Images Upload</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* File Input */}
                    <div className="space-y-2">
                        <Label htmlFor="file">Excel File</Label>
                        <Input id="file" type="file" accept=".xlsx, .xls" {...register("file", { required: true })} />
                        {errors.file && <span className="text-red-500 text-sm">File is required</span>}
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Results To</Label>
                        <Input id="email" type="email" {...register("email", { required: true })} />
                        {errors.email && <span className="text-red-500 text-sm">Email is required</span>}
                    </div>

                    {/* Column Mappings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="brandCol">Brand Column (Letter)</Label>
                            <Input id="brandCol" placeholder="A" {...register("brandCol", { required: true })} />
                            {errors.brandCol && <span className="text-red-500 text-sm">Required</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="styleCol">Style Column (Letter)</Label>
                            <Input id="styleCol" placeholder="B" {...register("styleCol", { required: true })} />
                            {errors.styleCol && <span className="text-red-500 text-sm">Required</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="categoryCol">Category Column (Optional)</Label>
                            <Input id="categoryCol" placeholder="C" {...register("categoryCol")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="colorCol">Color Column (Optional)</Label>
                            <Input id="colorCol" placeholder="D" {...register("colorCol")} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="imageCol">Image Column (Optional)</Label>
                            <Input id="imageCol" placeholder="E" {...register("imageCol")} />
                        </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-4">
                         <div className="flex items-center space-x-2">
                            <Controller
                                name="isIconDistro"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox 
                                        id="isIconDistro" 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                    />
                                )}
                            />
                            <Label htmlFor="isIconDistro">Is Icon Distro</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Controller
                                name="isAiMode"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox 
                                        id="isAiMode" 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                    />
                                )}
                            />
                            <Label htmlFor="isAiMode">AI Mode</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Controller
                                name="skipDataWarehouse"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox 
                                        id="skipDataWarehouse" 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                    />
                                )}
                            />
                            <Label htmlFor="skipDataWarehouse">Skip Data Warehouse</Label>
                        </div>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  )
}
