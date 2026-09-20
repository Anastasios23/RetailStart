type ShutdownState = "serving" | "draining"

let state: ShutdownState = "serving"
let handlersInstalled = false

function installShutdownHandlers(): void {
  if (handlersInstalled) {
    return
  }

  handlersInstalled = true

  const beginDrain = () => {
    if (state === "draining") {
      return
    }

    state = "draining"
    const timeout = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000)

    setTimeout(() => {
      process.exit(0)
    }, timeout).unref()
  }

  process.once("SIGTERM", beginDrain)
  process.once("SIGINT", beginDrain)
}

export function isDraining(): boolean {
  installShutdownHandlers()
  return state === "draining"
}
