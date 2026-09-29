"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdpCastClient = void 0;
const UdpSocket_1 = require("./UdpSocket");
const BroadcastMode_1 = require("./modes/BroadcastMode");
const ReceiveMode_1 = require("./modes/ReceiveMode");
const UnicastMode_1 = require("./modes/UnicastMode");
class UdpCastClient {
    constructor(options) {
        const native = options.adapter.createSocket();
        this.socket = new UdpSocket_1.UdpSocket(native, options.logger);
        this.bindPort = options.bindPort;
        this.unicast = new UnicastMode_1.UnicastMode(this.socket);
        this.broadcast = new BroadcastMode_1.BroadcastMode(this.socket);
        this.receive = new ReceiveMode_1.ReceiveMode(this.socket);
        if (options.autoBind) {
            void this.bind();
        }
    }
    get state() {
        return this.socket.state;
    }
    get localPort() {
        return this.socket.localPort;
    }
    bind(port) {
        var _a;
        if (port === void 0) { port = (_a = this.bindPort) !== null && _a !== void 0 ? _a : 0; }
        return this.socket.bind(port);
    }
    send(data, target) {
        this.unicast.send(data, target);
    }
    onMessage(listener, filter) {
        return this.receive.onMessage(listener, filter);
    }
    receiveOnce(timeout, filter) {
        return this.receive.receiveOnce(timeout, filter);
    }
    onError(listener) {
        return this.socket.onError(listener);
    }
    onClose(listener) {
        return this.socket.onClose(listener);
    }
    close() {
        this.unicast.stop();
        this.broadcast.stop();
        this.socket.close();
    }
}
exports.UdpCastClient = UdpCastClient;
