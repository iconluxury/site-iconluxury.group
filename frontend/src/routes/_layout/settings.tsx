import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import React from "react"

import type { UserPublic } from "../../client"
import ApiStatusManagement from "../../components/UserSettings/ApiStatusManagement"
import Appearance from "../../components/UserSettings/Appearance"
import ChangePassword from "../../components/UserSettings/ChangePassword"
import DeleteAccount from "../../components/UserSettings/DeleteAccount"
import UserInformation from "../../components/UserSettings/UserInformation"
import { Button } from "../../components/ui/button"
import { Separator } from "../../components/ui/separator"
import { cn } from "../../lib/utils"

const sectionsConfig = [
	{ title: "Profile", component: UserInformation },
	{ title: "Password", component: ChangePassword },
	{ title: "Appearance", component: Appearance },
	{ title: "API Status", component: ApiStatusManagement },
]

export const Route = createFileRoute("/_layout/settings")({
	component: UserSettings,
})

function UserSettings() {
	const queryClient = useQueryClient()
	const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
	const [activeSection, setActiveSection] = React.useState(
		sectionsConfig[0].title,
	)

	if (!currentUser) {
		return (
			<div className="container mx-auto py-6 bg-muted/20 min-h-screen">
				<p className="text-foreground">Loading...</p>
			</div>
		)
	}

	const ActiveComponent = sectionsConfig.find(
		(section) => section.title === activeSection,
	)?.component

	return (
		<div className="container mx-auto py-6 max-w-7xl">
			<div className="flex flex-col gap-4">
				<div>
					<h1 className="text-2xl font-bold">Settings</h1>
					<p className="text-sm text-muted-foreground">
						Customize your account
					</p>
				</div>

				<Separator />

				<div className="flex flex-col md:flex-row gap-6">
					<div className="w-full md:w-[200px] p-4 bg-card rounded-md shadow-sm flex flex-col gap-2">
						{sectionsConfig.map((section) => (
							<Button
								key={section.title}
								variant="ghost"
								className={cn(
									"w-full justify-start",
									activeSection === section.title
										? "bg-primary/10 text-primary hover:bg-primary/20"
										: "text-foreground hover:bg-muted",
								)}
								onClick={() => setActiveSection(section.title)}
							>
								{section.title}
							</Button>
						))}
					</div>

					<div className="flex-1 p-4 bg-card rounded-md shadow-sm">
						{ActiveComponent && <ActiveComponent />}
					</div>
				</div>
			</div>
		</div>
	)
}

export default UserSettings
