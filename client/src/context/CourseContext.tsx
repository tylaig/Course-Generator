import React, { createContext, useContext, useState, useEffect } from "react";
import { Course, Phase, CourseModule, AIConfig, CourseProgress, ContentType, GenerationStatus } from "@/types";

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
}

const CourseContext = createContext<CourseContextType | null>(null);

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
};

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");

  // Load course from localStorage on initial render
  useEffect(() => {
    const savedCourse = localStorage.getItem("edGen_course");
    if (savedCourse) {
      setCourse(JSON.parse(savedCourse));
    }
  }, []);

  // Save course to localStorage whenever it changes
  useEffect(() => {
    if (course) {
      localStorage.setItem("edGen_course", JSON.stringify(course));
    }
  }, [course]);

  const createNewCourse = () => {
    const newCourse: Course = {
      id: Date.now().toString(),
      title: "",
      theme: "",
      estimatedHours: 0,
      format: "",
      platform: "",
      deliveryFormat: "",
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
        model: "gpt-4o",
        optimization: "Educational Content",
        languageStyle: "Neutral and International",
        difficultyLevel: "Intermediate",
        contentDensity: 3,
        teachingApproach: "Balanced",
        contentTypes: ["text", "video", "quiz"]
      },
      modules: [],
      phaseData: {}
    };
    setCourse(newCourse);
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
      return {
        ...prev,
        phaseData: {
          ...prev.phaseData,
          [`phase${phase}`]: data
        }
      };
    });
  };

  const updateModules = (modules: CourseModule[]) => {
    setCourse((prev) => {
      if (!prev) return null;
      return { ...prev, modules };
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
      const updatedModules = prev.modules.map(mod => 
        mod.id === moduleId ? { ...mod, status } : mod
      );
      return { ...prev, modules: updatedModules };
    });
  };

  const updateModuleContent = (moduleId: string, content: any) => {
    setCourse((prev) => {
      if (!prev) return null;
      const updatedModules = prev.modules.map(mod => 
        mod.id === moduleId ? { ...mod, content: { ...mod.content, ...content } } : mod
      );
      return { ...prev, modules: updatedModules };
    });
  };

  const moveToNextPhase = () => {
    setCourse((prev) => {
      if (!prev) return null;
      const nextPhase = prev.currentPhase < 5 ? (prev.currentPhase + 1) as Phase : prev.currentPhase;
      // Automatically update progress when moving to next phase
      const updatedProgress = prev.progress || {
        phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, overall: 0
      };
      
      // Mark previous phase as 100% complete
      updatedProgress[`phase${prev.currentPhase}` as keyof CourseProgress] = 100;
      
      // Calculate overall progress (average of all phases)
      const overallProgress = calculateOverallProgress();
      
      return { 
        ...prev, 
        currentPhase: nextPhase,
        progress: {
          ...updatedProgress,
          overall: overallProgress,
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };
  
  const updateProgress = (phaseNumber: Phase, progress: number) => {
    setCourse((prev) => {
      if (!prev) return null;
      
      const updatedProgress = prev.progress || {
        phase1: 0, phase2: 0, phase3: 0, phase4: 0, phase5: 0, overall: 0
      };
      
      updatedProgress[`phase${phaseNumber}` as keyof CourseProgress] = 
        Math.min(100, Math.max(0, progress)); // Ensure progress is between 0-100
      
      // Calculate overall progress
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
    const sum = phases.reduce((acc, phase) => {
      return acc + (course.progress?.[`phase${phase}` as keyof CourseProgress] as number || 0);
    }, 0);
    
    return Math.round(sum / 5);
  };
  
  const exportCourseData = async (format: 'json' | 'csv'): Promise<void> => {
    if (!course) return;
    
    try {
      // In a real implementation, this would call the API endpoint
      // const response = await fetch(`/api/export/course/${course.id}?format=${format}`);
      
      // For this implementation, we'll just create a downloadable blob
      const courseData = {
        course: {
          id: course.id,
          title: course.title,
          theme: course.theme,
          estimatedHours: course.estimatedHours,
          format: course.format,
          platform: course.platform,
          deliveryFormat: course.deliveryFormat,
          currentPhase: course.currentPhase
        },
        modules: course.modules,
        phaseData: course.phaseData,
        progress: course.progress,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(courseData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course_${course.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting course data:', error);
      throw error;
    }
  };

  return (
    <CourseContext.Provider value={{
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
      createNewCourse
    }}>
      {children}
    </CourseContext.Provider>
  );
};
