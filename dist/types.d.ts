export interface RemoteInfo {
    address: string;
    port: number;
    family?: string;
    size?: number;
}
export interface UdpMessage {
    data: ArrayBuffer;
    remote: RemoteInfo;
}
export type Payload = string | ArrayBuffer;
export interface SendTarget {
    address: string;
    port: number;
}
export declare enum SendMode {
    Unicast = "unicast",
    Broadcast = "broadcast"
}
export type DataProvider = (index: number) => Payload;
export interface RepeatOptions {
    interval?: number;
    count?: number;
    timeout?: number;
    dataProvider?: DataProvider;
}
export interface ReceiveFilter {
    address?: string;
    port?: number;
}
export type MessageListener = (message: UdpMessage) => void;
export type ErrorListener = (error: Error) => void;
export type CloseListener = () => void;
export type Unsubscribe = () => void;
export interface NativeUdpSocket {
    bind(port?: number): void | Promise<void>;
    send(target: SendTarget, data: Payload): void | Promise<void>;
    close(): void;
    onListening(listener: (localPort?: number) => void): void;
    onMessage(listener: (data: ArrayBuffer, remote: RemoteInfo) => void): void;
    onError(listener: (error: Error) => void): void;
    onClose(listener: () => void): void;
}
export interface UdpAdapter {
    createSocket(): NativeUdpSocket;
}
export interface UdpLogger {
    info?(message: string, ...args: unknown[]): void;
    error?(message: string, ...args: unknown[]): void;
}
export interface UdpCastClientOptions {
    adapter: UdpAdapter;
    bindPort?: number;
    autoBind?: boolean;
    logger?: UdpLogger;
}
