import { 
  type Course,
  type InsertCourse,
  type Module,
  type InsertModule,
  type PhaseData,
  type InsertPhaseData,
  type AISettings,
  type InsertAISettings,
} from "@shared/schema";

// Storage interface for course-related operations
export interface IStorage {
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  listCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  
  // Module operations
  getModule(id: string): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, module: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: string): Promise<boolean>;
  listModulesByCourse(courseId: string): Promise<Module[]>;
  
  // Phase data operations
  getPhaseData(courseId: string, phaseNumber: number): Promise<PhaseData | undefined>;
  createPhaseData(phaseData: InsertPhaseData): Promise<PhaseData>;
  updatePhaseData(id: string, phaseData: Partial<PhaseData>): Promise<PhaseData | undefined>;
  
  // AI settings operations
  getAISettings(courseId: string): Promise<AISettings | undefined>;
  createAISettings(settings: InsertAISettings): Promise<AISettings>;
  updateAISettings(id: string, settings: Partial<AISettings>): Promise<AISettings | undefined>;
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private courses: Map<string, Course>;
  private modules: Map<string, Module>;
  private phaseData: Map<string, PhaseData>; // Key: `${courseId}-${phaseNumber}`
  private aiSettings: Map<string, AISettings>;

  constructor() {
    this.courses = new Map();
    this.modules = new Map();
    this.phaseData = new Map();
    this.aiSettings = new Map();
  }

  // Course methods
  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async listCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const id = `course-${Date.now()}`;
    const now = new Date();
    const newCourse: Course = {
      ...course,
      id: parseInt(id.split('-')[1]),
      currentPhase: course.currentPhase || 1,
      createdAt: now,
      updatedAt: now
    };
    this.courses.set(id, newCourse);
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

  // Module methods
  async getModule(id: string): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async createModule(module: InsertModule): Promise<Module> {
    const id = `module-${Date.now()}`;
    const now = new Date();
    const newModule: Module = {
      ...module,
      id: parseInt(id.split('-')[1]),
      createdAt: now,
      updatedAt: now
    };
    this.modules.set(id, newModule);
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

  async listModulesByCourse(courseId: string): Promise<Module[]> {
    return Array.from(this.modules.values())
      .filter(module => module.courseId.toString() === courseId)
      .sort((a, b) => a.order - b.order);
  }

  // Phase data methods
  async getPhaseData(courseId: string, phaseNumber: number): Promise<PhaseData | undefined> {
    const key = `${courseId}-${phaseNumber}`;
    return this.phaseData.get(key);
  }

  async createPhaseData(phaseData: InsertPhaseData): Promise<PhaseData> {
    const id = `phasedata-${Date.now()}`;
    const key = `${phaseData.courseId}-${phaseData.phaseNumber}`;
    const now = new Date();
    const newPhaseData: PhaseData = {
      ...phaseData,
      id: parseInt(id.split('-')[1]),
      createdAt: now,
      updatedAt: now
    };
    this.phaseData.set(key, newPhaseData);
    return newPhaseData;
  }

  async updatePhaseData(id: string, phaseDataUpdate: Partial<PhaseData>): Promise<PhaseData | undefined> {
    const [courseId, phaseNumber] = id.split('-');
    const key = `${courseId}-${phaseNumber}`;
    const phaseData = this.phaseData.get(key);
    if (!phaseData) return undefined;

    const updatedPhaseData: PhaseData = {
      ...phaseData,
      ...phaseDataUpdate,
      updatedAt: new Date()
    };
    this.phaseData.set(key, updatedPhaseData);
    return updatedPhaseData;
  }

  // AI settings methods
  async getAISettings(courseId: string): Promise<AISettings | undefined> {
    return this.aiSettings.get(courseId);
  }

  async createAISettings(settings: InsertAISettings): Promise<AISettings> {
    const id = `aisettings-${Date.now()}`;
    const now = new Date();
    const newSettings: AISettings = {
      ...settings,
      id: parseInt(id.split('-')[1]),
      createdAt: now,
      updatedAt: now
    };
    this.aiSettings.set(settings.courseId.toString(), newSettings);
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
}

// Create and export a storage instance
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { courses, modules, phaseData, aiSettings } from "@shared/schema";

export class DatabaseStorage implements IStorage {
  async getCourse(id: string): Promise<Course | undefined> {
    try {
      // Handle both string and numeric IDs
      let courseId: number;
      
      if (id.startsWith('course_')) {
        // If it's a string ID like 'course_1747960517465', extract the numeric part
        const numericPart = id.replace('course_', '');
        courseId = parseInt(numericPart);
      } else {
        courseId = parseInt(id);
      }
      
      if (isNaN(courseId)) {
        console.error("Invalid course ID format:", id);
        return undefined;
      }
      
      const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
      return course || undefined;
    } catch (error) {
      console.error("Error fetching course:", error);
      return undefined;
    }
  }

  async listCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async updateCourse(id: string, courseUpdate: Partial<Course>): Promise<Course | undefined> {
    const [updatedCourse] = await db
      .update(courses)
      .set(courseUpdate)
      .where(eq(courses.id, parseInt(id)))
      .returning();
    return updatedCourse || undefined;
  }

  async deleteCourse(id: string): Promise<boolean> {
    try {
      const numericId = parseInt(id);
      console.log("Tentando deletar curso com ID:", numericId);
      
      // Primeiro deletar módulos relacionados
      await db.delete(modules).where(eq(modules.courseId, numericId));
      console.log("Módulos relacionados deletados");
      
      // Deletar dados de fase relacionados
      await db.delete(phaseData).where(eq(phaseData.courseId, numericId));
      console.log("Dados de fase relacionados deletados");
      
      // Deletar configurações AI relacionadas
      await db.delete(aiSettings).where(eq(aiSettings.courseId, numericId));
      console.log("Configurações AI relacionadas deletadas");
      
      // Finalmente deletar o curso
      const result = await db.delete(courses).where(eq(courses.id, numericId));
      console.log("Resultado da exclusão do curso:", result);
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Erro ao deletar curso:", error);
      return false;
    }
  }

  async getModule(id: string): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, parseInt(id)));
    return module || undefined;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db
      .insert(modules)
      .values(module)
      .returning();
    return newModule;
  }

  async updateModule(id: string, moduleUpdate: Partial<Module>): Promise<Module | undefined> {
    const [updatedModule] = await db
      .update(modules)
      .set(moduleUpdate)
      .where(eq(modules.id, parseInt(id)))
      .returning();
    return updatedModule || undefined;
  }

  async deleteModule(id: string): Promise<boolean> {
    const result = await db.delete(modules).where(eq(modules.id, parseInt(id)));
    return (result.rowCount || 0) > 0;
  }

  async listModulesByCourse(courseId: string): Promise<Module[]> {
    return await db.select().from(modules).where(eq(modules.courseId, parseInt(courseId)));
  }

  async getPhaseData(courseId: string, phaseNumber: number): Promise<PhaseData | undefined> {
    const [data] = await db.select().from(phaseData)
      .where(
        and(
          eq(phaseData.courseId, parseInt(courseId)),
          eq(phaseData.phaseNumber, phaseNumber)
        )
      );
    return data || undefined;
  }

  async createPhaseData(data: InsertPhaseData): Promise<PhaseData> {
    const [newPhaseData] = await db
      .insert(phaseData)
      .values(data)
      .returning();
    return newPhaseData;
  }

  async updatePhaseData(id: string, phaseDataUpdate: Partial<PhaseData>): Promise<PhaseData | undefined> {
    const [updatedPhaseData] = await db
      .update(phaseData)
      .set(phaseDataUpdate)
      .where(eq(phaseData.id, parseInt(id)))
      .returning();
    return updatedPhaseData || undefined;
  }

  async getAISettings(courseId: string): Promise<AISettings | undefined> {
    const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.courseId, parseInt(courseId)));
    return settings || undefined;
  }

  async createAISettings(settings: InsertAISettings): Promise<AISettings> {
    const [newSettings] = await db
      .insert(aiSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateAISettings(id: string, settingsUpdate: Partial<AISettings>): Promise<AISettings | undefined> {
    const [updatedSettings] = await db
      .update(aiSettings)
      .set(settingsUpdate)
      .where(eq(aiSettings.id, parseInt(id)))
      .returning();
    return updatedSettings || undefined;
  }
}

export const storage = new DatabaseStorage();
