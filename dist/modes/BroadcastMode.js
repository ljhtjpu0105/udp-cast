"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastMode = void 0;
const types_1 = require("../types");
const SenderMode_1 = require("./SenderMode");
const DEFAULT_BROADCAST_ADDRESS = '255.255.255.255';
class BroadcastMode extends SenderMode_1.SenderMode {
    constructor() {
        super(...arguments);
        this.mode = types_1.SendMode.Broadcast;
    }
    resolveTarget(target) {
        return {
            address: target.address || DEFAULT_BROADCAST_ADDRESS,
            port: target.port,
        };
    }
}
exports.BroadcastMode = BroadcastMode;
