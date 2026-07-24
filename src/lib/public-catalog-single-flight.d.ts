export function createPublicCatalogSingleFlight(): <T>(
  key: string,
  read: () => Promise<T>,
) => Promise<T>
