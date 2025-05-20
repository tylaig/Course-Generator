import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
    
    // Verificar se há um curso em rascunho que pode ser continuado
    const currentId = localStorage.getItem('currentCourseId');
    const currentCourse = currentId ? CourseStorage.getCourse(currentId) : null;
    
    // Se já temos um curso em rascunho na fase 1, vamos permitir continuar onde parou
    if (currentCourse && currentCourse.currentPhase === 1 && 
        (!currentCourse.progress || currentCourse.progress.phase1 < 100)) {
      console.log("Curso em rascunho encontrado na fase 1. Continuando...", currentCourse);
      setCourse(currentCourse);
      return currentCourse;
    }
    
    // Se temos um ID atual mas não estamos continuando, limpar os dados deste curso
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
        phase1: {
          lastUpdated: new Date().toISOString()
        },
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
      
      // Verificar se os dados já existem para evitar sobrescrever informações importantes
      const existingPhaseData = currentPhaseData[`phase${phase}`] || {};
      
      const updatedPhaseData = {
        ...currentPhaseData,
        [`phase${phase}`]: {
          ...existingPhaseData,
          ...data,
          lastUpdated: new Date().toISOString() // Adicionar timestamp de atualização
        }
      };
      
      const updatedCourse = {
        ...prev,
        phaseData: updatedPhaseData
      };
      
      // Salvar fase específica imediatamente para garantir persistência
      CourseStorage.savePhaseData(prev.id, phase, updatedPhaseData[`phase${phase}`]);
      
      // Salvar curso completo também para garantir consistência
      CourseStorage.saveCourse(updatedCourse);
      
      console.log(`Dados da fase ${phase} atualizados e salvos:`, updatedPhaseData[`phase${phase}`]);
      
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
      
      // Determinar a próxima fase
      const nextPhase = prev.currentPhase < 5 ? (prev.currentPhase + 1) as Phase : prev.currentPhase;
      
      // Se já estamos na fase final, não fazer nada
      if (prev.currentPhase === 5) {
        console.log("Já estamos na fase final do curso");
        return prev;
      }
      
      // Atualizar progresso da fase atual para 100%
      const updatedProgress = prev.progress || {
        phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, overall: 0,
        lastUpdated: new Date().toISOString()
      };
      
      // Marcar fase atual como concluída
      const currentPhaseKey = `phase${prev.currentPhase}`;
      (updatedProgress as any)[currentPhaseKey] = 100;
      
      // Calcular o progresso geral
      const phases = [1, 2, 3, 4, 5] as Phase[];
      let totalProgress = 0;
      
      phases.forEach(phase => {
        const key = `phase${phase}`;
        totalProgress += ((updatedProgress as any)[key] || 0);
      });
      
      const overallProgress = totalProgress / phases.length;
      
      // Garantir que os dados da fase atual estão salvos
      if (prev.phaseData) {
        const phaseKey = `phase${prev.currentPhase}` as keyof typeof prev.phaseData;
        const phaseData = prev.phaseData[phaseKey];
        if (phaseData) {
          // Salvar no armazenamento específico de fase
          CourseStorage.savePhaseData(prev.id, prev.currentPhase, phaseData);
        }
      }
      
      // Criar o curso atualizado com a nova fase
      const updatedCourse: Course = {
        ...prev,
        currentPhase: nextPhase,
        progress: {
          ...updatedProgress,
          overall: Math.round(overallProgress),
          lastUpdated: new Date().toISOString()
        }
      };
      
      // Salvar imediatamente o curso atualizado
      CourseStorage.saveCourse(updatedCourse);
      
      console.log(`Avançando do curso para a fase ${nextPhase}. Todos os dados salvos.`);
      
      return updatedCourse;
    });
  };
  
  const updateProgress = (phaseNumber: Phase, progress: number) => {
    setCourse((prev) => {
      if (!prev) return null;
      
      // Criar progresso padrão se não existir
      const currentProgress = prev.progress || {
        phase1: 0, 
        phase2: 0, 
        phase3: 0, 
        phase4: 0, 
        phase5: 0, 
        overall: 0,
        lastUpdated: new Date().toISOString()
      };
      
      // Criar uma cópia do progresso
      const updatedProgress = { ...currentProgress };
      
      // Atualizar o progresso da fase específica
      const phaseKey = `phase${phaseNumber}`;
      (updatedProgress as any)[phaseKey] = Math.min(100, Math.max(0, progress));
      
      // Calcular o progresso geral
      const phases = [1, 2, 3, 4, 5] as Phase[];
      let totalProgress = 0;
      
      phases.forEach(phase => {
        const key = `phase${phase}`;
        totalProgress += ((updatedProgress as any)[key] || 0);
      });
      
      const overallProgress = totalProgress / phases.length;
      
      // Atualizar o timestamp e o progresso geral
      updatedProgress.lastUpdated = new Date().toISOString();
      updatedProgress.overall = Math.round(overallProgress);
      
      // Criar o curso atualizado
      const updatedCourse = {
        ...prev,
        progress: updatedProgress
      };
      
      // Salvar imediatamente no armazenamento local
      CourseStorage.saveCourse(updatedCourse);
      
      console.log(`Progresso da fase ${phaseNumber} atualizado para ${progress}%. Progresso geral: ${updatedProgress.overall}%`);
      
      return updatedCourse;
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