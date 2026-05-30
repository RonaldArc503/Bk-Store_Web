declare global {
  interface Window {
    qz?: {
      websocket: {
        isActive: () => boolean
        connect: () => Promise<void>
        disconnect: () => Promise<void>
      }
      security: {
        setCertificatePromise: (handler: (resolve: (value?: string) => void, reject: (reason?: unknown) => void) => void) => void
        setSignaturePromise: (
          handler: (toSign: string) => (resolve: (value: string) => void, reject: (reason?: unknown) => void) => void
        ) => void
      }
      configs: {
        create: (printer: string, options?: Record<string, unknown>) => unknown
      }
      printers: {
        find: () => Promise<string[]>
        getDefault: () => Promise<string>
      }
      print: (config: unknown, data: unknown[]) => Promise<void>
    }
  }
}

export {}
