import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Course, Phase, CourseModule, AIConfig, CourseProgress, ContentType, GenerationStatus } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { CourseStorage } from "@/lib/storage";

interface CourseContextType {
  course: Course | null;
  setCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  setBasicInfo: (data: any) => void;
  updatePhaseData: (phase: Phase, data: any) => void;
  updateModules: (modules: CourseModule[]) => void;
  updateAIConfig: (config: Partial<AIConfig>) => void;
  updateModuleStatus: (moduleId: string, status: CourseModule["status"], imageUrl?: string) => void;
  updateModuleContent: (moduleId: string, content: any) => void;
  moveToNextPhase: () => void;
  updateProgress: (phaseNumber: Phase, progress: number) => void;
  calculateOverallProgress: () => number;
  exportCourseData: (format: 'json' | 'csv') => Promise<void>;
  generationStatus: GenerationStatus;
  setGenerationStatus: (status: GenerationStatus) => void;
  createNewCourse: () => Promise<Course>;
  loadCourse: (courseId: string) => Promise<Course>;
  clearCurrentCourse: () => void;
  saveCourseToLocalStorage: () => void;
  loadLessonsFromDatabase: (courseId: string) => Promise<void>;
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
    const initializeCourse = async () => {
      try {
        // Primeiro buscar cursos no banco de dados
        const response = await apiRequest("GET", "/api/courses");
        const courses = await response.json();
        
        if (courses && courses.length > 0) {
          // Usar o curso mais recente do banco
          const latestCourse = courses[courses.length - 1];
          console.log("Usando curso do banco:", latestCourse);
          
          // Verificar se há dados salvos no localStorage
          const savedCourse = CourseStorage.getCurrentCourse();
          if (savedCourse) {
            // Mesclar dados salvos com o curso do banco
            const mergedCourse = {
              ...savedCourse,
              id: latestCourse.id.toString(), // Usar ID do banco
              title: latestCourse.title,
              theme: latestCourse.theme,
              currentPhase: latestCourse.currentPhase || savedCourse.currentPhase
            };
            setCourse(mergedCourse);
          } else {
            // Criar curso baseado nos dados do banco
            const newCourse: Course = {
              id: latestCourse.id.toString(),
              title: latestCourse.title,
              theme: latestCourse.theme,
              estimatedHours: latestCourse.estimatedHours,
              format: latestCourse.format,
              platform: latestCourse.platform,
              deliveryFormat: latestCourse.deliveryFormat,
              currentPhase: latestCourse.currentPhase,
              progress: {
                phase1: 100,
                phase2: 100,
                phase3: 100,
                phase4: 100,
                phase5: 0,
                overall: 80,
                lastUpdated: new Date().toISOString()
              },
              aiConfig: {
                model: "gpt-4o",
                optimization: "balanced",
                languageStyle: "professional",
                difficultyLevel: "intermediate",
                contentDensity: 0.7,
                teachingApproach: "practical",
                contentTypes: ["text", "video", "quiz", "exercise", "case"],
                language: "pt-BR"
              },
              modules: [],
              phaseData: {}
            };
            setCourse(newCourse);
          }
        } else {
          // Fallback para localStorage se não houver cursos no banco
          const savedCourse = CourseStorage.getCurrentCourse();
          if (savedCourse) {
            setCourse(savedCourse);
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar curso:", error);
        // Fallback para localStorage
        const savedCourse = CourseStorage.getCurrentCourse();
        if (savedCourse) {
          setCourse(savedCourse);
        }
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeCourse();
  }, []);

  // Salvar automaticamente no banco de dados sempre que o curso mudar
  useEffect(() => {
    if (course && isInitialized) {
      // Salvar no banco de dados
      saveCourseToDatabase(course);
      
      // Manter localStorage para compatibilidade
      CourseStorage.saveCourse(course);
    }
  }, [course, isInitialized]);

  const saveCourseToDatabase = async (courseData: Course) => {
    try {
      // Só tentar salvar se o ID for numérico (já existe no banco)
      const numericId = parseInt(courseData.id);
      if (!isNaN(numericId)) {
        // Salvar curso
        await apiRequest("PUT", `/api/courses/${numericId}`, {
          title: courseData.title,
          theme: courseData.theme,
          estimatedHours: courseData.estimatedHours,
          format: courseData.format,
          platform: courseData.platform,
          deliveryFormat: courseData.deliveryFormat,
          currentPhase: courseData.currentPhase
        });

        // Salvar módulos
        for (const module of courseData.modules) {
          const moduleNumericId = parseInt(module.id);
          if (!isNaN(moduleNumericId)) {
            await apiRequest("PUT", `/api/modules/${moduleNumericId}`, {
              title: module.title,
              description: module.description,
              order: module.order,
              estimatedHours: module.estimatedHours,
              status: module.status,
              content: module.content,
              courseId: numericId
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao salvar no banco:", error);
    }
  };

  const createNewCourse = async (): Promise<Course> => {
    console.log("Criando novo curso no PostgreSQL...");
    
    try {
      // Criar curso diretamente no PostgreSQL primeiro
      const response = await apiRequest("POST", "/api/courses", {
        title: "Novo Curso Educacional",
        theme: "Educação e Aprendizagem",
        estimatedHours: 20,
        format: "Online",
        platform: "Web",
        deliveryFormat: "PDF",
        currentPhase: 1
      });
      
      const courseData = await response.json();
      console.log("Curso criado no banco:", courseData);
      
      // Criar o objeto do curso completo baseado na resposta do banco
      const newCourse: Course = {
        id: courseData.id.toString(), // Usar o ID real do banco
        title: courseData.title,
        theme: courseData.theme,
        estimatedHours: courseData.estimatedHours,
        format: courseData.format,
        platform: courseData.platform,
        deliveryFormat: courseData.deliveryFormat,
        currentPhase: courseData.currentPhase,
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
          model: "gpt-4o",
          optimization: "balanced",
          languageStyle: "professional",
          difficultyLevel: "intermediate",
          contentDensity: 0.7,
          teachingApproach: "practical",
          contentTypes: ["text", "video", "quiz", "exercise", "case"],
          language: "pt-BR"
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
      
      // Salvar também no localStorage para compatibilidade
      CourseStorage.saveCourse(newCourse);
      localStorage.setItem('currentCourseId', newCourse.id);
      
      console.log("Novo curso criado com sucesso:", newCourse);
      return newCourse;
      
    } catch (error) {
      console.error("Erro ao criar curso no banco:", error);
      throw new Error("Falha ao criar curso no banco de dados");
    }
  };

  const loadCourse = async (courseId: string) => {
    try {
      const numericId = parseInt(courseId);
      
      if (!isNaN(numericId)) {
        // Tentar carregar do banco primeiro
        const courseResponse = await apiRequest("GET", `/api/courses/${numericId}`);
        const courseData = await courseResponse.json();
        
        // Carregar módulos
        const modulesResponse = await apiRequest("GET", `/api/courses/${numericId}/modules`);
        const modules = await modulesResponse.json();
        
        const fullCourse = {
          ...courseData,
          id: courseData.id.toString(), // Garantir que o ID seja string
          modules: modules.map((m: any) => ({
            ...m,
            id: m.id.toString(), // Garantir que os IDs dos módulos sejam strings
            courseId: m.courseId.toString()
          })),
          // Adicionar dados padrão se não existirem
          progress: courseData.progress || {
            phase1: 0,
            phase2: 0,
            phase3: 0,
            phase4: 0,
            phase5: 0,
            overall: 0,
            lastUpdated: new Date().toISOString(),
          },
          phaseData: courseData.phaseData || {
            phase1: {},
            phase2: {},
          },
          aiConfig: courseData.aiConfig || {
            model: "gpt-4o",
            optimization: "balanced",
            languageStyle: "professional",
            difficultyLevel: "intermediate",
            contentDensity: 0.7,
            teachingApproach: "practical",
            contentTypes: ["text", "video", "quiz", "exercise", "case"] as ContentType[],
            language: "pt-BR",
          }
        };
        
        setCourse(fullCourse);
        return fullCourse;
      } else {
        // Fallback para localStorage se o ID não for numérico
        const loadedCourse = CourseStorage.getCourse(courseId);
        if (loadedCourse) {
          setCourse(loadedCourse);
          return loadedCourse;
        }
        throw new Error("Curso não encontrado");
      }
    } catch (error) {
      console.error("Erro ao carregar curso do banco:", error);
      // Fallback para localStorage
      const loadedCourse = CourseStorage.getCourse(courseId);
      if (loadedCourse) {
        setCourse(loadedCourse);
        return loadedCourse;
      }
      throw error;
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
      
      // Save to database instead of localStorage
      if (prev.id && typeof prev.id === 'number') {
        modules.forEach(async (module) => {
          try {
            await fetch(`/api/modules/${module.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: module.content,
                status: module.status
              })
            });
          } catch (error) {
            console.error('Error updating module in database:', error);
          }
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

  const updateModuleStatus = (moduleId: string, status: CourseModule["status"], imageUrl?: string) => {
    setCourse((prev) => {
      if (!prev) return null;
      const updatedModules = prev.modules.map(mod => {
        if (mod.id === moduleId) {
          // Se houver URL de imagem, inclua-a no módulo atualizado
          const updatedModule = imageUrl 
            ? { ...mod, status, imageUrl } 
            : { ...mod, status };
            
          // Save to database instead of localStorage
          if (typeof prev.id === 'number') {
            fetch(`/api/modules/${moduleId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: updatedModule.status
              })
            }).catch(error => {
              console.error('Error updating module status in database:', error);
            });
          }
          
          return updatedModule;
        }
        return mod;
      });
      return { ...prev, modules: updatedModules };
    });
  };

  const updateModuleContent = async (moduleId: string, content: any) => {
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
          
          // Save to database instead of localStorage
          if (typeof prev.id === 'number') {
            fetch(`/api/modules/${moduleId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: updatedModule.content
              })
            }).catch(error => {
              console.error('Error updating module content in database:', error);
            });
          }
          
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
      
      // Verificar se o progresso já está atualizado para evitar ciclos
      if (prev.progress && prev.progress[`phase${phaseNumber}` as keyof CourseProgress] === progress) {
        return prev; // Não atualizar se o progresso for o mesmo
      }
      
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
      if (format === 'csv') {
        // Implementar exportação CSV diretamente no frontend
        let csv = "Data Type,ID,Title,Description,Content\n";
        
        // Informações básicas do curso
        csv += `Course,${course.id || ""},${course.title || ""},"${course.theme || ""} (${course.format || ""})","${JSON.stringify({
          estimatedHours: course.estimatedHours,
          platform: course.platform,
          deliveryFormat: course.deliveryFormat,
          currentPhase: course.currentPhase,
          progress: course.progress || {},
          aiConfig: course.aiConfig || {}
        }).replace(/"/g, '""')}"\n`;
        
        // Dados das fases (se existirem)
        if (course.phaseData) {
          Object.entries(course.phaseData).forEach(([phase, phaseData]) => {
            if (phaseData) {
              csv += `PhaseData,${phase},"Phase ${phase.replace('phase', '')} Data","","${JSON.stringify(phaseData).replace(/"/g, '""')}"\n`;
            }
          });
        }
        
        // Módulos
        if (course.modules && Array.isArray(course.modules)) {
          course.modules.forEach((module) => {
            // Informações básicas do módulo
            csv += `Module,${module.id || ""},${module.title || ""},"${module.description || ""}","${JSON.stringify({
              order: module.order,
              estimatedHours: module.estimatedHours,
              status: module.status,
              imageUrl: module.imageUrl || ""
            }).replace(/"/g, '""')}"\n`;
            
            // Conteúdo do módulo (se existir)
            if (module.content) {
              // Conteúdo textual
              if (module.content.text) {
                const textContent = module.content.text.replace(/"/g, '""').substring(0, 1000) + (module.content.text.length > 1000 ? "..." : "");
                csv += `Content,${module.id}_text,"Text Content for ${module.title}","","${textContent}"\n`;
              }
              
              // Script de vídeo
              if (module.content.videoScript) {
                const videoScript = module.content.videoScript.replace(/"/g, '""').substring(0, 1000) + (module.content.videoScript.length > 1000 ? "..." : "");
                csv += `Content,${module.id}_video,"Video Script for ${module.title}","","${videoScript}"\n`;
              }
              
              // Atividades
              if (module.content.activities && module.content.activities.length > 0) {
                module.content.activities.forEach((activity, activityIndex) => {
                  csv += `Activity,${module.id}_activity_${activityIndex},${activity.title || ""},"${activity.description || ""}","${JSON.stringify(activity).replace(/"/g, '""')}"\n`;
                  
                  // Questões
                  if (activity.questions && activity.questions.length > 0) {
                    activity.questions.forEach((question, questionIndex) => {
                      csv += `Question,${module.id}_q_${activityIndex}_${questionIndex},${question.question?.replace(/"/g, '""') || ""},"${question.explanation?.replace(/"/g, '""') || ""}","${JSON.stringify(question.options || []).replace(/"/g, '""')}"\n`;
                    });
                  }
                });
              }
            }
          });
        }
        
        // Criar e baixar o arquivo CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `curso_${course.id}_completo.csv`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Exportação Concluída",
          description: "Os dados do curso foram exportados como CSV.",
          variant: "success",
        });
      } else {
        // Exportar como JSON
        const dataStr = JSON.stringify(course, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `curso_${course.id}_completo.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Exportação Concluída",
          description: "Os dados do curso foram exportados como JSON.",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Erro ao exportar dados do curso:", error);
      toast({
        title: "Falha na Exportação",
        description: "Não foi possível exportar os dados do curso. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <CourseContext.Provider
      value={{
        course,
        setCourse,
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
        saveCourseToLocalStorage,
        loadLessonsFromDatabase: async (courseId: string) => {
          try {
            console.log("🔍 Carregando aulas do PostgreSQL...");
            const response = await fetch(`/api/lessons/all`);
            if (response.ok) {
              const lessons = await response.json();
              console.log("✅ Aulas encontradas:", lessons.length);
              
              if (course && lessons.length > 0) {
                const updatedCourse = { ...course };
                
                // Organizar aulas por módulo
                lessons.forEach((lesson: any) => {
                  const moduleIndex = updatedCourse.modules.findIndex(m => 
                    m.id === `module-${lesson.module_id}` || 
                    m.id === lesson.module_id.toString() ||
                    m.order === lesson.module_id
                  );
                  
                  if (moduleIndex !== -1) {
                    if (!updatedCourse.modules[moduleIndex].content) {
                      updatedCourse.modules[moduleIndex].content = { lessons: [] };
                    }
                    if (!updatedCourse.modules[moduleIndex].content.lessons) {
                      updatedCourse.modules[moduleIndex].content.lessons = [];
                    }
                    
                    // Adicionar aula se não existir
                    const existingLessonIndex = updatedCourse.modules[moduleIndex].content.lessons.findIndex(
                      (l: any) => l.title === lesson.title
                    );
                    
                    if (existingLessonIndex === -1) {
                      updatedCourse.modules[moduleIndex].content.lessons.push({
                        id: `lesson_${lesson.module_id}_${lesson.id}`,
                        title: lesson.title,
                        description: lesson.description || "Aula salva automaticamente",
                        content: lesson.content || "",
                        order: lesson.order || 1,
                        duration: "45min"
                      });
                    }
                  }
                });
                
                setCourse(updatedCourse);
                console.log("✅ Curso atualizado com aulas do PostgreSQL");
              }
            }
          } catch (error) {
            console.error("❌ Erro ao carregar aulas:", error);
          }
        }
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};