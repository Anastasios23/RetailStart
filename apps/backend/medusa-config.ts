import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { parseRuntimeEnvironment } from './src/config/environment'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const environment = parseRuntimeEnvironment()

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: environment.DATABASE_URL,
    http: {
      storeCors: environment.STORE_CORS,
      adminCors: environment.ADMIN_CORS,
      authCors: environment.AUTH_CORS,
      jwtSecret: environment.JWT_SECRET,
      cookieSecret: environment.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-postgres",
            id: "postgres",
            is_default: true,
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: environment.STRIPE_API_KEY,
              webhookSecret: environment.STRIPE_WEBHOOK_SECRET,
              capture: true,
              paymentMethodConfiguration: environment.STRIPE_PAYMENT_METHOD_CONFIGURATION,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/notification-test-sink",
            id: "notification-test-sink",
            options: {
              channels: ["email"],
            },
          },
        ],
      },
    },
  ]
})
