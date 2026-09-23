/**
 * Base repository contract for common data operations.
 */
export interface BaseRepository<T, ID = string> {
  save(entity: T): Promise<T> | T;
  findById(id: ID): Promise<T | null> | (T | null);
  findAll(): Promise<T[]> | T[];
  delete(id: ID): Promise<boolean> | boolean;
}
