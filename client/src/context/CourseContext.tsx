import React, { createContext, useContext, useState, useEffect } from "react";
import { Course, Phase, CourseModule, AIConfig, CourseProgress, ContentType, GenerationStatus } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { CourseStorage } from "@/lib/storage";

interface CourseContextType {
  course: Course | null;
  setBasicInfo: (data: any) => void;
  updatePhaseData: (phase: Phase, data: any) => void;
  updateModules: (modules: CourseModule[]) => void;
  updateAIConfig: (config: Partial<AIConfig>) => void;
  updateModuleStatus: (moduleId: string, status: CourseModule["status"]) => void;
  updateModuleContent: (moduleId: string, content: any) => void;
  moveToNextPhase: () => void;
  updateProgress: (phaseNumber: Phase, progress: number) => void;
  calculateOverallProgress: () => number;
  exportCourseData: (format: 'json' | 'csv') => Promise<void>;
  generationStatus: GenerationStatus;
  setGenerationStatus: (status: GenerationStatus) => void;
  createNewCourse: () => void;
  loadCourse: (courseId: string) => void;
  clearCurrentCourse: () => void;
  saveCourseToLocalStorage: () => void;
}

const CourseContext = createContext<CourseContextType | null>(null);

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
};

export const CourseProvider = ({ children }: { children: React.ReactNode }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar curso salvo quando o componente é montado
  useEffect(() => {
    const savedCourse = CourseStorage.getCurrentCourse();
    if (savedCourse) {
      setCourse(savedCourse);
    }
    setIsInitialized(true);
  }, []);

  // Salvar automaticamente sempre que o curso mudar
  useEffect(() => {
    if (course && isInitialized) {
      // Persistir no armazenamento local
      CourseStorage.saveCourse(course);
      
      // Salvar os dados da fase atual no armazenamento específico
      if (course.phaseData && course.currentPhase) {
        const phaseKey = `phase${course.currentPhase}` as keyof typeof course.phaseData;
        const phaseData = course.phaseData[phaseKey];
        if (phaseData) {
          CourseStorage.savePhaseData(course.id, course.currentPhase, phaseData);
        }
      }
      
      // Salvar cada módulo separadamente para acesso mais rápido
      course.modules.forEach(module => {
        CourseStorage.saveModule(course.id, module);
      });
    }
  }, [course, isInitialized]);

  const createNewCourse = () => {
    console.log("Criando novo curso no CourseContext...");
    
    // Verificar se há um ID de curso existente
    const currentId = localStorage.getItem('currentCourseId');
    // Se existir, limpar os dados desse curso para evitar conflitos
    if (currentId) {
      CourseStorage.clearCourseData(currentId);
    }
    
    // Criar o objeto do curso com ID único
    const courseId = `course_${Date.now().toString()}`;
    
    // Criar o objeto do curso
    const newCourse: Course = {
      id: courseId,
      title: "Novo Curso Educacional",
      theme: "Educação e Aprendizagem",
      estimatedHours: 20,
      format: "Online",
      platform: "Web",
      deliveryFormat: "Self-paced",
      currentPhase: 1,
      progress: {
        phase1: 0,
        phase2: 0,
        phase3: 0,
        phase4: 0,
        phase5: 0,
        overall: 0,
        lastUpdated: new Date().toISOString()
      },
      aiConfig: {
        model: "gpt-4o", // o modelo mais recente da OpenAI
        optimization: "balanced",
        languageStyle: "professional",
        difficultyLevel: "intermediate",
        contentDensity: 0.7,
        teachingApproach: "practical",
        contentTypes: ["text", "video", "quiz", "exercise", "case"]
      },
      modules: [],
      phaseData: {
        phase1: {},
        phase2: {},
        phase3: {},
        phase4: {},
        phase5: {}
      }
    };
    
    // Atualizar o estado do React
    setCourse(newCourse);
    
    // Persistir no armazenamento local
    CourseStorage.saveCourse(newCourse);
    localStorage.setItem('currentCourseId', courseId);
    
    // Tentativa de sincronização com o servidor (não bloqueante)
    setTimeout(() => {
      try {
        apiRequest("POST", "/api/courses", {
          title: newCourse.title,
          theme: newCourse.theme,
          estimatedHours: newCourse.estimatedHours,
          format: newCourse.format,
          platform: newCourse.platform,
          deliveryFormat: newCourse.deliveryFormat,
          currentPhase: newCourse.currentPhase,
          aiConfig: newCourse.aiConfig,
          modules: newCourse.modules
        }).catch(error => {
          console.warn("Erro ao salvar curso no servidor, mas o armazenamento local está funcionando:", error);
        });
      } catch (error) {
        console.warn("Falha ao comunicar com o servidor:", error);
      }
    }, 0);
    
    console.log("Novo curso criado com sucesso:", newCourse);
    return newCourse;
  };

  const loadCourse = (courseId: string) => {
    const loadedCourse = CourseStorage.getCourse(courseId);
    if (loadedCourse) {
      setCourse(loadedCourse);
    }
  };

  const clearCurrentCourse = () => {
    if (course) {
      CourseStorage.clearCourseData(course.id);
    }
    setCourse(null);
  };

  const saveCourseToLocalStorage = () => {
    if (course) {
      CourseStorage.saveCourse(course);
    }
  };

  const setBasicInfo = (data: any) => {
    setCourse((prev) => {
      if (!prev) return null;
      return { ...prev, ...data };
    });
  };

  const updatePhaseData = (phase: Phase, data: any) => {
    setCourse((prev) => {
      if (!prev) return null;
      
      // Criar ou atualizar o objeto phaseData se não existir
      const currentPhaseData = prev.phaseData || {};
      
      const updatedPhaseData = {
        ...currentPhaseData,
        [`phase${phase}`]: {
          ...(currentPhaseData[`phase${phase}`] || {}),
          ...data
        }
      };
      
      const updatedCourse = {
        ...prev,
        phaseData: updatedPhaseData
      };
      
      // Salvar fase específica também
      CourseStorage.savePhaseData(prev.id, phase, updatedPhaseData[`phase${phase}`]);
      
      return updatedCourse;
    });
  };

  const updateModules = (modules: CourseModule[]) => {
    setCourse((prev) => {
      if (!prev) return null;
      
      const updatedCourse = { ...prev, modules };
      
      // Salvar cada módulo individualmente também
      if (prev.id) {
        modules.forEach(module => {
          CourseStorage.saveModule(prev.id, module);
        });
      }
      
      return updatedCourse;
    });
  };

  const updateAIConfig = (config: Partial<AIConfig>) => {
    setCourse((prev) => {
      if (!prev) return null;
      return { 
        ...prev, 
        aiConfig: { 
          ...prev.aiConfig, 
          ...config 
        } 
      };
    });
  };

  const updateModuleStatus = (moduleId: string, status: CourseModule["status"]) => {
    setCourse((prev) => {
      if (!prev) return null;
      const updatedModules = prev.modules.map(mod => {
        if (mod.id === moduleId) {
          const updatedModule = { ...mod, status };
          // Salvar o módulo atualizado individualmente
          CourseStorage.saveModule(prev.id, updatedModule);
          return updatedModule;
        }
        return mod;
      });
      return { ...prev, modules: updatedModules };
    });
  };

  const updateModuleContent = (moduleId: string, content: any) => {
    setCourse((prev) => {
      if (!prev) return null;
      const updatedModules = prev.modules.map(mod => {
        if (mod.id === moduleId) {
          const updatedModule = { 
            ...mod, 
            content: { 
              ...(mod.content || {}), 
              ...content 
            } 
          };
          // Salvar o módulo atualizado individualmente
          CourseStorage.saveModule(prev.id, updatedModule);
          return updatedModule;
        }
        return mod;
      });
      return { ...prev, modules: updatedModules };
    });
  };

  const moveToNextPhase = () => {
    setCourse((prev) => {
      if (!prev) return null;
      const nextPhase = prev.currentPhase < 5 ? (prev.currentPhase + 1) as Phase : prev.currentPhase;
      
      // Atualizar progresso automaticamente
      const updatedProgress = prev.progress || {
        phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, overall: 0,
        lastUpdated: new Date().toISOString()
      };
      
      // Marcar fase anterior como 100% concluída
      updatedProgress[`phase${prev.currentPhase}` as keyof CourseProgress] = 100;
      
      // Calcular progresso geral
      const phases = [1, 2, 3, 4, 5] as Phase[];
      const overallProgress = phases.reduce((sum, phase) => {
        return sum + (updatedProgress[`phase${phase}` as keyof CourseProgress] as number || 0);
      }, 0) / 5;
      
      const updatedCourse = { 
        ...prev, 
        currentPhase: nextPhase,
        progress: {
          ...updatedProgress,
          overall: Math.round(overallProgress),
          lastUpdated: new Date().toISOString()
        }
      };
      
      return updatedCourse;
    });
  };
  
  const updateProgress = (phaseNumber: Phase, progress: number) => {
    setCourse((prev) => {
      if (!prev) return null;
      
      const updatedProgress = prev.progress || {
        phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, overall: 0,
        lastUpdated: new Date().toISOString()
      };
      
      updatedProgress[`phase${phaseNumber}` as keyof CourseProgress] = 
        Math.min(100, Math.max(0, progress)); // Garantir que o progresso esteja entre 0-100
      
      // Calcular progresso geral
      const phases = [1, 2, 3, 4, 5] as Phase[];
      const overallProgress = phases.reduce((sum, phase) => {
        return sum + (updatedProgress[`phase${phase}` as keyof CourseProgress] as number || 0);
      }, 0) / 5;
      
      return {
        ...prev,
        progress: {
          ...updatedProgress,
          overall: Math.round(overallProgress),
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };
  
  const calculateOverallProgress = (): number => {
    if (!course || !course.progress) return 0;
    
    const phases = [1, 2, 3, 4, 5] as Phase[];
    const sum = phases.reduce((total, phase) => {
      const phaseProgress = course.progress![`phase${phase}` as keyof CourseProgress] as number;
      return total + (phaseProgress || 0);
    }, 0);
    
    return Math.round(sum / 5);
  };
  
  const exportCourseData = async (format: 'json' | 'csv') => {
    if (!course) return;
    
    try {
      // Primeiro, tentar exportar através da API
      const response = await apiRequest(
        "GET", 
        `/api/courses/${course.id}/export?format=${format}`,
        {}
      );
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course_${course.id}_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao exportar dados do curso:", error);
      
      // Se a exportação da API falhar, exportar diretamente do armazenamento local
      if (format === 'json') {
        const dataStr = JSON.stringify(course, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = `course_${course.id}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Formato CSV não disponível no modo offline. Use JSON para exportar.");
      }
    }
  };

  return (
    <CourseContext.Provider
      value={{
        course,
        setBasicInfo,
        updatePhaseData,
        updateModules,
        updateAIConfig,
        updateModuleStatus,
        updateModuleContent,
        moveToNextPhase,
        updateProgress,
        calculateOverallProgress,
        exportCourseData,
        generationStatus,
        setGenerationStatus,
        createNewCourse,
        loadCourse,
        clearCurrentCourse,
        saveCourseToLocalStorage
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};