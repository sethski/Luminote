/**
 * routes.ts — Application routing
 * Public:    /landing, /login
 * Protected: everything else — redirects to /landing if not authenticated
 */
/**
 * routes.ts — Application routing
 * Public:    /home, /login
 * Protected: everything else — redirects to /login if not authenticated
 */
import { createBrowserRouter, Navigate } from "react-router";
import React from "react";
import { ProtectedRoute } from "./ProtectedRoute";

// Public pages
import { Landing } from "./Landing";
import { Auth    } from "./Auth";

// Protected screens
import { Root          } from "./Root";
import { Home          } from "./Home";
import { AllNotes      } from "./AllNotes";
import { Editor        } from "./Editor";
import { Search        } from "./Search";
import { Settings      } from "./Settings";
import { CalendarScreen } from "./Calendar";
import { UploadImage   } from "./UploadImage";
import { VoiceMemo     } from "./VoiceMemo";
import { Hangout       } from "./Hangout";
import { Personal      } from "./Personal";
import { CourseDetail  } from "./CourseDetail";
import { Features      } from "./Features";
import { Flashcards    } from "./Flashcards";
import { StudyPlanner  } from "./StudyPlanner";
import { ServerPage    } from "./ServerPage";

/* Wrapper helper */
const P = (C: React.ComponentType) =>
  React.createElement(ProtectedRoute, null, React.createElement(C));

export const router = createBrowserRouter([
  /* ── Public ──────────────────────────────── */
  { path: "/landing", Component: Landing },
  { path: "/login",   Component: Auth    },

  /* ── Catch-all redirect ───────────────────── */
    /* ── Catch-all redirect ───────────────────── */
    { path: "/",        element: React.createElement(Navigate, { to: "/home", replace: true }) },

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
