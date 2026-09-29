import type { UdpSocket } from '../UdpSocket';
import type { MessageListener, ReceiveFilter, UdpMessage, Unsubscribe } from '../types';
export declare class ReceiveMode {
    private readonly socket;
    constructor(socket: UdpSocket);
    onMessage(listener: MessageListener, filter?: ReceiveFilter): Unsubscribe;
    receiveOnce(timeout?: number, filter?: ReceiveFilter): Promise<UdpMessage>;
    private wrapFilter;
}
