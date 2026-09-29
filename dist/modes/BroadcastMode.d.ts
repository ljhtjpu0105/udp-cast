import { SendMode, SendTarget } from '../types';
import { SenderMode } from './SenderMode';
export declare class BroadcastMode extends SenderMode {
    readonly mode = SendMode.Broadcast;
    protected resolveTarget(target: SendTarget): SendTarget;
}
