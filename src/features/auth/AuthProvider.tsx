import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { manageAuthRefresh, watchAuth, type AuthUser } from './authService';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stopWatching = watchAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    const stopRefresh = manageAuthRefresh();

    return () => {
      stopWatching();
      stopRefresh();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}