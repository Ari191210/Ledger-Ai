"use client";
// ═══════════════════════════════════════════════════════════════════════════
// useStudent — the single React entry point to the Student object.
//
// SSR-safe by construction: the server and the first client render both see
// `emptyStudent()`, and local data is adopted in an effect after mount. This
// avoids the hydration mismatch that localStorage-backed state normally causes.
// `hydrated` lets a module distinguish "no data yet" from "genuinely empty",
// which matters because Vision §34 forbids showing an empty state that is
// actually just an unread store.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import type { Student } from "./types";
import { emptyStudent } from "./types";
import { readStudent, subscribe, writeStudent } from "./store";

export function useStudent() {
  const [student, setStudent] = useState<Student>(() => emptyStudent());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStudent(readStudent());
    setHydrated(true);
    return subscribe(setStudent);
  }, []);

  const update = useCallback((updater: (s: Student) => Student) => {
    writeStudent(updater);
  }, []);

  return { student, update, hydrated };
}

/** Read-only variant for display-only surfaces. */
export function useStudentValue(): { student: Student; hydrated: boolean } {
  const { student, hydrated } = useStudent();
  return { student, hydrated };
}
