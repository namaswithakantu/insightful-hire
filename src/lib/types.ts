export type InterviewRole = "sde" | "data_analyst" | "ml_engineer";

export const ROLE_META: Record<InterviewRole, { label: string; short: string; tagline: string }> = {
  sde: { label: "Software Development Engineer", short: "SDE", tagline: "Algorithms, system design, code quality" },
  data_analyst: { label: "Data Analyst", short: "Data Analyst", tagline: "SQL, statistics, business insight" },
  ml_engineer: { label: "Machine Learning Engineer", short: "ML Engineer", tagline: "Models, math, production ML" },
};

export interface Question {
  question: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export type ViolationType =
  | "tab_switch" | "window_blur" | "multiple_faces"
  | "no_face" | "looking_away" | "suspicious";

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  tab_switch: "Tab switched",
  window_blur: "Window unfocused",
  multiple_faces: "Multiple faces detected",
  no_face: "No face detected",
  looking_away: "Looking away from screen",
  suspicious: "Suspicious behavior",
};
