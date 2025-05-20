import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Course table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  format: text("format").notNull(),
  platform: text("platform").notNull(),
  deliveryFormat: text("delivery_format").notNull(),
  currentPhase: integer("current_phase").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Module table
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  status: text("status").notNull().default("not_started"),
  content: jsonb("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Phase data table to store phase-specific content
export const phaseData = pgTable("phase_data", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  phaseNumber: integer("phase_number").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Generation settings for OpenAI
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  model: text("model").notNull().default("gpt-4o"),
  optimization: text("optimization").notNull().default("Educational Content"),
  languageStyle: text("language_style").notNull().default("Neutral and International"),
  difficultyLevel: text("difficulty_level").notNull().default("Intermediate"),
  contentDensity: integer("content_density").notNull().default(3),
  teachingApproach: text("teaching_approach").notNull().default("Balanced"),
  contentTypes: jsonb("content_types").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define insert schemas
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhaseDataSchema = createInsertSchema(phaseData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;

export type PhaseData = typeof phaseData.$inferSelect;
export type InsertPhaseData = z.infer<typeof insertPhaseDataSchema>;

export type AISettings = typeof aiSettings.$inferSelect;
export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;

// Phase-specific zod schemas for form validation
export const phase1Schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  theme: z.string().min(3, "Theme must be at least 3 characters"),
  estimatedHours: z.coerce.number().min(1, "Hours must be at least 1"),
  format: z.string().min(1, "Format is required"),
  platform: z.string().min(1, "Platform is required"),
  deliveryFormat: z.string().min(1, "Delivery format is required"),
  publicTarget: z.string().min(3, "Public target must be at least 3 characters"),
  educationalLevel: z.string().min(1, "Educational level is required"),
  familiarityLevel: z.string().min(1, "Familiarity level is required"),
  motivation: z.string().min(1, "Motivation is required"),
  cognitiveSkills: z.string().min(3, "Cognitive skills must be at least 3 characters"),
  behavioralSkills: z.string().min(3, "Behavioral skills must be at least 3 characters"),
  technicalSkills: z.string().min(3, "Technical skills must be at least 3 characters"),
});
