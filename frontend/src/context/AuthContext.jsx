import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearTokens,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  setTokens,
} from "../api/authApi";
import { getApiData, getErrorMessage, getTokenPayload } from "../utils/apiHelpers";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token || token === "undefined") {
      setUser(null);
      return null;
    }

    try {
      const response = await getCurrentUser();
      const currentUser = getApiData(response);

      if (!currentUser) {
        clearTokens();
        setUser(null);
        return null;
      }

      setUser(currentUser);
      return currentUser;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async ({ username, password }) => {
      const response = await loginRequest({ username, password });
      const tokens = getTokenPayload(response);

      if (!tokens?.access_token) {
        throw new Error("Login did not return an access token");
      }

      setTokens(tokens.access_token, tokens.refresh_token);
      return refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [user, loading, login, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
