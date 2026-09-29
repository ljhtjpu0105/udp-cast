import type { UdpSocket } from '../UdpSocket'
import type {
  DataProvider,
  Payload,
  RepeatOptions,
  SendMode,
  SendTarget,
} from '../types'

export abstract class SenderMode {
  protected readonly socket: UdpSocket

  private timerId: ReturnType<typeof setInterval> | null = null
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private index = 0
  private running = false

  constructor(socket: UdpSocket) {
    this.socket = socket
  }

  abstract readonly mode: SendMode

  protected resolveTarget(target: SendTarget): SendTarget {
    return target
  }

  send(data: Payload, target: SendTarget): void {
    this.socket.send(this.resolveTarget(target), data)
  }

  start(dataOrProvider: Payload | DataProvider, target: SendTarget, options: RepeatOptions = {}): void {
    this.stop()

    const { interval = 1000, count = Infinity, timeout, dataProvider } = options
    const provider: DataProvider =
      dataProvider ??
      (typeof dataOrProvider === 'function' ? (dataOrProvider as DataProvider) : () => dataOrProvider)

    const resolved = this.resolveTarget(target)
    this.index = 0
    this.running = true

    const tick = (): void => {
      if (!this.running) return
      let data: Payload
      try {
        data = provider(this.index)
      } catch {
        this.stop()
        return
      }
      this.socket.send(resolved, data)
      this.index += 1
      if (this.index >= count) {
        this.stop()
      }
    }

    tick()
    this.timerId = setInterval(tick, interval)

    if (timeout !== undefined && timeout > 0) {
      this.timeoutId = setTimeout(() => this.stop(), timeout)
    }
  }

  stop(): void {
    this.running = false
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  get isRunning(): boolean {
    return this.running
  }
}
