import { Spinner } from "./spinner"

interface LoadingProps {
  message?: string
}

export function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center space-y-4">
        <Spinner className="size-10" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
