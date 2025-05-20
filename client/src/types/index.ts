import { z } from "zod";
import { phase1Schema } from "@shared/schema";

export type Phase = 1 | 2 | 3 | 4 | 5;

export interface ModuleContent {
  text?: string;
  videoScript?: string;
  activities?: ActivityContent[];
}

export interface ActivityContent {
  type: string;
  title: string;
  description: string;
  questions?: Question[];
  instructions?: string;
  criteria?: any;
}

export interface Question {
  question: string;
  options?: string[];
  answer?: string | number;
  explanation?: string;
}

export type CourseModule = {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedHours: number;
  status: "not_started" | "in_progress" | "generated" | "approved";
  content?: ModuleContent;
  imageUrl?: string;
};

export type ContentType = "text" | "video" | "quiz" | "exercise" | "case";

export type AIConfig = {
  model: string;
  optimization: string;
  languageStyle: string;
  difficultyLevel: string;
  contentDensity: number;
  teachingApproach: string;
  contentTypes: ContentType[];
};

export type Phase1FormData = z.infer<typeof phase1Schema> & {
  briefingDocument?: string;
};

export type CourseProgress = {
  phase1: number;
  phase2: number;
  phase3: number;
  phase4: number;
  phase5: number;
  overall: number;
  lastUpdated?: string;
};

export type Course = {
  id: string;
  title: string;
  theme: string;
  estimatedHours: number;
  format: string;
  platform: string;
  deliveryFormat: string;
  currentPhase: Phase;
  aiConfig: AIConfig;
  modules: CourseModule[];
  progress?: CourseProgress;
  phaseData: {
    phase1?: any;
    phase2?: any;
    phase3?: any;
    phase4?: any;
    phase5?: any;
  };
};

export type GenerationStatus = "idle" | "generating" | "success" | "error";
