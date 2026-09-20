export type CartActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export const initialCartActionState: CartActionState = { status: "idle" }
