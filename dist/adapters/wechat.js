"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeChatAdapter = void 0;
const defaultFactory = () => {
    const wxApi = globalThis.wx;
    if (!wxApi || typeof wxApi.createUDPSocket !== 'function') {
        throw new Error('[udp-cast] 当前环境不支持 wx.createUDPSocket');
    }
    return wxApi.createUDPSocket();
};
class WeChatAdapter {
    constructor(factory) {
        this.factory = factory !== null && factory !== void 0 ? factory : defaultFactory;
    }
    createSocket() {
        return new WeChatNativeSocket(this.factory());
    }
}
exports.WeChatAdapter = WeChatAdapter;
class WeChatNativeSocket {
    constructor(socket) {
        this.socket = socket;
    }
    bind(port) {
        this.socket.bind(port);
    }
    send(target, data) {
        this.socket.send({ address: target.address, port: target.port, message: data });
    }
    close() {
        this.socket.close();
    }
    onListening(listener) {
        this.socket.onListening((res) => {
            listener(res && typeof res.localPort === 'number' ? res.localPort : undefined);
        });
    }
    onMessage(listener) {
        this.socket.onMessage((res) => {
            listener(res.message, {
                address: res.remoteInfo.address,
                port: res.remoteInfo.port,
                family: res.remoteInfo.family,
                size: res.remoteInfo.size,
            });
        });
    }
    onError(listener) {
        this.socket.onError((err) => {
            listener(new Error(err && err.errMsg ? err.errMsg : 'udp socket error'));
        });
    }
    onClose(listener) {
        this.socket.onClose(listener);
    }
}
