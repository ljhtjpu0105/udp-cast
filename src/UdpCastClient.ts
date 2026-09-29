import { UdpSocket } from './UdpSocket'
import { BroadcastMode } from './modes/BroadcastMode'
import { ReceiveMode } from './modes/ReceiveMode'
import { UnicastMode } from './modes/UnicastMode'
import { SocketState } from './UdpSocket'
import type {
  CloseListener,
  ErrorListener,
  MessageListener,
  Payload,
  ReceiveFilter,
  SendTarget,
  UdpCastClientOptions,
  UdpMessage,
  Unsubscribe,
} from './types'

export class UdpCastClient {
  private readonly socket: UdpSocket
  private readonly bindPort: number | undefined

  readonly unicast: UnicastMode
  readonly broadcast: BroadcastMode
  readonly receive: ReceiveMode

  constructor(options: UdpCastClientOptions) {
    const native = options.adapter.createSocket()
    this.socket = new UdpSocket(native, options.logger)
    this.bindPort = options.bindPort

    this.unicast = new UnicastMode(this.socket)
    this.broadcast = new BroadcastMode(this.socket)
    this.receive = new ReceiveMode(this.socket)

    if (options.autoBind) {
      void this.bind()
    }
  }

  get state(): SocketState {
    return this.socket.state
  }

  get localPort(): number | null {
    return this.socket.localPort
  }

  bind(port: number = this.bindPort ?? 0): Promise<void> {
    return this.socket.bind(port)
  }

  send(data: Payload, target: SendTarget): void {
    this.unicast.send(data, target)
  }

  onMessage(listener: MessageListener, filter?: ReceiveFilter): Unsubscribe {
    return this.receive.onMessage(listener, filter)
  }

  receiveOnce(timeout?: number, filter?: ReceiveFilter): Promise<UdpMessage> {
    return this.receive.receiveOnce(timeout, filter)
  }

  onError(listener: ErrorListener): Unsubscribe {
    return this.socket.onError(listener)
  }

  onClose(listener: CloseListener): Unsubscribe {
    return this.socket.onClose(listener)
  }

  close(): void {
    this.unicast.stop()
    this.broadcast.stop()
    this.socket.close()
  }
}
