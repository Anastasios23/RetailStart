export type CartCookieOptions = {
  httpOnly: true
  sameSite: "lax"
  secure: boolean
  path: "/"
}

export function createCartCookieOptions(isProduction: boolean): CartCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  }
}
