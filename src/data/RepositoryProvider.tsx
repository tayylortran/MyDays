import { createContext, ReactNode, useContext } from 'react';
import { localRepository } from './localRepository';
import { Repository } from './repository';

const RepositoryContext = createContext<Repository>(localRepository);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  // v1: local. v2: swap localRepository for new ApiRepository(...) — this line only.
  return (
    <RepositoryContext.Provider value={localRepository}>
      {children}
    </RepositoryContext.Provider>
  );
}

export const useRepo = (): Repository => useContext(RepositoryContext);