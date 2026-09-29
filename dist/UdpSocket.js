"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdpSocket = exports.SocketState = void 0;
var SocketState;
(function (SocketState) {
    SocketState["Idle"] = "idle";
    SocketState["Binding"] = "binding";
    SocketState["Bound"] = "bound";
    SocketState["Closed"] = "closed";
})(SocketState || (exports.SocketState = SocketState = {}));
function toError(err, fallback = 'unknown udp error') {
    if (err instanceof Error)
        return err;
    if (typeof err === 'string')
        return new Error(err);
    return new Error(fallback);
}
function formatData(data, maxBytes = 256) {
    if (typeof data === 'string')
        return data;
    const bytes = new Uint8Array(data);
    const len = Math.min(bytes.length, maxBytes);
    let hex = '';
    for (let i = 0; i < len; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return bytes.length > maxBytes ? `${hex}...(${bytes.length}B)` : hex;
}
const defaultLogger = {
    info: (message, ...args) => console.log(`[udp-cast] ${message}`, ...args),
    error: (message, ...args) => console.error(`[udp-cast] ${message}`, ...args),
};
class UdpSocket {
    constructor(native, logger = defaultLogger) {
        this._state = SocketState.Idle;
        this.messageListeners = new Set();
        this.errorListeners = new Set();
        this.closeListeners = new Set();
        this._localPort = null;
        this.pendingBind = null;
        this.native = native;
        this.logger = logger;
        this.native.onMessage((data, remote) => this.dispatchMessage(data, remote));
        this.native.onError((error) => this.dispatchError(error));
        this.native.onClose(() => this.dispatchClose());
        this.native.onListening((port) => this.dispatchListening(port));
    }
    get state() {
        return this._state;
    }
    get localPort() {
        return this._localPort;
    }
    bind(port) {
        if (this._state === SocketState.Bound || this._state === SocketState.Binding) {
            return Promise.resolve();
        }
        if (this._state === SocketState.Closed) {
            return Promise.reject(new Error('socket already closed'));
        }
        this._state = SocketState.Binding;
        if (port && port > 0) {
            this._localPort = port;
        }
        return new Promise((resolve, reject) => {
            this.pendingBind = { resolve, reject };
            try {
                const ret = this.native.bind(port);
                if (ret && typeof ret.then === 'function') {
                    ;
                    ret.catch((err) => {
                        this.consumeBindReject(toError(err, 'bind failed'));
                    });
                }
            }
            catch (err) {
                this.consumeBindReject(toError(err, 'bind failed'));
            }
        });
    }
    send(target, data) {
        var _a, _b, _c, _d, _e, _f;
        if (this._state === SocketState.Closed) {
            throw new Error('socket already closed');
        }
        if (!target || typeof target.address !== 'string' || typeof target.port !== 'number') {
            throw new Error(`invalid send target: ${JSON.stringify(target)}`);
        }
        if (typeof data === 'string') {
            (_b = (_a = this.logger).info) === null || _b === void 0 ? void 0 : _b.call(_a, `send ip=${target.address} port=${target.port} data=${data}`);
        }
        else {
            const bytes = new Uint8Array(data);
            const allZero = bytes.every((b) => b === 0);
            if (allZero) {
                (_d = (_c = this.logger).info) === null || _d === void 0 ? void 0 : _d.call(_c, `send ip=${target.address} port=${target.port} len=${bytes.length}`);
            }
            else {
                (_f = (_e = this.logger).info) === null || _f === void 0 ? void 0 : _f.call(_e, `send ip=${target.address} port=${target.port} data=${formatData(data)}`);
            }
        }
        try {
            const ret = this.native.send(target, data);
            if (ret && typeof ret.then === 'function') {
                ;
                ret.catch((err) => {
                    this.dispatchError(toError(err, 'send failed'));
                });
            }
        }
        catch (err) {
            this.dispatchError(toError(err, 'send failed'));
        }
    }
    onMessage(listener) {
        this.messageListeners.add(listener);
        return () => this.messageListeners.delete(listener);
    }
    onError(listener) {
        this.errorListeners.add(listener);
        return () => this.errorListeners.delete(listener);
    }
    onClose(listener) {
        this.closeListeners.add(listener);
        return () => this.closeListeners.delete(listener);
    }
    close() {
        if (this._state === SocketState.Closed)
            return;
        this._state = SocketState.Closed;
        this.messageListeners.clear();
        this.errorListeners.clear();
        this.closeListeners.clear();
        this.consumeBindReject(new Error('socket closed before bound'));
        try {
            this.native.close();
        }
        catch (_a) {
        }
    }
    dispatchMessage(data, remote) {
        if (this._state === SocketState.Closed)
            return;
        const message = { data, remote };
        for (const listener of Array.from(this.messageListeners)) {
            try {
                listener(message);
            }
            catch (err) {
                this.dispatchError(toError(err, 'message listener error'));
            }
        }
    }
    dispatchError(error) {
        this.consumeBindReject(error);
        for (const listener of Array.from(this.errorListeners)) {
            try {
                listener(error);
            }
            catch (_a) {
            }
        }
    }
    dispatchClose() {
        if (this._state !== SocketState.Closed) {
            this._state = SocketState.Closed;
        }
        for (const listener of Array.from(this.closeListeners)) {
            try {
                listener();
            }
            catch (_a) {
            }
        }
    }
    dispatchListening(localPort) {
        this._state = SocketState.Bound;
        this._localPort = localPort !== null && localPort !== void 0 ? localPort : null;
        if (this.pendingBind) {
            this.pendingBind.resolve();
            this.pendingBind = null;
        }
    }
    consumeBindReject(error) {
        if (this.pendingBind) {
            const reject = this.pendingBind.reject;
            this.pendingBind = null;
            reject(error);
        }
    }
}
exports.UdpSocket = UdpSocket;
