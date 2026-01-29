// src/lib/notifications/providers/external-api.ts
class ExternalApiProvider {
  name = "external-api";
  config;
  constructor(config) {
    this.config = config ?? { enabled: false };
  }
  isAvailable() {
    return this.config.enabled && !!this.config.webhook_url;
  }
  playNotification(event, metadata) {
    if (!this.isAvailable()) {
      return;
    }
    if (this.config.events && !this.config.events.includes(event)) {
      return;
    }
  }
  buildPayload(event, metadata) {
    return {
      event,
      timestamp: new Date().toISOString(),
      metadata,
      synthesisOutput: metadata?.synthesisOutput,
      threadId: metadata?.threadId
    };
  }
}
export {
  ExternalApiProvider
};
