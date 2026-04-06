/**
 * App.tsx — Root app entry point
 * Wraps: AuthProvider → ToastProvider → NotesProvider → RouterProvider
 */
import React from "react";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./AuthContext";
import { NotesProvider } from "./NotesContext";
import { ToastProvider } from "./toast";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotesProvider>
          <RouterProvider router={router} />
        </NotesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
