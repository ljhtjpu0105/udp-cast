import type { UdpSocket } from '../UdpSocket';
import type { DataProvider, Payload, RepeatOptions, SendMode, SendTarget } from '../types';
export declare abstract class SenderMode {
    protected readonly socket: UdpSocket;
    private timerId;
    private timeoutId;
    private index;
    private running;
    constructor(socket: UdpSocket);
    abstract readonly mode: SendMode;
    protected resolveTarget(target: SendTarget): SendTarget;
    send(data: Payload, target: SendTarget): void;
    start(dataOrProvider: Payload | DataProvider, target: SendTarget, options?: RepeatOptions): void;
    stop(): void;
    get isRunning(): boolean;
}
