/**
 * routes.ts — Application routing
 * Public:    /landing, /login, /auth/callback
 * Protected: /home/* — redirects to /login if not authenticated
 */
import { createBrowserRouter, Navigate } from "react-router";
import React from "react";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../features/auth/AuthContext";
import { AuthLoadingSplash } from "./AuthLoadingSplash";

// Public pages
import { Landing } from "../features/home/Landing";
import { Auth    } from "../features/auth/Auth";
import { AuthCallback } from "../features/auth/AuthCallback";

// Protected screens
import { Root          } from "../components/layout/Root";
import { Home          } from "../features/home/Home";
import { AllNotes      } from "../features/notes/AllNotes";
import { Editor        } from "../features/notes/Editor";
import { Search        } from "../features/notes/Search";
import { Settings      } from "../features/settings/Settings";
import { CalendarScreen } from "../features/study/CalendarPage";
import { UploadImage   } from "../features/media/UploadImage";
import { VoiceMemo     } from "../features/media/VoiceMemo";
import { Hangout       } from "../features/hangout/Hangout";
import { Personal      } from "../features/courses/Personal";
import { CourseDetail  } from "../features/courses/CourseDetail";
import { Features      } from "../features/home/Features";
import { Flashcards    } from "../features/study/Flashcards";
import { StudyPlanner  } from "../features/study/StudyPlanner";
import { ServerPage    } from "../features/hangout/ServerPage";

/* Wrapper helper */
const P = (C: React.ComponentType) =>
  React.createElement(ProtectedRoute, null, React.createElement(C));

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return React.createElement(AuthLoadingSplash);
  return React.createElement(Navigate, { to: user ? "/home" : "/landing", replace: true });
}

export const router = createBrowserRouter([
  /* ── Public ──────────────────────────────── */
  { path: "/landing", Component: Landing },
  { path: "/login",   Component: Auth    },
  { path: "/auth/callback", Component: AuthCallback },

  /* ── Root redirect ────────────────────────── */
  { path: "/", element: React.createElement(RootRedirect) },

  /* ── Protected layout ─────────────────────── */
  {
    path: "/home",
    element: P(Root),
    children: [
      { index: true,            Component: Home      },
      { path: "all-notes",      Component: AllNotes  },
      { path: "editor/:id",     Component: Editor    },
      { path: "search",         Component: Search    },
      { path: "settings",       Component: Settings  },
      { path: "calendar",       Component: CalendarScreen },
      { path: "upload-image",   Component: UploadImage    },
      { path: "voice-memo",     Component: VoiceMemo      },
      { path: "hangout",        Component: Hangout         },
      { path: "hangout/:server", Component: ServerPage      },
      { path: "hangout/:server/:channel", Component: ServerPage },
      { path: "personal",       Component: Personal        },
      { path: "personal/course/:courseId", Component: CourseDetail },
      { path: "features",       Component: Features        },
      { path: "flashcards",     Component: Flashcards      },
      { path: "study-planner",  Component: StudyPlanner    },
    ],
  },
]);
