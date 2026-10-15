import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { TestSinkNotificationProviderService } from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [TestSinkNotificationProviderService],
})
