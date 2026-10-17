/** Serializes work per key and coalesces arrivals during a pass into one latest-value trailing pass. */
export class LatestTrailingWorkQueue {
    activeByKey = new Map();
    run;
    logDetachedError;
    constructor(run, logDetachedError) {
        this.run = run;
        this.logDetachedError = logDetachedError;
    }
    enqueue(key, value) {
        return new Promise((resolve, reject) => {
            const waiter = { resolve, reject };
            const active = this.activeByKey.get(key);
            if (active) {
                if (active.trailing) {
                    active.trailing.value = value;
                    active.trailing.waiters.push(waiter);
                }
                else {
                    active.trailing = { value, waiters: [waiter] };
                }
                return;
            }
            const next = { trailing: null };
            this.activeByKey.set(key, next);
            void this.drain(key, next, { value, waiters: [waiter] }).catch((error) => {
                this.logDetachedError(key, error);
            });
        });
    }
    async drain(key, active, firstBatch) {
        let batch = firstBatch;
        while (batch) {
            try {
                await this.run(batch.value);
                for (const waiter of batch.waiters)
                    waiter.resolve();
            }
            catch (error) {
                for (const waiter of batch.waiters)
                    waiter.reject(error);
            }
            batch = active.trailing;
            active.trailing = null;
        }
        if (this.activeByKey.get(key) === active)
            this.activeByKey.delete(key);
    }
}
