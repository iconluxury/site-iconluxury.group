import { useTheme } from "next-themes"
import type React from "react"
import { Badge } from "../ui/badge"
import { Label } from "../ui/label"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"

const Appearance: React.FC = () => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-full">
      <h2 className="text-lg font-semibold py-4">Appearance</h2>
      <RadioGroup
        value={theme}
        onValueChange={setTheme}
        className="flex flex-col space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="light" />
          <Label htmlFor="light" className="flex items-center gap-2">
            Light Mode
            <Badge variant="secondary" className="ml-1">
              Default
            </Badge>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="dark" />
          <Label htmlFor="dark">Dark Mode</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="system" />
          <Label htmlFor="system">System</Label>
        </div>
      </RadioGroup>
    </div>
  )
}

export default Appearance
