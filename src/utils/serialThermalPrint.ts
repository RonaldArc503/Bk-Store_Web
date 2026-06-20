const BAUD_RATES = [9600, 115200, 19200, 38400] as const

type SerialNavigator = Navigator & {
  serial?: {
    getPorts: () => Promise<SerialPort[]>
    requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>
  }
}

function getSerialApi() {
  const nav = navigator as SerialNavigator
  return nav.serial ?? null
}

export function isSerialPrintSupported(): boolean {
  return Boolean(getSerialApi())
}

async function openSerialPort(port: SerialPort): Promise<void> {
  let lastError: unknown = null
  for (const baudRate of BAUD_RATES) {
    try {
      await port.open({ baudRate })
      return
    } catch (error) {
      lastError = error
      try {
        await port.close()
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo abrir la ticketera. Revisa cable USB y driver.')
}

function escPosToBytes(payload: string): Uint8Array {
  const bytes = new Uint8Array(payload.length)
  for (let i = 0; i < payload.length; i += 1) {
    bytes[i] = payload.charCodeAt(i) & 0xff
  }
  return bytes
}

export async function pairSerialPrinter(): Promise<void> {
  const serial = getSerialApi()
  if (!serial) {
    throw new Error('Usa Chrome o Edge para conectar la PR-100 por USB/Serial.')
  }
  await serial.requestPort()
}

export async function printEscPosViaSerial(payload: string): Promise<void> {
  const serial = getSerialApi()
  if (!serial) {
    throw new Error('Usa Chrome o Edge para imprimir directo en la PR-100.')
  }

  const ports = await serial.getPorts()
  const port = ports[0] ?? (await serial.requestPort())

  await openSerialPort(port)
  try {
    const writer = port.writable?.getWriter()
    if (!writer) {
      throw new Error('La ticketera no acepto datos por USB/Serial.')
    }
    await writer.write(escPosToBytes(payload))
    writer.releaseLock()
    await new Promise((resolve) => setTimeout(resolve, 400))
  } finally {
    try {
      await port.close()
    } catch {
      /* ignore */
    }
  }
}
