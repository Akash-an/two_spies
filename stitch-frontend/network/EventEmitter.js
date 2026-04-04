export class EventEmitter {
    constructor() {
        Object.defineProperty(this, "listeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    on(event, fn) {
        const list = this.listeners.get(event) ?? [];
        list.push(fn);
        this.listeners.set(event, list);
    }
    off(event, fn) {
        const list = this.listeners.get(event) ?? [];
        this.listeners.set(event, list.filter((f) => f !== fn));
    }
    emit(event, ...args) {
        this.listeners.get(event)?.forEach((fn) => fn(...args));
    }
}
