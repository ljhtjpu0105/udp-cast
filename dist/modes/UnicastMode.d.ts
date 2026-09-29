import { SendMode } from '../types';
import { SenderMode } from './SenderMode';
export declare class UnicastMode extends SenderMode {
    readonly mode = SendMode.Unicast;
}
