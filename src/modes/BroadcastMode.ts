import { SendMode, SendTarget } from '../types'
import { SenderMode } from './SenderMode'

const DEFAULT_BROADCAST_ADDRESS = '255.255.255.255'

export class BroadcastMode extends SenderMode {
  readonly mode = SendMode.Broadcast

  protected resolveTarget(target: SendTarget): SendTarget {
    return {
      address: target.address || DEFAULT_BROADCAST_ADDRESS,
      port: target.port,
    }
  }
}
