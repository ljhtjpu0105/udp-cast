"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderMode = void 0;
class SenderMode {
    constructor(socket) {
        this.timerId = null;
        this.timeoutId = null;
        this.index = 0;
        this.running = false;
        this.socket = socket;
    }
    resolveTarget(target) {
        return target;
    }
    send(data, target) {
        this.socket.send(this.resolveTarget(target), data);
    }
    start(dataOrProvider, target, options = {}) {
        this.stop();
        const { interval = 1000, count = Infinity, timeout, dataProvider } = options;
        const provider = dataProvider !== null && dataProvider !== void 0 ? dataProvider : (typeof dataOrProvider === 'function' ? dataOrProvider : () => dataOrProvider);
        const resolved = this.resolveTarget(target);
        this.index = 0;
        this.running = true;
        const tick = () => {
            if (!this.running)
                return;
            let data;
            try {
                data = provider(this.index);
            }
            catch (_a) {
                this.stop();
                return;
            }
            this.socket.send(resolved, data);
            this.index += 1;
            if (this.index >= count) {
                this.stop();
            }
        };
        tick();
        this.timerId = setInterval(tick, interval);
        if (timeout !== undefined && timeout > 0) {
            this.timeoutId = setTimeout(() => this.stop(), timeout);
        }
    }
    stop() {
        this.running = false;
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    get isRunning() {
        return this.running;
    }
}
exports.SenderMode = SenderMode;
