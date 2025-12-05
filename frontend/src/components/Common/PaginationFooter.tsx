import { Button } from "../ui/button"

type PaginationFooterProps = {
  hasNextPage?: boolean
  hasPreviousPage?: boolean
  onChangePage: (newPage: number) => void
  page: number
}

export function PaginationFooter({
  hasNextPage,
  hasPreviousPage,
  onChangePage,
  page,
}: PaginationFooterProps) {
  return (
    <div className="flex gap-4 items-center mt-4 flex-row justify-end">
      <Button
        onClick={() => onChangePage(page - 1)}
        disabled={!hasPreviousPage || page <= 1}
        variant="outline"
      >
        Previous
      </Button>
      <span>Page {page}</span>
      <Button
        disabled={!hasNextPage}
        onClick={() => onChangePage(page + 1)}
        variant="outline"
      >
        Next
      </Button>
    </div>
  )
}
