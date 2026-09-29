import { BroadcastMode } from './modes/BroadcastMode';
import { ReceiveMode } from './modes/ReceiveMode';
import { UnicastMode } from './modes/UnicastMode';
import { SocketState } from './UdpSocket';
import type { CloseListener, ErrorListener, MessageListener, Payload, ReceiveFilter, SendTarget, UdpCastClientOptions, UdpMessage, Unsubscribe } from './types';
export declare class UdpCastClient {
    private readonly socket;
    private readonly bindPort;
    readonly unicast: UnicastMode;
    readonly broadcast: BroadcastMode;
    readonly receive: ReceiveMode;
    constructor(options: UdpCastClientOptions);
    get state(): SocketState;
    get localPort(): number | null;
    bind(port?: number): Promise<void>;
    send(data: Payload, target: SendTarget): void;
    onMessage(listener: MessageListener, filter?: ReceiveFilter): Unsubscribe;
    receiveOnce(timeout?: number, filter?: ReceiveFilter): Promise<UdpMessage>;
    onError(listener: ErrorListener): Unsubscribe;
    onClose(listener: CloseListener): Unsubscribe;
    close(): void;
}
