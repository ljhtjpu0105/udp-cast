"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiveMode = void 0;
class ReceiveMode {
    constructor(socket) {
        this.socket = socket;
    }
    onMessage(listener, filter) {
        return this.socket.onMessage(this.wrapFilter(listener, filter));
    }
    receiveOnce(timeout = 3000, filter) {
        return new Promise((resolve, reject) => {
            let timer = null;
            const unsubscribe = this.onMessage((message) => {
                if (timer !== null) {
                    clearTimeout(timer);
                }
                unsubscribe();
                resolve(message);
            }, filter);
            timer = setTimeout(() => {
                unsubscribe();
                reject(new Error(`receiveOnce timeout after ${timeout}ms`));
            }, timeout);
        });
    }
    wrapFilter(listener, filter) {
        if (!filter)
            return listener;
        return (message) => {
            if (filter.address !== undefined && message.remote.address !== filter.address)
                return;
            if (filter.port !== undefined && message.remote.port !== filter.port)
                return;
            listener(message);
        };
    }
}
exports.ReceiveMode = ReceiveMode;
