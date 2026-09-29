import type { UdpSocket } from '../UdpSocket'
import type { MessageListener, ReceiveFilter, UdpMessage, Unsubscribe } from '../types'

export class ReceiveMode {
  private readonly socket: UdpSocket

  constructor(socket: UdpSocket) {
    this.socket = socket
  }

  onMessage(listener: MessageListener, filter?: ReceiveFilter): Unsubscribe {
    return this.socket.onMessage(this.wrapFilter(listener, filter))
  }

  receiveOnce(timeout = 3000, filter?: ReceiveFilter): Promise<UdpMessage> {
    return new Promise<UdpMessage>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      const unsubscribe = this.onMessage((message) => {
        if (timer !== null) {
          clearTimeout(timer)
        }
        unsubscribe()
        resolve(message)
      }, filter)

      timer = setTimeout(() => {
        unsubscribe()
        reject(new Error(`receiveOnce timeout after ${timeout}ms`))
      }, timeout)
    })
  }

  private wrapFilter(listener: MessageListener, filter?: ReceiveFilter): MessageListener {
    if (!filter) return listener
    return (message) => {
      if (filter.address !== undefined && message.remote.address !== filter.address) return
      if (filter.port !== undefined && message.remote.port !== filter.port) return
      listener(message)
    }
  }
}
