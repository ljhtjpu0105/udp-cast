import type { NativeUdpSocket, UdpAdapter } from '../types';
export interface WeChatUdpSocket {
    bind(port?: number): void;
    send(options: {
        address: string;
        port: number;
        message: string | ArrayBuffer;
    }): void;
    close(): void;
    onListening(callback: (res: {
        localPort?: number;
    }) => void): void;
    onMessage(callback: (res: WeChatUdpMessage) => void): void;
    onError(callback: (error: {
        errMsg?: string;
    }) => void): void;
    onClose(callback: () => void): void;
}
export interface WeChatUdpMessage {
    message: ArrayBuffer;
    remoteInfo: {
        address: string;
        port: number;
        family?: string;
        size?: number;
    };
}
export type CreateUdpSocket = () => WeChatUdpSocket;
export declare class WeChatAdapter implements UdpAdapter {
    private readonly factory;
    constructor(factory?: CreateUdpSocket);
    createSocket(): NativeUdpSocket;
}
