import { Link } from "@tanstack/react-router"
import { Button } from "../ui/button"

const NotFound = () => {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center max-w-sm mx-auto">
      <h1 className="text-8xl font-bold text-primary leading-none mb-4">404</h1>
      <p className="text-md">Oops!</p>
      <p className="text-md">Page not found.</p>
      <Button
        asChild
        variant="outline"
        className="mt-4 text-primary border-primary hover:text-primary/80"
      >
        <Link to="/">Go back</Link>
      </Button>
    </div>
  )
}

export default NotFound
