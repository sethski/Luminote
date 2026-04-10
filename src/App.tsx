/**
 * App.tsx — Root app entry point
 * Wraps: AuthProvider → ToastProvider → NotesProvider → TimerProvider → RouterProvider
 */
import React from "react";
import { RouterProvider } from "react-router";
import { AuthProvider, useAuth } from "./AuthContext";
import { NotesProvider } from "./NotesContext";
import { ToastProvider } from "./toast";
import { TimerProvider } from "./TimerContext";
import { router } from "./routes";

function AppInner() {
  const { user } = useAuth();
  return (
    <TimerProvider userId={user?.id}>
      <RouterProvider router={router} />
    </TimerProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotesProvider>
          <AppInner />
        </NotesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
