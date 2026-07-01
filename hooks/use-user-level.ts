"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { loadUserData } from "@/lib/user-data";

export function profileToLevel(board?: string, grade?: string, targetExam?: string): string {
  if (targetExam?.includes("JEE")) return "JEE";
  if (targetExam?.includes("NEET")) return "NEET";
  if (board?.startsWith("IB")) return "IB";
  if (board?.startsWith("IGCSE")) return "IGCSE";
  if (board === "CBSE") return grade === "Class 11" ? "CBSE Class 11" : "CBSE Class 12";
  if (board === "ICSE") return "IGCSE";
  if (grade === "Class 9" || grade === "Class 10") return "GCSE";
  if (grade?.includes("College")) return "University";
  return "A-Level";
}

export function useUserLevel(): string {
  const { user } = useAuth();
  const [level, setLevel] = useState("A-Level");

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      if (ud) setLevel(profileToLevel(ud.board, ud.grade, ud.targetExam));
    });
  }, [user]);

  return level;
}
