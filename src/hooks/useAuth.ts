import { useEffect, useState } from "react";

const MOCK_USERS = [
  { id: 1, name: "Alice Chen", role: "Admin" },
  { id: 2, name: "Bob Martinez", role: "Manager" },
  { id: 3, name: "Sara Kim", role: "Viewer" },
];

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  const login = (userId: number) => {
    const foundUser = MOCK_USERS.find((u) => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem("user", JSON.stringify(foundUser));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user") {
        const newUser = event.newValue ? JSON.parse(event.newValue) : null;
        setUser(newUser);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return { user, MOCK_USERS, login, logout };
};
