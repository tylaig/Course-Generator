import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  type Course,
  type InsertCourse,
  type Module,
  type InsertModule,
  type PhaseData,
  type InsertPhaseData,
  type AISettings,
  type InsertAISettings,
  type Lesson,
  type InsertLesson,
  type Activity,
  type InsertActivity,
  type Question,
  type InsertQuestion,
  courses,
  modules,
  phaseData,
  aiSettings,
  lessons,
  activities,
  questions,
} from "@shared/schema";
import { type IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  // Course operations
  async getCourse(id: string): Promise<Course | undefined> {
    const result = await db.select().from(courses).where(eq(courses.id, parseInt(id)));
    return result[0];
  }

  async listCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const result = await db.insert(courses).values(course).returning();
    return result[0];
  }

  async updateCourse(id: string, course: Partial<Course>): Promise<Course | undefined> {
    const result = await db
      .update(courses)
      .set({ ...course, updatedAt: new Date() })
      .where(eq(courses.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteCourse(id: string): Promise<boolean> {
    const result = await db.delete(courses).where(eq(courses.id, parseInt(id)));
    return result.rowCount > 0;
  }

  // Module operations
  async getModule(id: string): Promise<Module | undefined> {
    const result = await db.select().from(modules).where(eq(modules.id, parseInt(id)));
    return result[0];
  }

  async createModule(module: InsertModule): Promise<Module> {
    const result = await db.insert(modules).values(module).returning();
    return result[0];
  }

  async updateModule(id: string, module: Partial<Module>): Promise<Module | undefined> {
    const result = await db
      .update(modules)
      .set({ ...module, updatedAt: new Date() })
      .where(eq(modules.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteModule(id: string): Promise<boolean> {
    const result = await db.delete(modules).where(eq(modules.id, parseInt(id)));
    return result.rowCount > 0;
  }

  async listModulesByCourse(courseId: string): Promise<Module[]> {
    return await db.select().from(modules).where(eq(modules.courseId, parseInt(courseId)));
  }

  // Phase data operations
  async getPhaseData(courseId: string, phaseNumber: number): Promise<PhaseData | undefined> {
    const result = await db
      .select()
      .from(phaseData)
      .where(and(eq(phaseData.courseId, parseInt(courseId)), eq(phaseData.phaseNumber, phaseNumber)));
    return result[0];
  }

  async createPhaseData(data: InsertPhaseData): Promise<PhaseData> {
    const result = await db.insert(phaseData).values(data).returning();
    return result[0];
  }

  async updatePhaseData(id: string, data: Partial<PhaseData>): Promise<PhaseData | undefined> {
    const result = await db
      .update(phaseData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(phaseData.id, parseInt(id)))
      .returning();
    return result[0];
  }

  // AI settings operations
  async getAISettings(courseId: string): Promise<AISettings | undefined> {
    const result = await db.select().from(aiSettings).where(eq(aiSettings.courseId, parseInt(courseId)));
    return result[0];
  }

  async createAISettings(settings: InsertAISettings): Promise<AISettings> {
    const result = await db.insert(aiSettings).values(settings).returning();
    return result[0];
  }

  async updateAISettings(id: string, settings: Partial<AISettings>): Promise<AISettings | undefined> {
    const result = await db
      .update(aiSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(aiSettings.id, parseInt(id)))
      .returning();
    return result[0];
  }

  // Lesson operations
  async getLesson(id: string): Promise<Lesson | undefined> {
    const result = await db.select().from(lessons).where(eq(lessons.id, parseInt(id)));
    return result[0];
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const result = await db.insert(lessons).values(lesson).returning();
    return result[0];
  }

  async updateLesson(id: string, lesson: Partial<Lesson>): Promise<Lesson | undefined> {
    const result = await db
      .update(lessons)
      .set({ ...lesson, updatedAt: new Date() })
      .where(eq(lessons.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteLesson(id: string): Promise<boolean> {
    const result = await db.delete(lessons).where(eq(lessons.id, parseInt(id)));
    return result.rowCount > 0;
  }

  async listLessonsByModule(moduleId: string): Promise<Lesson[]> {
    return await db.select().from(lessons).where(eq(lessons.moduleId, parseInt(moduleId)));
  }

  // Activity operations
  async getActivity(id: string): Promise<Activity | undefined> {
    const result = await db.select().from(activities).where(eq(activities.id, parseInt(id)));
    return result[0];
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(activity).returning();
    return result[0];
  }

  async updateActivity(id: string, activity: Partial<Activity>): Promise<Activity | undefined> {
    const result = await db
      .update(activities)
      .set({ ...activity, updatedAt: new Date() })
      .where(eq(activities.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteActivity(id: string): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, parseInt(id)));
    return result.rowCount > 0;
  }

  async listActivitiesByLesson(lessonId: string): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.lessonId, parseInt(lessonId)));
  }

  // Question operations
  async getQuestion(id: string): Promise<Question | undefined> {
    const result = await db.select().from(questions).where(eq(questions.id, parseInt(id)));
    return result[0];
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(question).returning();
    return result[0];
  }

  async updateQuestion(id: string, question: Partial<Question>): Promise<Question | undefined> {
    const result = await db
      .update(questions)
      .set({ ...question, updatedAt: new Date() })
      .where(eq(questions.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const result = await db.delete(questions).where(eq(questions.id, parseInt(id)));
    return result.rowCount > 0;
  }

  async listQuestionsByActivity(activityId: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.activityId, parseInt(activityId)));
  }
}