"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnicastMode = void 0;
const types_1 = require("../types");
const SenderMode_1 = require("./SenderMode");
class UnicastMode extends SenderMode_1.SenderMode {
    constructor() {
        super(...arguments);
        this.mode = types_1.SendMode.Unicast;
    }
}
exports.UnicastMode = UnicastMode;
