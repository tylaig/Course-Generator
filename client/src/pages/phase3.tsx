import { useState } from "react";
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
    updateModuleStatus,
    updateProgress,
    generationStatus,
    setGenerationStatus
  } = useCourse();
  
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerating, setCurrentGenerating] = useState<string>("");
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

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
        "/api/generate/lesson-content", 
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
      
      return { module: moduleToGenerate, lesson: lessonToGenerate, content: await response.json() };
    },
    onSuccess: (data) => {
      const { module, lesson, content } = data;
      
      // Update lesson with generated content in module
      const updatedModule = { ...module };
      if (updatedModule.content?.lessons) {
        const lessonIndex = updatedModule.content.lessons.findIndex((l: any) => l.title === lesson.title);
        if (lessonIndex !== -1) {
          updatedModule.content.lessons[lessonIndex] = {
            ...updatedModule.content.lessons[lessonIndex],
            detailedContent: content,
            status: "generated"
          };
        }
      }
      
      // Update module with updated lessons
      updateModuleContent(module.id, updatedModule.content);
      
      // Check if all lessons in module are generated
      const allLessonsGenerated = updatedModule.content?.lessons?.every((l: any) => l.detailedContent);
      if (allLessonsGenerated) {
        updateModuleStatus(module.id, "generated");
      }
      
      setGenerationStatus("success");
      
      toast({
        title: "Conteúdo da aula gerado",
        description: `O conteúdo para "${lesson.title}" foi gerado com sucesso.`,
      });
      
      // Update progress
      updateProgress(3, calculateModuleProgress());
    },
    onError: (error) => {
      console.error("Error generating lesson content:", error);
      setGenerationStatus("error");
      
      toast({
        title: "Erro ao gerar conteúdo da aula",
        description: "Não foi possível gerar o conteúdo da aula. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Generate all lessons from all modules
  const generateAllLessons = useMutation({
    mutationFn: async () => {
      setIsGeneratingAll(true);
      setGenerationProgress(0);
      setGenerationStatus("generating");
      
      // Get all lessons from all modules
      const allLessons: Array<{moduleId: string, moduleName: string, lessonId: string, lessonName: string}> = [];
      
      course?.modules.forEach(module => {
        if (module.content?.lessons) {
          module.content.lessons.forEach((lesson: any) => {
            if (!lesson.detailedContent) {
              allLessons.push({
                moduleId: module.id,
                moduleName: module.title,
                lessonId: lesson.title,
                lessonName: lesson.title
              });
            }
          });
        }
      });
      
      if (allLessons.length === 0) {
        throw new Error("Todas as aulas já possuem conteúdo gerado");
      }
      
      const results = [];
      
      // Generate content for each lesson sequentially
      for (let i = 0; i < allLessons.length; i++) {
        const lessonInfo = allLessons[i];
        setCurrentGenerating(`${lessonInfo.moduleName} - ${lessonInfo.lessonName}`);
        setGenerationProgress(Math.round((i / allLessons.length) * 100));
        
        try {
          const moduleToGenerate = course?.modules.find(m => m.id === lessonInfo.moduleId);
          if (!moduleToGenerate) continue;
          
          const lessonToGenerate = moduleToGenerate.content?.lessons?.find((l: any) => l.title === lessonInfo.lessonId);
          if (!lessonToGenerate) continue;
          
          const response = await apiRequest(
            "POST", 
            "/api/generate/lesson-content", 
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
          
          const content = await response.json();
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
          
          // Update module with updated lessons
          updateModuleContent(moduleToGenerate.id, updatedModule.content);
          
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
      
      // Update module statuses
      course?.modules.forEach(module => {
        const allLessonsGenerated = module.content?.lessons?.every((lesson: any) => lesson.detailedContent);
        if (allLessonsGenerated) {
          updateModuleStatus(module.id, "generated");
        }
      });
      
      toast({
        title: "Geração completa!",
        description: `Foram gerados conteúdos para ${data.length} aulas com sucesso.`,
      });
      
      // Update progress
      updateProgress(3, calculateModuleProgress());
    },
    onError: (error) => {
      console.error("Error generating all lessons:", error);
      setIsGeneratingAll(false);
      setGenerationStatus("error");
      setCurrentGenerating("");
      
      toast({
        title: "Erro na geração em lote",
        description: error.message || "Ocorreu um erro ao gerar o conteúdo das aulas.",
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
    // Check if we have at least one module with content
    const hasContent = course?.modules.some(
      m => m.status === "generated" || m.status === "approved"
    );
    
    if (!hasContent) {
      toast({
        title: "Nenhum conteúdo gerado",
        description: "Gere conteúdo para pelo menos um módulo antes de avançar.",
        variant: "destructive",
      });
      return;
    }
    
    // Update progress
    updateProgress(3, calculateModuleProgress());
    moveToNextPhase();
    navigate("/phase4");
  };

  // Render content for selected module
  const renderModuleContent = (module: CourseModule) => {
    if (!module.content?.lessons || module.content.lessons.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Este módulo não possui aulas configuradas.</p>
          <p className="text-sm text-gray-400 mt-2">Volte para a Fase 2 para configurar as aulas do módulo.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4">
          Aulas do Módulo ({module.content.lessons.length})
        </h3>
        
        {module.content.lessons.map((lesson: any, index: number) => {
          const isExpanded = expandedLessons.has(lesson.title);
          const hasContent = lesson.detailedContent;
          
          return (
            <Card key={lesson.title || index} className="border border-gray-200">
              <CardHeader 
                className={`pb-3 ${hasContent ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => hasContent && toggleLessonExpansion(lesson.title)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div>
                      <CardTitle className="text-base flex items-center">
                        {lesson.title}
                        {hasContent && (
                          <span className="ml-2 text-gray-400">
                            {isExpanded ? '👁️' : '👁️‍🗨️'}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Duração: {lesson.duration || "45min"}
                      </CardDescription>
                    </div>
                  </div>
                
                <div className="flex items-center space-x-2">
                  {lesson.detailedContent ? (
                    <div className="flex space-x-1">
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        ✅ Gerado
                      </Badge>
                      {lesson.detailedContent?.content && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                          🎙️ Áudio
                        </Badge>
                      )}
                      {lesson.detailedContent?.content?.practicalExercises?.length > 0 && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                          ⚡ Atividades
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100">
                      Sem Conteúdo
                    </Badge>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click when clicking button
                      generateLessonContent.mutate({ 
                        moduleId: module.id, 
                        lessonId: lesson.title 
                      });
                    }}
                    disabled={generationStatus === "generating"}
                  >
                    {generationStatus === "generating" ? (
                      <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    ) : lesson.detailedContent ? (
                      "Regenerar"
                    ) : (
                      "Gerar Conteúdo"
                    )}
                  </Button>
                </div>
              </div>
              </CardHeader>
              
              {hasContent && isExpanded && (
              <CardContent className="pt-0">
                <Accordion type="multiple" className="w-full">
                  
                  {/* Texto Completo da Aula */}
                  <AccordionItem value="full-content" className="border-b">
                    <AccordionTrigger className="text-sm font-medium">
                      📖 Conteúdo Completo da Aula
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-slate-50 p-4 rounded-md">
                        <div className="prose prose-sm max-w-none">
                          {/* Debug: Show raw content structure */}
                          <div className="mb-4 p-2 bg-yellow-100 text-xs overflow-auto max-h-40">
                            <strong>Debug - Estrutura dos dados:</strong>
                            <pre className="whitespace-pre-wrap text-xs mt-1">
                              {JSON.stringify(lesson.detailedContent, null, 2)}
                            </pre>
                          </div>
                          
                          {lesson.detailedContent ? (
                            <div className="space-y-4">
                              <div className="bg-white p-4 rounded border">
                                <h4 className="font-semibold mb-2 text-gray-800">Informações da Aula:</h4>
                                <p><strong>Título:</strong> {lesson.detailedContent.title}</p>
                                <p><strong>Duração:</strong> {lesson.detailedContent.duration}</p>
                              </div>
                              
                              {lesson.detailedContent.objectives && (
                                <div className="bg-white p-4 rounded border">
                                  <h4 className="font-semibold mb-2 text-gray-800">Objetivos:</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {lesson.detailedContent.objectives.map((obj: string, idx: number) => (
                                      <li key={idx}>{obj}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {lesson.detailedContent.content && (
                                <div className="bg-white p-4 rounded border">
                                  <h4 className="font-semibold mb-2 text-gray-800">Conteúdo da Aula:</h4>
                                  <div className="prose prose-sm max-w-none">
                                    <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
                                      {lesson.detailedContent.content}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {lesson.detailedContent.activities && (
                                <div className="bg-white p-4 rounded border">
                                  <h4 className="font-semibold mb-2 text-gray-800">Atividades:</h4>
                                  {lesson.detailedContent.activities.map((activity: any, idx: number) => (
                                    <div key={idx} className="mb-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                                      <h5 className="font-medium text-sm">{activity.title}</h5>
                                      <p className="text-sm mb-2">{activity.description}</p>
                                      {activity.questions && (
                                        <div className="mt-2">
                                          {activity.questions.map((question: any, qIdx: number) => (
                                            <div key={qIdx} className="mb-2 p-2 bg-white rounded border">
                                              <p className="text-xs font-medium">{question.question}</p>
                                              {question.options && (
                                                <div className="mt-1 space-y-1">
                                                  {question.options.map((option: string, oIdx: number) => (
                                                    <div key={oIdx} className={`text-xs p-1 rounded ${
                                                      oIdx === question.correct 
                                                        ? 'bg-green-100 text-green-800 font-medium' 
                                                        : 'bg-gray-100'
                                                    }`}>
                                                      {String.fromCharCode(65 + oIdx)}) {option}
                                                      {oIdx === question.correct && ' ✓'}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {lesson.detailedContent.materials && (
                                <div className="bg-white p-4 rounded border">
                                  <h4 className="font-semibold mb-2 text-gray-800">Materiais:</h4>
                                  <ul className="list-disc list-inside text-sm">
                                    {lesson.detailedContent.materials.map((material: string, idx: number) => (
                                      <li key={idx}>{material}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500">Nenhum conteúdo disponível</p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* Objetivos da Aula */}
                  {lesson.detailedContent?.objectives && (
                    <AccordionItem value="objectives">
                      <AccordionTrigger className="text-sm font-medium">
                        🎯 Objetivos da Aula
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-blue-50 p-4 rounded-md">
                          <ul className="list-disc list-inside space-y-1">
                            {lesson.detailedContent?.objectives?.map((obj: string, idx: number) => (
                              <li key={idx} className="text-sm text-blue-800">{obj}</li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Conteúdo da Aula */}
                  {lesson.detailedContent?.content && (
                    <AccordionItem value="audio-script">
                      <AccordionTrigger className="text-sm font-medium">
                        📝 Conteúdo da Aula Completo
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-green-50 p-4 rounded-md">
                          <div className="mb-3 flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Duração: {lesson.detailedContent?.duration || "45min"}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                // Copiar script para área de transferência
                                navigator.clipboard.writeText(lesson.detailedContent?.content || "");
                                toast({
                                  title: "Script copiado!",
                                  description: "O script foi copiado para a área de transferência.",
                                });
                              }}
                            >
                              📋 Copiar Conteúdo
                            </Button>
                          </div>
                          <div className="bg-white p-3 rounded border text-sm font-mono">
                            <pre className="whitespace-pre-wrap">
                              {lesson.detailedContent?.content}
                            </pre>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Estrutura da Aula */}
                  {lesson.detailedContent?.content?.lessonStructure && (
                    <AccordionItem value="structure">
                      <AccordionTrigger className="text-sm font-medium">
                        📋 Estrutura Pedagógica
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {Object.entries(lesson.detailedContent?.content?.lessonStructure || {}).map(([phase, details]: [string, any]) => (
                            <div key={phase} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm capitalize">
                                  {phase === 'introduction' && '🚀 Introdução'}
                                  {phase === 'development' && '📚 Desenvolvimento'}
                                  {phase === 'activities' && '⚡ Atividades'}
                                  {phase === 'conclusion' && '🎯 Conclusão'}
                                  {!['introduction', 'development', 'activities', 'conclusion'].includes(phase) && `📝 ${phase}`}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {details.duration}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{details.content}</p>
                              {details.talking_points && (
                                <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
                                  {details.talking_points.map((point: string, idx: number) => (
                                    <li key={idx}>{point}</li>
                                  ))}
                                </ul>
                              )}
                              {details.exercises && (
                                <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
                                  {details.exercises.map((exercise: string, idx: number) => (
                                    <li key={idx}>{exercise}</li>
                                  ))}
                                </ul>
                              )}
                              {details.summary_points && (
                                <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
                                  {details.summary_points.map((point: string, idx: number) => (
                                    <li key={idx}>{point}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Atividades Práticas */}
                  {lesson.detailedContent.content?.practicalExercises && (
                    <AccordionItem value="exercises">
                      <AccordionTrigger className="text-sm font-medium">
                        ⚡ Atividades Práticas
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {lesson.detailedContent.content.practicalExercises.map((exercise: any, idx: number) => (
                            <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{exercise.title}</h4>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                                  {exercise.time_required}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
                              {exercise.instructions && (
                                <div>
                                  <p className="text-xs font-medium text-gray-700 mb-1">Instruções:</p>
                                  <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                                    {exercise.instructions.map((instruction: string, iIdx: number) => (
                                      <li key={iIdx}>{instruction}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Questões de Avaliação */}
                  {lesson.detailedContent.content?.assessmentQuestions && (
                    <AccordionItem value="assessment">
                      <AccordionTrigger className="text-sm font-medium">
                        ✅ Questões de Avaliação
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {lesson.detailedContent.content.assessmentQuestions.map((question: any, idx: number) => (
                            <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                              <h4 className="font-medium text-sm mb-2">Questão {idx + 1}</h4>
                              <p className="text-sm text-gray-700 mb-2">{question.question}</p>
                              {question.options && (
                                <div className="space-y-1 mb-2">
                                  {question.options.map((option: string, oIdx: number) => (
                                    <div key={oIdx} className={`text-xs p-2 rounded ${
                                      oIdx === question.correct_answer 
                                        ? 'bg-green-100 text-green-800 font-medium' 
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}) {option}
                                      {oIdx === question.correct_answer && ' ✓'}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {question.explanation && (
                                <div className="bg-white p-2 rounded border-l-4 border-purple-400">
                                  <p className="text-xs text-gray-600">
                                    <strong>Explicação:</strong> {question.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Materiais e Recursos */}
                  {lesson.detailedContent.content?.materials && (
                    <AccordionItem value="materials">
                      <AccordionTrigger className="text-sm font-medium">
                        📚 Materiais e Recursos
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <ul className="list-disc list-inside space-y-1">
                            {lesson.detailedContent.content.materials.map((material: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">{material}</li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Tarefa de Casa */}
                  {lesson.detailedContent.content?.homework && (
                    <AccordionItem value="homework">
                      <AccordionTrigger className="text-sm font-medium">
                        🏠 Tarefa de Casa
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <p className="text-sm text-orange-800">{lesson.detailedContent.content.homework}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                </Accordion>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={3}
          title="Fase 3: Geração de Conteúdo" 
          description="Gere conteúdo detalhado para cada aula dos módulos do curso"
          onNext={handleNextPhase}
        />
        
        {/* Botão para gerar todas as aulas */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Geração em Lote</h3>
              <p className="text-sm text-blue-700">Gere conteúdo para todas as aulas de todos os módulos automaticamente</p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isGeneratingAll || generationStatus === "generating"}
                >
                  {isGeneratingAll ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Gerando...
                    </span>
                  ) : (
                    "Gerar Todas as Aulas"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Gerar Todas as Aulas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá gerar conteúdo para todas as aulas de todos os módulos que ainda não possuem conteúdo. 
                    Isso pode levar alguns minutos. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => generateAllLessons.mutate()}>
                    Gerar Todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          {/* Barra de progresso durante geração */}
          {isGeneratingAll && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Progresso</span>
                <span className="text-blue-700">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
              {currentGenerating && (
                <p className="text-xs text-blue-600">
                  Gerando: {currentGenerating}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Módulos disponíveis */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Módulos do Curso</h2>
            <div className="space-y-3">
              {course?.modules.map((module) => (
                <Card 
                  key={module.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedModule?.id === module.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectModule(module)}
                >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{module.title}</CardTitle>
                      <Badge 
                        variant={module.status === "generated" ? "default" : "outline"}
                        className={module.status === "generated" ? "bg-green-100 text-green-800" : ""}
                      >
                        {module.status === "generated" ? "Gerado" : "Pendente"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {module.content?.lessons?.length || 0} aulas
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Conteúdo do módulo selecionado */}
          <div className="lg:col-span-2">
            {selectedModule ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{selectedModule.title}</h2>
                  <Badge 
                    variant={selectedModule.status === "generated" ? "default" : "outline"}
                    className={selectedModule.status === "generated" ? "bg-green-100 text-green-800" : ""}
                  >
                    {selectedModule.status === "generated" ? "Gerado" : "Pendente"}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-6">{selectedModule.description}</p>
                
                {renderModuleContent(selectedModule)}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Selecione um módulo para gerar o conteúdo das aulas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}