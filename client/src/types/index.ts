import { z } from "zod";
import { phase1Schema } from "@shared/schema";

export type Phase = 1 | 2 | 3 | 4 | 5;

export interface LessonContent {
  id?: string;
  title: string;
  objectives?: string[];
  content?: string;
  activities?: ActivityContent[];
  materials?: string[];
  duration?: string;
  difficulty?: string;
  detailedContent?: any;
  status?: "not_started" | "generating" | "generated";
}

export interface ModuleContent {
  text?: string;
  videoScript?: string;
  activities?: ActivityContent[];
  lessons?: LessonContent[];
  visualRecommendations?: string;
  recommendedFormats?: string[];
  suggestedTone?: string;
  adaptationNotes?: string;
  glossary?: {term: string, definition: string}[];
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
  objective?: string;
  topics?: string;
  contents?: string;
  activities?: string;
  contentTypes?: string[];
  cognitiveSkills?: string;
  behavioralSkills?: string;
  technicalSkills?: string;
  evaluationType?: string;
  bloomLevel?: string;
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
  language: string;
};

export type Phase1FormData = z.infer<typeof phase1Schema>;

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
  createdAt?: Date;
  updatedAt?: Date;
};

export type GenerationStatus = "idle" | "generating" | "success" | "error";
