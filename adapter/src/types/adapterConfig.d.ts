declare global {
  namespace ioBroker {
    interface AdapterConfig {
      port?: number;
      devServerUrl?: string;
      enableDevProxy?: boolean;
    }
  }
}

export {};
