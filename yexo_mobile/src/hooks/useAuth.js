import { useEffect } from "react";
import { useAuthStore } from "../store/auth.store";

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    loadUser,
  } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
};
