import { z } from "@medusajs/framework/zod"

export const runtimeEnvironmentSchema = z.object({
  STORE_CORS: z.string().min(1),
  ADMIN_CORS: z.string().min(1),
  AUTH_CORS: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DB_NAME: z.string().min(1),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
})

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>

export function parseRuntimeEnvironment(
  input: NodeJS.ProcessEnv = process.env
): RuntimeEnvironment {
  return runtimeEnvironmentSchema.parse(input)
}
