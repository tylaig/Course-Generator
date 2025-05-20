import { Course, CourseModule, Phase } from "@/types";

// Chaves para armazenamento local
const STORAGE_KEYS = {
  CURRENT_COURSE_ID: "current_course_id",
  COURSE_PREFIX: "course_",
  PHASE_DATA_PREFIX: "phase_data_",
  MODULE_PREFIX: "module_",
  SETTINGS: "app_settings"
};

// Funções auxiliares para trabalhar com localStorage
export function saveToStorage(key: string, data: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Erro ao salvar dados para ${key}:`, error);
    return false;
  }
}

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Erro ao recuperar dados de ${key}:`, error);
    return defaultValue;
  }
}

// API de armazenamento local para cursos
export const CourseStorage = {
  // Salvar curso completo
  saveCourse(course: Course): boolean {
    // Salvar o curso principal
    const success = saveToStorage(`${STORAGE_KEYS.COURSE_PREFIX}${course.id}`, course);
    
    // Definir como curso atual
    if (success) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_COURSE_ID, course.id);
    }
    
    return success;
  },
  
  // Recuperar curso pelo ID
  getCourse(courseId: string): Course | null {
    return getFromStorage<Course | null>(`${STORAGE_KEYS.COURSE_PREFIX}${courseId}`, null);
  },
  
  // Obter ID do curso atual
  getCurrentCourseId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_COURSE_ID);
  },
  
  // Carregar o curso atual
  getCurrentCourse(): Course | null {
    const currentId = this.getCurrentCourseId();
    if (!currentId) return null;
    return this.getCourse(currentId);
  },
  
  // Salvar dados específicos de uma fase
  savePhaseData(courseId: string, phase: Phase, data: any): boolean {
    return saveToStorage(`${STORAGE_KEYS.PHASE_DATA_PREFIX}${courseId}_${phase}`, data);
  },
  
  // Recuperar dados específicos de uma fase
  getPhaseData(courseId: string, phase: Phase): any {
    return getFromStorage<any>(`${STORAGE_KEYS.PHASE_DATA_PREFIX}${courseId}_${phase}`, {});
  },
  
  // Salvar um módulo específico
  saveModule(courseId: string, module: CourseModule): boolean {
    return saveToStorage(`${STORAGE_KEYS.MODULE_PREFIX}${courseId}_${module.id}`, module);
  },
  
  // Recuperar um módulo específico
  getModule(courseId: string, moduleId: string): CourseModule | null {
    return getFromStorage<CourseModule | null>(
      `${STORAGE_KEYS.MODULE_PREFIX}${courseId}_${moduleId}`, 
      null
    );
  },
  
  // Limpar todos os dados do curso
  clearCourseData(courseId: string): void {
    // Encontrar todas as chaves relacionadas a este curso
    const keys = Object.keys(localStorage).filter(key => 
      key.includes(`${courseId}`) || 
      (key.startsWith(STORAGE_KEYS.COURSE_PREFIX) && key.includes(courseId)) ||
      (key.startsWith(STORAGE_KEYS.PHASE_DATA_PREFIX) && key.includes(courseId)) ||
      (key.startsWith(STORAGE_KEYS.MODULE_PREFIX) && key.includes(courseId))
    );
    
    // Remover cada chave
    keys.forEach(key => localStorage.removeItem(key));
    
    // Se este era o curso atual, limpar o atual também
    if (this.getCurrentCourseId() === courseId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_COURSE_ID);
    }
  },
  
  // Limpar todos os dados do aplicativo
  clearAllData(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (
        key.startsWith(STORAGE_KEYS.COURSE_PREFIX) ||
        key.startsWith(STORAGE_KEYS.PHASE_DATA_PREFIX) ||
        key.startsWith(STORAGE_KEYS.MODULE_PREFIX) ||
        key === STORAGE_KEYS.CURRENT_COURSE_ID ||
        key === STORAGE_KEYS.SETTINGS
      ) {
        localStorage.removeItem(key);
      }
    });
  }
};