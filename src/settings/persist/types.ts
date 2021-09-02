export type AccountBoundPersistedItem<T> = Record<
  string,
  T & { expirationDate?: string }
>;
