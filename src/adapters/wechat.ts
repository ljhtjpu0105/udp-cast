import type {
  NativeUdpSocket,
  Payload,
  RemoteInfo,
  SendTarget,
  UdpAdapter,
} from '../types'

export interface WeChatUdpSocket {
  bind(port?: number): void
  send(options: { address: string; port: number; message: string | ArrayBuffer }): void
  close(): void
  onListening(callback: (res: { localPort?: number }) => void): void
  onMessage(callback: (res: WeChatUdpMessage) => void): void
  onError(callback: (error: { errMsg?: string }) => void): void
  onClose(callback: () => void): void
}

export interface WeChatUdpMessage {
  message: ArrayBuffer
  remoteInfo: {
    address: string
    port: number
    family?: string
    size?: number
  }
}

export type CreateUdpSocket = () => WeChatUdpSocket

const defaultFactory: CreateUdpSocket = () => {
  const wxApi = (globalThis as { wx?: { createUDPSocket?: () => WeChatUdpSocket } }).wx
  if (!wxApi || typeof wxApi.createUDPSocket !== 'function') {
    throw new Error('[udp-cast] 当前环境不支持 wx.createUDPSocket')
  }
  return wxApi.createUDPSocket()
}

export class WeChatAdapter implements UdpAdapter {
  private readonly factory: CreateUdpSocket

  constructor(factory?: CreateUdpSocket) {
    this.factory = factory ?? defaultFactory
  }

  createSocket(): NativeUdpSocket {
    return new WeChatNativeSocket(this.factory())
  }
}

class WeChatNativeSocket implements NativeUdpSocket {
  private readonly socket: WeChatUdpSocket

  constructor(socket: WeChatUdpSocket) {
    this.socket = socket
  }

  bind(port?: number): void {
    this.socket.bind(port)
  }

  send(target: SendTarget, data: Payload): void {
    this.socket.send({ address: target.address, port: target.port, message: data })
  }

  close(): void {
    this.socket.close()
  }

  onListening(listener: (localPort?: number) => void): void {
    this.socket.onListening((res) => {
      listener(res && typeof res.localPort === 'number' ? res.localPort : undefined)
    })
  }

  onMessage(listener: (data: ArrayBuffer, remote: RemoteInfo) => void): void {
    this.socket.onMessage((res) => {
      listener(res.message, {
        address: res.remoteInfo.address,
        port: res.remoteInfo.port,
        family: res.remoteInfo.family,
        size: res.remoteInfo.size,
      })
    })
  }

  onError(listener: (error: Error) => void): void {
    this.socket.onError((err) => {
      listener(new Error(err && err.errMsg ? err.errMsg : 'udp socket error'))
    })
  }

  onClose(listener: () => void): void {
    this.socket.onClose(listener)
  }
}
