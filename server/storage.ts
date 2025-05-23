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
} from "@shared/schema";

export interface IStorage {
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  listCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  getCourseWithModules(id: string): Promise<Course | undefined>;

  // Module operations
  getModule(id: string): Promise<Module | undefined>;
  listModules(): Promise<Module[]>;
  getModulesByCourse(courseId: string): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, module: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: string): Promise<boolean>;

  // Phase data operations
  getPhaseData(courseId: string, phase: string): Promise<PhaseData | undefined>;
  getPhaseDataById(courseId: string, phase: string): Promise<PhaseData | undefined>;
  createPhaseData(phaseData: InsertPhaseData): Promise<PhaseData>;
  updatePhaseData(id: string, phaseData: Partial<PhaseData>): Promise<PhaseData | undefined>;

  // AI Settings operations
  getAISettings(courseId: string): Promise<AISettings | undefined>;
  createAISettings(settings: InsertAISettings): Promise<AISettings>;
  updateAISettings(id: string, settings: Partial<AISettings>): Promise<AISettings | undefined>;

  // Lesson operations
  getLesson(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, lesson: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<boolean>;
  listAllLessons(): Promise<Lesson[]>;

  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesByLesson(lessonId: string): Promise<Activity[]>;
  updateActivity(id: string, activity: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: string): Promise<boolean>;

  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByActivity(activityId: string): Promise<Question[]>;
  updateQuestion(id: string, question: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<boolean>;
}

// Memory storage for development
export class MemStorage implements IStorage {
  private courses = new Map<string, Course>();
  private modules = new Map<string, Module>();
  private phaseData = new Map<string, PhaseData>();
  private aiSettings = new Map<string, AISettings>();
  private lessons = new Map<string, Lesson>();
  private activities = new Map<string, Activity>();
  private questions = new Map<string, Question>();
  private nextId = 1;

  // Course operations
  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async listCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const id = this.nextId++;
    const newCourse: Course = {
      ...course,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.courses.set(id.toString(), newCourse);
    return newCourse;
  }

  async updateCourse(id: string, courseUpdate: Partial<Course>): Promise<Course | undefined> {
    const course = this.courses.get(id);
    if (!course) return undefined;

    const updatedCourse: Course = {
      ...course,
      ...courseUpdate,
      updatedAt: new Date()
    };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  async deleteCourse(id: string): Promise<boolean> {
    return this.courses.delete(id);
  }

  async getCourseWithModules(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  // Module operations
  async getModule(id: string): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async listModules(): Promise<Module[]> {
    return Array.from(this.modules.values());
  }

  async getModulesByCourse(courseId: string): Promise<Module[]> {
    return Array.from(this.modules.values()).filter(module => module.courseId.toString() === courseId);
  }

  async createModule(module: InsertModule): Promise<Module> {
    const id = this.nextId++;
    const newModule: Module = {
      ...module,
      id,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.modules.set(id.toString(), newModule);
    return newModule;
  }

  async updateModule(id: string, moduleUpdate: Partial<Module>): Promise<Module | undefined> {
    const module = this.modules.get(id);
    if (!module) return undefined;

    const updatedModule: Module = {
      ...module,
      ...moduleUpdate,
      updatedAt: new Date()
    };
    this.modules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteModule(id: string): Promise<boolean> {
    return this.modules.delete(id);
  }

  // Phase data operations
  async getPhaseData(courseId: string, phase: string): Promise<PhaseData | undefined> {
    return Array.from(this.phaseData.values()).find(
      data => data.courseId.toString() === courseId && data.phase === phase
    );
  }

  async getPhaseDataById(courseId: string, phase: string): Promise<PhaseData | undefined> {
    return this.getPhaseData(courseId, phase);
  }

  async createPhaseData(phaseData: InsertPhaseData): Promise<PhaseData> {
    const id = this.nextId++;
    const newPhaseData: PhaseData = {
      ...phaseData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.phaseData.set(id.toString(), newPhaseData);
    return newPhaseData;
  }

  async updatePhaseData(id: string, phaseDataUpdate: Partial<PhaseData>): Promise<PhaseData | undefined> {
    const data = this.phaseData.get(id);
    if (!data) return undefined;

    const updatedData: PhaseData = {
      ...data,
      ...phaseDataUpdate,
      updatedAt: new Date()
    };
    this.phaseData.set(id, updatedData);
    return updatedData;
  }

  // AI Settings operations
  async getAISettings(courseId: string): Promise<AISettings | undefined> {
    return Array.from(this.aiSettings.values()).find(
      settings => settings.courseId.toString() === courseId
    );
  }

  async createAISettings(settings: InsertAISettings): Promise<AISettings> {
    const id = this.nextId++;
    const newSettings: AISettings = {
      ...settings,
      id,
      model: "gpt-4o",
      optimization: "balanced",
      languageStyle: "professional",
      difficultyLevel: "intermediate",
      contentDensity: 0.7,
      teachingApproach: "practical",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.aiSettings.set(id.toString(), newSettings);
    return newSettings;
  }

  async updateAISettings(id: string, settingsUpdate: Partial<AISettings>): Promise<AISettings | undefined> {
    const settings = this.aiSettings.get(id);
    if (!settings) return undefined;

    const updatedSettings: AISettings = {
      ...settings,
      ...settingsUpdate,
      updatedAt: new Date()
    };
    this.aiSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // Lesson operations
  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const id = this.nextId++;
    const newLesson: Lesson = {
      ...lesson,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.lessons.set(id.toString(), newLesson);
    return newLesson;
  }

  async updateLesson(id: string, lessonUpdate: Partial<Lesson>): Promise<Lesson | undefined> {
    const lesson = this.lessons.get(id);
    if (!lesson) return undefined;

    const updatedLesson: Lesson = {
      ...lesson,
      ...lessonUpdate,
      updatedAt: new Date()
    };
    this.lessons.set(id, updatedLesson);
    return updatedLesson;
  }

  async deleteLesson(id: string): Promise<boolean> {
    return this.lessons.delete(id);
  }

  async listAllLessons(): Promise<Lesson[]> {
    return Array.from(this.lessons.values());
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.nextId++;
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.activities.set(id.toString(), newActivity);
    return newActivity;
  }

  async getActivitiesByLesson(lessonId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      activity => activity.lessonId.toString() === lessonId
    );
  }

  async updateActivity(id: string, activityUpdate: Partial<Activity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;

    const updatedActivity: Activity = {
      ...activity,
      ...activityUpdate,
      updatedAt: new Date()
    };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: string): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.nextId++;
    const newQuestion: Question = {
      ...question,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.questions.set(id.toString(), newQuestion);
    return newQuestion;
  }

  async getQuestionsByActivity(activityId: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(
      question => question.activityId.toString() === activityId
    );
  }

  async updateQuestion(id: string, questionUpdate: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;

    const updatedQuestion: Question = {
      ...question,
      ...questionUpdate,
      updatedAt: new Date()
    };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    return this.questions.delete(id);
  }
}

// Use PostgreSQL storage for all operations
import { PostgresStorage } from "./postgres-storage";
export const storage = new PostgresStorage();