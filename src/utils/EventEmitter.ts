type EventType = Record<string, any>;

export class BaseEventEmitter<T extends EventType> {

    private events: Map<keyof T, Set<(args: any) => void>> = new Map();

    public on<K extends keyof T>(event: K, listener: (args: T[K]) => void) {
        this.addListener({ event, listener });
        return this;
    }

    public once<K extends keyof T>(event: K, listener: (args: T[K]) => void) {
        this.addListener({ event, listener, once: true });
        return this;
    }

    private addListener<K extends keyof T>({ event, listener, ...args }: {
        event: K,
        listener: (args: T[K]) => void,
        once?: boolean
    }) {
        const self = this;
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        const fn = args.once ? function onceHandler(data: T[K]) {
            listener(data);
            self.off(event, onceHandler);
        } : listener;

        this.events.get(event)!.add(fn);
        return this;
    }

    public off<K extends keyof T>(event: K, listener: (args: T[K]) => void) {
        this.events.get(event)?.delete(listener);
        return this;
    }

    protected emit<K extends keyof T>(event: K, data?: T[K]) {
        if (!this.events.has(event)) {
            return;
        }

        const listeners = new Set(this.events.get(event)!);
        listeners.forEach(fn => fn(data));
    }

    public removeAllListeners<K extends keyof T>(event?: K) {
        if (event !== undefined) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }
}

export class EventEmitter<T extends EventType> extends BaseEventEmitter<T> {
    public emit<K extends keyof T>(event: K, data?: T[K] | undefined): void {
        return super.emit(event, data);
    }
}