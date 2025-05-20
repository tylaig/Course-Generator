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
export const storage = new MemStorage();
