import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"

export class TestSinkNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-test-sink"

  protected sentNotifications: ProviderSendNotificationDTO[] = []
  protected simulatedFailure: Error | null = null

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (this.simulatedFailure) {
      throw this.simulatedFailure
    }

    this.sentNotifications.push({ ...notification })

    return {
      id: `sink_notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }
  }

  getSentNotifications(): ProviderSendNotificationDTO[] {
    return [...this.sentNotifications]
  }

  clearSentNotifications(): void {
    this.sentNotifications = []
  }

  setSimulatedFailure(error: Error | null): void {
    this.simulatedFailure = error
  }

  clearSimulatedFailure(): void {
    this.simulatedFailure = null
  }
}
