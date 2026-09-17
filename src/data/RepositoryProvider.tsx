import { createContext, ReactNode, useContext } from 'react';
import { Repository } from './repository';
import { supabaseRepository } from './supabaseRepository';

const RepositoryContext = createContext<Repository>(supabaseRepository);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  // v1: local. v2: swap localRepository for new ApiRepository(...) — this line only.
  return (
    <RepositoryContext.Provider value={supabaseRepository}>
      {children}
    </RepositoryContext.Provider>
  );
}

export const useRepo = (): Repository => useContext(RepositoryContext);