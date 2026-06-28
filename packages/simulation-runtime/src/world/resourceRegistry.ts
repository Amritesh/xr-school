export type ResourceDisposer = () => void | Promise<void>;

export interface ResourceRegistry {
  register(id: string, dispose: ResourceDisposer): () => void;
  dispose(id: string): Promise<void>;
  disposeAll(): Promise<void>;
  leaks(): string[];
  size(): number;
}

interface ResourceEntry {
  id: string;
  dispose: ResourceDisposer;
}

export function createResourceRegistry(): ResourceRegistry {
  const entries: ResourceEntry[] = [];
  let disposingAll = false;

  function indexOf(id: string) {
    return entries.findIndex(entry => entry.id === id);
  }

  async function disposeAt(index: number) {
    const entry = entries[index];
    await entry.dispose();
    entries.splice(index, 1);
  }

  return {
    register(id, dispose) {
      if (!id.trim()) throw new Error('Resource ID is required');
      if (typeof dispose !== 'function') throw new Error(`${id}: disposer must be a function`);
      if (disposingAll) throw new Error('Cannot register resources during disposal');
      if (indexOf(id) !== -1) throw new Error(`Duplicate resource ${id}`);

      entries.push({ id, dispose });
      let released = false;
      return () => {
        if (released) return;
        const index = indexOf(id);
        if (index !== -1) entries.splice(index, 1);
        released = true;
      };
    },

    async dispose(id) {
      const index = indexOf(id);
      if (index === -1) return;
      await disposeAt(index);
    },

    async disposeAll() {
      if (disposingAll) throw new Error('Resource disposal is already in progress');
      disposingAll = true;
      const failures: Error[] = [];

      try {
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          const entry = entries[index];
          try {
            await entry.dispose();
            entries.splice(index, 1);
          } catch (error) {
            const reason = error instanceof Error ? error : new Error(String(error));
            failures.push(new Error(`${entry.id}: ${reason.message}`, { cause: reason }));
          }
        }
      } finally {
        disposingAll = false;
      }

      if (failures.length > 0) {
        throw new AggregateError(failures, `Failed to dispose ${failures.length} resource(s)`);
      }
    },

    leaks() {
      return entries.map(entry => entry.id);
    },

    size() {
      return entries.length;
    },
  };
}
