import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { CourseModule } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Phase3() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { 
    course, 
    moveToNextPhase,
    updateModuleContent,
    updateModuleStatus
  } = useCourse();
  
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerating, setCurrentGenerating] = useState("");
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  
  // Helper function to safely render content
  const safeRender = (content: any): string => {
    if (content === null || content === undefined) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'number' || typeof content === 'boolean') return String(content);
    return JSON.stringify(content, null, 2);
  };

  // Component to render structured lesson content
  const LessonContentRenderer = ({ content }: { content: any }) => {
    console.log('LessonContentRenderer received content:', content);
    
    // Extract actual content from nested success structure
    let actualContent = content;
    if (content?.success && content?.content) {
      actualContent = content.content;
      // Check for double nesting
      if (actualContent?.success && actualContent?.content) {
        actualContent = actualContent.content;
      }
    }
    
    // If content is a string, render as is
    if (typeof actualContent === 'string') {
      return <div className="text-sm whitespace-pre-wrap">{actualContent}</div>;
    }

    // If content is an object, render structured view
    if (typeof actualContent === 'object' && actualContent !== null) {
      return (
        <div className="space-y-4">
          {actualContent.title && (
            <div>
              <h5 className="font-semibold text-lg mb-2">{actualContent.title}</h5>
              {actualContent.duration && (
                <p className="text-sm text-gray-600 mb-3">Duration: {actualContent.duration}</p>
              )}
            </div>
          )}

          {actualContent.objectives && actualContent.objectives.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h6 className="font-medium text-blue-900 mb-2">Lesson Objectives:</h6>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                {actualContent.objectives.map((obj: string, idx: number) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ul>
            </div>
          )}

          {actualContent.audioScript && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <h6 className="font-medium text-purple-900 mb-2">Audio Script:</h6>
              <p className="text-sm text-purple-800 whitespace-pre-wrap">
                {actualContent.audioScript.length > 200 
                  ? actualContent.audioScript.substring(0, 200) + '...' 
                  : actualContent.audioScript}
              </p>
            </div>
          )}

          {actualContent.lessonStructure && (
            <div className="bg-green-50 p-3 rounded-lg">
              <h6 className="font-medium text-green-900 mb-2">Lesson Structure:</h6>
              <div className="space-y-2">
                {Object.entries(actualContent.lessonStructure).map(([key, section]: [string, any]) => (
                  <div key={key} className="bg-white p-2 rounded border-l-2 border-green-400">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      {section.duration && (
                        <span className="text-xs text-gray-500">{section.duration}</span>
                      )}
                    </div>
                    {section.content && (
                      <p className="text-xs text-gray-700 mb-1">{section.content}</p>
                    )}
                    {section.talking_points && (
                      <ul className="text-xs text-gray-600 ml-3">
                        {section.talking_points.map((point: string, idx: number) => (
                          <li key={idx} className="list-disc">{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {actualContent.practicalExercises && actualContent.practicalExercises.length > 0 && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <h6 className="font-medium text-orange-900 mb-2">Practical Exercises:</h6>
              <div className="space-y-2">
                {actualContent.practicalExercises.map((exercise: any, idx: number) => (
                  <div key={idx} className="bg-white p-2 rounded border-l-2 border-orange-400">
                    <h6 className="font-medium text-sm">{exercise.title || `Exercise ${idx + 1}`}</h6>
                    {exercise.description && (
                      <p className="text-xs text-gray-700 mt-1">{exercise.description}</p>
                    )}
                    {exercise.questions && exercise.questions.length > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        {exercise.questions.length} questions available
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {actualContent.assessmentQuestions && actualContent.assessmentQuestions.length > 0 && (
            <div className="bg-red-50 p-3 rounded-lg">
              <h6 className="font-medium text-red-900 mb-2">Assessment Questions:</h6>
              <div className="space-y-2">
                {actualContent.assessmentQuestions.map((question: any, idx: number) => (
                  <div key={idx} className="bg-white p-2 rounded border-l-2 border-red-400">
                    <p className="text-sm font-medium">{question.question}</p>
                    {question.options && (
                      <div className="mt-1 text-xs text-gray-600">
                        {question.options.map((option: string, optIdx: number) => (
                          <div key={optIdx} className={`ml-2 ${optIdx === question.correct_answer ? 'font-medium text-green-600' : ''}`}>
                            {String.fromCharCode(97 + optIdx)}) {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {actualContent.materials && actualContent.materials.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h6 className="font-medium text-gray-900 mb-2">Materials:</h6>
              <ul className="text-sm text-gray-700">
                {actualContent.materials.map((material: string, idx: number) => (
                  <li key={idx} className="list-disc list-inside">{material}</li>
                ))}
              </ul>
            </div>
          )}

          {actualContent.homework && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h6 className="font-medium text-yellow-900 mb-2">Homework:</h6>
              <p className="text-sm text-yellow-800">{actualContent.homework}</p>
            </div>
          )}
        </div>
      );
    }

    // Fallback for other types
    return <div className="text-sm">{JSON.stringify(actualContent, null, 2)}</div>;
  };

  // Simple persistence
  useEffect(() => {
    if (!course?.id) return;
    
    const savedState = localStorage.getItem(`phase3_${course.id}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setIsGeneratingAll(state.isGenerating || false);
        setGenerationProgress(state.progress || 0);
        setCurrentGenerating(state.current || "");
        setGenerationStatus(state.status || "idle");
        
        // If it was generating, continue
        if (state.isGenerating && state.status === "generating") {
          setTimeout(() => {
            handleGenerateAll();
          }, 2000);
        }
      } catch (error) {
        console.error('Error loading state:', error);
      }
    }
  }, [course?.id]);

  useEffect(() => {
    if (!course?.id) return;
    
    localStorage.setItem(`phase3_${course.id}`, JSON.stringify({
      isGenerating: isGeneratingAll,
      progress: generationProgress,
      current: currentGenerating,
      status: generationStatus
    }));
  }, [isGeneratingAll, generationProgress, currentGenerating, generationStatus, course?.id]);

  // Generate content for a single lesson
  const generateLessonContent = useMutation({
    mutationFn: async ({ moduleId, lessonId }: { moduleId: string, lessonId: string }) => {
      setGenerationStatus("generating");
      
      const moduleToGenerate = course?.modules.find(m => m.id === moduleId);
      if (!moduleToGenerate) throw new Error("Module not found");
      
      const lessonToGenerate = moduleToGenerate.content?.lessons?.find((l: any) => l.title === lessonId);
      if (!lessonToGenerate) throw new Error("Lesson not found");
      
      const response = await apiRequest(
        "POST", 
        "/api/lesson-content-generation", 
        {
          lesson: lessonToGenerate,
          module: moduleToGenerate,
          courseDetails: {
            title: course?.title,
            theme: course?.theme,
            estimatedHours: course?.estimatedHours,
            format: course?.format,
            platform: course?.platform,
            deliveryFormat: course?.deliveryFormat,
            phaseData: course?.phaseData?.phase1
          },
          aiConfig: course?.aiConfig
        }
      );
      
      const result = await response.json();
      const content = result.success ? result.content : result;
      return { moduleId, lessonId, content };
    },
    onSuccess: async (data) => {
      setGenerationStatus("success");
      
      // Update the course module with new content
      const moduleToUpdate = course?.modules.find(m => m.id === data.moduleId);
      if (moduleToUpdate && moduleToUpdate.content?.lessons) {
        const lessonIndex = moduleToUpdate.content.lessons.findIndex((l: any) => l.title === data.lessonId);
        if (lessonIndex !== -1) {
          const updatedLessons = [...moduleToUpdate.content.lessons];
          updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            detailedContent: data.content,
            status: "generated"
          };
          
          // Update both locally and in database
          await updateModuleContent(data.moduleId, { lessons: updatedLessons });
          
          // Also save to database immediately
          try {
            await apiRequest("PUT", `/api/modules/${data.moduleId}`, {
              content: { lessons: updatedLessons }
            });
          } catch (error) {
            console.error("Error saving lesson content to database:", error);
          }
        }
      }
      
      toast({
        title: "Content Generated!",
        description: `The content for lesson "${data.lessonId}" was generated successfully.`,
      });
    },
    onError: (error) => {
      setGenerationStatus("error");
      
      console.error("Lesson generation error:", error);
      toast({
        title: "Generation Error",
        description: "There was a problem generating the lesson content. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate content for all lessons
  const generateAllContent = useMutation({
    mutationFn: async () => {
      const lessonsToGenerate: any[] = [];
      
      course?.modules.forEach(module => {
        if (module.content?.lessons) {
          module.content.lessons.forEach((lesson: any) => {
            if (!lesson.detailedContent) {
              lessonsToGenerate.push({
                moduleId: module.id,
                lessonId: lesson.title,
                lessonName: lesson.title
              });
            }
          });
        }
      });

      if (lessonsToGenerate.length === 0) {
        throw new Error("No lessons to generate");
      }

      const results = [];
      const total = lessonsToGenerate.length;
      
      for (let i = 0; i < lessonsToGenerate.length; i++) {
        const lessonInfo = lessonsToGenerate[i];
        const progress = Math.round(((i + 1) / total) * 100);
        
        setGenerationProgress(progress);
        setCurrentGenerating(`Generating: ${lessonInfo.lessonName}`);
        
        try {
          const moduleToGenerate = course?.modules.find(m => m.id === lessonInfo.moduleId);
          if (!moduleToGenerate) continue;
          
          const lessonToGenerate = moduleToGenerate.content?.lessons?.find((l: any) => l.title === lessonInfo.lessonId);
          if (!lessonToGenerate) continue;
          
          const response = await apiRequest(
            "POST", 
            "/api/lesson-content-generation", 
            {
              lesson: lessonToGenerate,
              module: moduleToGenerate,
              courseDetails: {
                title: course?.title,
                theme: course?.theme,
                estimatedHours: course?.estimatedHours,
                format: course?.format,
                platform: course?.platform,
                deliveryFormat: course?.deliveryFormat,
                phaseData: course?.phaseData?.phase1
              },
              aiConfig: course?.aiConfig
            }
          );
          
          const result = await response.json();
          const content = result.success ? result.content : result;
          results.push({ moduleId: lessonInfo.moduleId, lessonId: lessonInfo.lessonId, content });
          
          // Update lesson content immediately
          const updatedModule = { ...moduleToGenerate };
          if (updatedModule.content?.lessons) {
            const lessonIndex = updatedModule.content.lessons.findIndex((l: any) => l.title === lessonInfo.lessonId);
            if (lessonIndex !== -1) {
              updatedModule.content.lessons[lessonIndex] = {
                ...updatedModule.content.lessons[lessonIndex],
                detailedContent: content,
                status: "generated"
              };
            }
          }
          
          // Update module with updated lessons locally
          await updateModuleContent(moduleToGenerate.id, updatedModule.content);
          
          // Save to database immediately
          try {
            await apiRequest("PUT", `/api/modules/${moduleToGenerate.id}`, {
              content: updatedModule.content
            });
          } catch (error) {
            console.error("Error saving to database:", error);
          }
          
          // Short pause between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error generating content for lesson ${lessonInfo.lessonName}:`, error);
          // Continue with next lesson
        }
      }
      
      return results;
    },
    onSuccess: (data) => {
      setIsGeneratingAll(false);
      setGenerationStatus("success");
      setGenerationProgress(100);
      setCurrentGenerating("");
      
      // Limpar estado persistido
      if (course?.id) {
        localStorage.removeItem(`phase3_${course.id}`);
      }
      
      // Update module statuses
      course?.modules.forEach(module => {
        const allLessonsGenerated = module.content?.lessons?.every((lesson: any) => lesson.detailedContent);
        if (allLessonsGenerated) {
          updateModuleStatus(module.id, "generated");
        }
      });
      
      toast({
        title: "Generation Complete!",
        description: `Content was successfully generated for ${data.length} lessons.`,
      });
    },
    onError: (error) => {
      setIsGeneratingAll(false);
      setGenerationStatus("error");
      setCurrentGenerating("");
      
      // Limpar estado persistido
      if (course?.id) {
        localStorage.removeItem(`phase3_${course.id}`);
      }
      
      console.error("Generation error:", error);
      toast({
        title: "Generation Error",
        description: "There was a problem generating the content. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate progress for phase 3
  const calculateModuleProgress = () => {
    if (!course?.modules.length) return 0;
    
    const generatedModules = course.modules.filter(
      m => m.status === "generated" || m.status === "approved"
    ).length;
    
    return Math.round((generatedModules / course.modules.length) * 100);
  };

  const handleGenerateAll = () => {
    setIsGeneratingAll(true);
    setGenerationStatus("generating");
    setGenerationProgress(0);
    setCurrentGenerating("Starting generation...");
    generateAllContent.mutate();
  };

  // Handle module selection
  const handleSelectModule = (module: CourseModule) => {
    setSelectedModule(module);
    setExpandedLessons(new Set()); // Reset expanded lessons when changing module
  };

  const toggleLessonExpansion = (lessonTitle: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonTitle)) {
      newExpanded.delete(lessonTitle);
    } else {
      newExpanded.add(lessonTitle);
    }
    setExpandedLessons(newExpanded);
  };

  // Handle moving to the next phase
  const handleNextPhase = () => {
    moveToNextPhase();
    navigate("/phase4");
  };

  // Check if all modules are ready
  const allModulesReady = course?.modules?.every(
    m => m.status === "generated" || m.status === "approved"
  );

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading course...</p>
      </div>
    );
  }

  const renderModuleContent = (module: CourseModule) => {
    if (!module.content?.lessons) {
      return <p className="text-gray-500">No lessons found for this module.</p>;
    }

    return (
      <div className="space-y-4">
        {module.content.lessons.map((lesson: any, index: number) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{lesson.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {lesson.detailedContent ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        ✓ Generated
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    <span className="text-sm text-gray-500">
                      {lesson.duration || "30 min"} • {lesson.difficulty || "Intermediate"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!lesson.detailedContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateLessonContent.mutate({
                        moduleId: module.id,
                        lessonId: lesson.title
                      })}
                      disabled={generateLessonContent.isPending}
                    >
                      {generateLessonContent.isPending ? "Generating..." : "Generate Content"}
                    </Button>
                  )}
                  {lesson.detailedContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLessonExpansion(lesson.title)}
                    >
                      {expandedLessons.has(lesson.title) ? "Hide" : "View Content"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {lesson.detailedContent && expandedLessons.has(lesson.title) && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {lesson.detailedContent.objectives && lesson.detailedContent.objectives.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Lesson Objectives:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {lesson.detailedContent.objectives.map((obj: string, idx: number) => (
                          <li key={idx}>{typeof obj === 'string' ? obj : JSON.stringify(obj)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {lesson.detailedContent && (
                    <div>
                      <h4 className="font-semibold mb-2">Detailed Content:</h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <LessonContentRenderer content={lesson.detailedContent} />
                        
                        {/* Debug info */}
                        <details className="mt-4">
                          <summary className="text-xs text-gray-500 cursor-pointer">Debug: Ver dados brutos</summary>
                          <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded mt-2 overflow-auto max-h-64">
                            {JSON.stringify(lesson.detailedContent, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  )}
                  
                  {lesson.detailedContent.practicalExercises && lesson.detailedContent.practicalExercises.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Exercícios Práticos:</h4>
                      <div className="space-y-2">
                        {lesson.detailedContent.practicalExercises.map((exercise: any, idx: number) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded">
                            <h5 className="font-medium">{(typeof exercise.title === 'string' ? exercise.title : JSON.stringify(exercise.title)) || `Exercício ${idx + 1}`}</h5>
                            <p className="text-sm mt-1">{(typeof exercise.description === 'string' ? exercise.description : JSON.stringify(exercise.description)) || 'Descrição não disponível'}</p>
                            {exercise.questions && exercise.questions.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-blue-700">Questões: {exercise.questions.length}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {lesson.detailedContent.assessmentQuestions && lesson.detailedContent.assessmentQuestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Perguntas de Avaliação:</h4>
                      <div className="space-y-2">
                        {lesson.detailedContent.assessmentQuestions.map((question: any, idx: number) => (
                          <div key={idx} className="bg-yellow-50 p-3 rounded">
                            <p className="font-medium">{question.question}</p>
                            <ul className="list-decimal list-inside mt-2 text-sm">
                              {question.options?.map((option: string, optIdx: number) => (
                                <li key={optIdx} className={optIdx === question.correct_answer ? "font-semibold text-green-700" : ""}>
                                  {option}
                                </li>
                              ))}
                            </ul>
                            {question.explanation && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Explicação:</strong> {question.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PhaseNav currentPhase={3} />
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Fase 3: Produção de Conteúdo</h1>
          <p className="text-gray-600">
            Gere conteúdo detalhado para cada aula dos seus módulos.
          </p>
        </div>

        <WorkflowProgress 
          currentPhase={3} 
          phaseProgress={calculateModuleProgress()}
        />

        {/* Generation Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Geração de Conteúdo</CardTitle>
            <CardDescription>
              Gere conteúdo para todas as aulas de uma vez ou individualmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isGeneratingAll && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentGenerating}</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                </div>
              )}
              
              <div className="flex gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="lg"
                      disabled={isGeneratingAll || generateAllContent.isPending}
                    >
                      {isGeneratingAll ? "Gerando..." : "Gerar Todo o Conteúdo"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Geração Completa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá gerar conteúdo detalhado para todas as aulas que ainda não possuem conteúdo. 
                        O processo pode levar alguns minutos e continuará mesmo se você recarregar a página.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleGenerateAll}>
                        Confirmar Geração
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button 
                  variant="outline"
                  onClick={handleNextPhase}
                  disabled={!allModulesReady}
                >
                  Prosseguir para Avaliação
                </Button>
              </div>
              
              {!allModulesReady && (
                <p className="text-sm text-amber-600">
                  Complete a geração de conteúdo para todos os módulos antes de prosseguir.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modules Tabs */}
        <Tabs value={selectedModule?.id || course.modules[0]?.id} className="w-full">
          <TabsList className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full h-auto gap-2 p-2">
            {course.modules.map((module, index) => (
              <TabsTrigger
                key={module.id}
                value={module.id}
                onClick={() => handleSelectModule(module)}
                className="flex flex-col items-start p-3 h-auto text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Módulo {index + 1}</span>
                  {module.status === "generated" ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">✓</Badge>
                  ) : (
                    <Badge variant="secondary">⏳</Badge>
                  )}
                </div>
                <span className="text-xs text-gray-600 line-clamp-2">
                  {module.title}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {course.modules.map((module) => (
            <TabsContent key={module.id} value={module.id} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderModuleContent(module)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}