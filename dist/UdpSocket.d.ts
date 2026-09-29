import type { CloseListener, ErrorListener, MessageListener, NativeUdpSocket, Payload, SendTarget, UdpLogger, Unsubscribe } from './types';
export declare enum SocketState {
    Idle = "idle",
    Binding = "binding",
    Bound = "bound",
    Closed = "closed"
}
export declare class UdpSocket {
    private readonly native;
    private readonly logger;
    private _state;
    private readonly messageListeners;
    private readonly errorListeners;
    private readonly closeListeners;
    private _localPort;
    private pendingBind;
    constructor(native: NativeUdpSocket, logger?: UdpLogger);
    get state(): SocketState;
    get localPort(): number | null;
    bind(port?: number): Promise<void>;
    send(target: SendTarget, data: Payload): void;
    onMessage(listener: MessageListener): Unsubscribe;
    onError(listener: ErrorListener): Unsubscribe;
    onClose(listener: CloseListener): Unsubscribe;
    close(): void;
    private dispatchMessage;
    private dispatchError;
    private dispatchClose;
    private dispatchListening;
    private consumeBindReject;
}
