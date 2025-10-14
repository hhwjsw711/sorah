"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface AuthContextType {
  userId: Id<"users"> | null;
  setUserId: (id: Id<"users"> | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<Id<"users"> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load userId from localStorage on mount
    const storedUserId = localStorage.getItem("sorah_user_id");
    if (storedUserId) {
      setUserIdState(storedUserId as Id<"users">);
    }
    setIsInitialized(true);
  }, []);

  const setUserId = (id: Id<"users"> | null) => {
    setUserIdState(id);
    if (id) {
      localStorage.setItem("sorah_user_id", id);
    } else {
      localStorage.removeItem("sorah_user_id");
    }
  };

  const signOut = () => {
    setUserIdState(null);
    localStorage.removeItem("sorah_user_id");
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ userId, setUserId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

