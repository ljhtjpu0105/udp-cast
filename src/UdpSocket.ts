import type {
  CloseListener,
  ErrorListener,
  MessageListener,
  NativeUdpSocket,
  Payload,
  RemoteInfo,
  SendTarget,
  UdpLogger,
  UdpMessage,
  Unsubscribe,
} from './types'

export enum SocketState {
  Idle = 'idle',
  Binding = 'binding',
  Bound = 'bound',
  Closed = 'closed',
}

function toError(err: unknown, fallback = 'unknown udp error'): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error(fallback)
}

function formatData(data: Payload, maxBytes = 256): string {
  if (typeof data === 'string') return data
  const bytes = new Uint8Array(data)
  const len = Math.min(bytes.length, maxBytes)
  let hex = ''
  for (let i = 0; i < len; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return bytes.length > maxBytes ? `${hex}...(${bytes.length}B)` : hex
}

const defaultLogger: UdpLogger = {
  info: (message, ...args) => console.log(`[udp-cast] ${message}`, ...args),
  error: (message, ...args) => console.error(`[udp-cast] ${message}`, ...args),
}

export class UdpSocket {
  private readonly native: NativeUdpSocket
  private readonly logger: UdpLogger
  private _state: SocketState = SocketState.Idle

  private readonly messageListeners = new Set<MessageListener>()
  private readonly errorListeners = new Set<ErrorListener>()
  private readonly closeListeners = new Set<CloseListener>()
  private _localPort: number | null = null

  private pendingBind: { resolve: () => void; reject: (error: Error) => void } | null = null

  constructor(native: NativeUdpSocket, logger: UdpLogger = defaultLogger) {
    this.native = native
    this.logger = logger
    this.native.onMessage((data, remote) => this.dispatchMessage(data, remote))
    this.native.onError((error) => this.dispatchError(error))
    this.native.onClose(() => this.dispatchClose())
    this.native.onListening((port) => this.dispatchListening(port))
  }

  get state(): SocketState {
    return this._state
  }

  get localPort(): number | null {
    return this._localPort
  }

  bind(port?: number): Promise<void> {
    if (this._state === SocketState.Bound || this._state === SocketState.Binding) {
      return Promise.resolve()
    }
    if (this._state === SocketState.Closed) {
      return Promise.reject(new Error('socket already closed'))
    }

    this._state = SocketState.Binding
    if (port && port > 0) {
      this._localPort = port
    }
    return new Promise<void>((resolve, reject) => {
      this.pendingBind = { resolve, reject }
      try {
        const ret = this.native.bind(port)
        if (ret && typeof (ret as Promise<void>).then === 'function') {
          ;(ret as Promise<void>).catch((err: unknown) => {
            this.consumeBindReject(toError(err, 'bind failed'))
          })
        }
      } catch (err) {
        this.consumeBindReject(toError(err, 'bind failed'))
      }
    })
  }

  send(target: SendTarget, data: Payload): void {
    if (this._state === SocketState.Closed) {
      throw new Error('socket already closed')
    }
    if (!target || typeof target.address !== 'string' || typeof target.port !== 'number') {
      throw new Error(`invalid send target: ${JSON.stringify(target)}`)
    }
    if (typeof data === 'string') {
      this.logger.info?.(`send ip=${target.address} port=${target.port} data=${data}`)
    } else {
      const bytes = new Uint8Array(data)
      const allZero = bytes.every((b) => b === 0)
      if (allZero) {
        this.logger.info?.(`send ip=${target.address} port=${target.port} len=${bytes.length}`)
      } else {
        this.logger.info?.(`send ip=${target.address} port=${target.port} data=${formatData(data)}`)
      }
    }
    try {
      const ret = this.native.send(target, data)
      if (ret && typeof (ret as Promise<void>).then === 'function') {
        ;(ret as Promise<void>).catch((err: unknown) => {
          this.dispatchError(toError(err, 'send failed'))
        })
      }
    } catch (err) {
      this.dispatchError(toError(err, 'send failed'))
    }
  }

  onMessage(listener: MessageListener): Unsubscribe {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }

  onError(listener: ErrorListener): Unsubscribe {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  onClose(listener: CloseListener): Unsubscribe {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  close(): void {
    if (this._state === SocketState.Closed) return
    this._state = SocketState.Closed
    this.messageListeners.clear()
    this.errorListeners.clear()
    this.closeListeners.clear()
    this.consumeBindReject(new Error('socket closed before bound'))
    try {
      this.native.close()
    } catch {
    }
  }

  private dispatchMessage(data: ArrayBuffer, remote: RemoteInfo): void {
    if (this._state === SocketState.Closed) return
    const message: UdpMessage = { data, remote }
    for (const listener of Array.from(this.messageListeners)) {
      try {
        listener(message)
      } catch (err) {
        this.dispatchError(toError(err, 'message listener error'))
      }
    }
  }

  private dispatchError(error: Error): void {
    this.consumeBindReject(error)
    for (const listener of Array.from(this.errorListeners)) {
      try {
        listener(error)
      } catch {
      }
    }
  }

  private dispatchClose(): void {
    if (this._state !== SocketState.Closed) {
      this._state = SocketState.Closed
    }
    for (const listener of Array.from(this.closeListeners)) {
      try {
        listener()
      } catch {
      }
    }
  }

  private dispatchListening(localPort?: number): void {
    this._state = SocketState.Bound
    this._localPort = localPort ?? null
    if (this.pendingBind) {
      this.pendingBind.resolve()
      this.pendingBind = null
    }
  }

  private consumeBindReject(error: Error): void {
    if (this.pendingBind) {
      const reject = this.pendingBind.reject
      this.pendingBind = null
      reject(error)
    }
  }
}
