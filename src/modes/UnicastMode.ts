import { SendMode } from '../types'
import { SenderMode } from './SenderMode'

export class UnicastMode extends SenderMode {
  readonly mode = SendMode.Unicast
}
