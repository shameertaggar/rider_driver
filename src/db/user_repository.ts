import { User } from '../models/modelsIndex.js';
import { InMemoryStore } from './in_memory_store.js';

export class UserRepository {
  private store: InMemoryStore;

  constructor(store: InMemoryStore = InMemoryStore.getInstance()) {
    this.store = store;
  }

  public save(user: User): User {
    this.store.users.set(user.id, { ...user });
    return this.store.users.get(user.id)!;
  }

  public findById(id: string): User | null {
    const u = this.store.users.get(id);
    return u ? { ...u } : null;
  }

  public findAll(): User[] {
    return Array.from(this.store.users.values()).map(u => ({ ...u }));
  }

  public delete(id: string): boolean {
    return this.store.users.delete(id);
  }

  public exists(id: string): boolean {
    return this.store.users.has(id);
  }
}
