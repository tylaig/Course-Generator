import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Phase4() {
  const [_, navigate] = useLocation();
  const { course, moveToNextPhase, updatePhaseData, updateModuleContent } = useCourse();
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingLesson, setCurrentGeneratingLesson] = useState<string>("");
  const [totalLessonsToGenerate, setTotalLessonsToGenerate] = useState(0);
  const { toast } = useToast();

  // Generate missing activities for lessons
  const generateMissingActivities = useMutation({
    mutationFn: async () => {
      setGenerationStatus("generating");
      setGenerationProgress(0);
      
      const lessonsToGenerate: { moduleId: string; lessonId: string; lessonName: string }[] = [];
      
      // Find lessons without detailed content or with incomplete activities
      course?.modules.forEach(module => {
        if (module.content?.lessons) {
          module.content.lessons.forEach((lesson: any) => {
            if (!lesson.detailedContent || 
                !lesson.detailedContent.practicalExercises || 
                lesson.detailedContent.practicalExercises.length === 0 ||
                !lesson.detailedContent.assessmentQuestions ||
                lesson.detailedContent.assessmentQuestions.length === 0) {
              lessonsToGenerate.push({
                moduleId: module.id,
                lessonId: lesson.title,
                lessonName: lesson.title
              });
            }
          });
        }
      });

      setTotalLessonsToGenerate(lessonsToGenerate.length);
      console.log(`Gerando atividades para ${lessonsToGenerate.length} aulas`);
      
      const results = [];
      
      for (let i = 0; i < lessonsToGenerate.length; i++) {
        const lessonInfo = lessonsToGenerate[i];
        try {
          // Update progress at the start of each iteration
          setCurrentGeneratingLesson(lessonInfo.lessonName);
          setGenerationProgress(((i) / lessonsToGenerate.length) * 100);
          
          const moduleToGenerate = course?.modules.find(m => m.id === lessonInfo.moduleId);
          if (!moduleToGenerate) {
            setGenerationProgress(((i + 1) / lessonsToGenerate.length) * 100);
            continue;
          }
          
          const lessonToGenerate = moduleToGenerate.content?.lessons?.find((l: any) => l.title === lessonInfo.lessonId);
          if (!lessonToGenerate) {
            setGenerationProgress(((i + 1) / lessonsToGenerate.length) * 100);
            continue;
          }
          
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
      setGenerationStatus("success");
      setGenerationProgress(100);
      setCurrentGeneratingLesson("");
      
      toast({
        title: "Atividades geradas!",
        description: `${data.length} aulas tiveram suas atividades geradas com sucesso.`,
      });
    },
    onError: (error) => {
      setGenerationStatus("error");
      setCurrentGeneratingLesson("");
      
      console.error("Activities generation error:", error);
      toast({
        title: "Erro na geração",
        description: "Houve um problema ao gerar as atividades. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Generate all content for all lessons
  const generateAllContent = useMutation({
    mutationFn: async () => {
      setGenerationStatus("generating");
      setGenerationProgress(0);
      
      const allLessons: { moduleId: string; lessonId: string; lessonName: string }[] = [];
      
      // Get all lessons from all modules
      course?.modules.forEach(module => {
        if (module.content?.lessons) {
          module.content.lessons.forEach((lesson: any) => {
            allLessons.push({
              moduleId: module.id,
              lessonId: lesson.title,
              lessonName: lesson.title
            });
          });
        }
      });

      setTotalLessonsToGenerate(allLessons.length);
      console.log(`Gerando conteúdo completo para ${allLessons.length} aulas`);
      
      const results = [];
      
      for (let i = 0; i < allLessons.length; i++) {
        const lessonInfo = allLessons[i];
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
          
          // Update progress
          setGenerationProgress(((i + 1) / allLessons.length) * 100);
          
          // Short pause between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error generating content for lesson ${lessonInfo.lessonName}:`, error);
          // Update progress even on error
          setGenerationProgress(((i + 1) / allLessons.length) * 100);
          // Continue with next lesson
        }
      }
      
      return results;
    },
    onSuccess: (data) => {
      setGenerationStatus("success");
      setGenerationProgress(100);
      setCurrentGeneratingLesson("");
      
      toast({
        title: "Conteúdo completo gerado!",
        description: `${data.length} aulas tiveram todo o conteúdo gerado com sucesso.`,
      });
    },
    onError: (error) => {
      setGenerationStatus("error");
      setCurrentGeneratingLesson("");
      
      console.error("All content generation error:", error);
      toast({
        title: "Erro na geração",
        description: "Houve um problema ao gerar o conteúdo completo. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Calculate completion stats
  const totalLessons = course?.modules.reduce((sum, module) => {
    return sum + (module.content?.lessons?.length || 0);
  }, 0) || 0;
  
  const lessonsWithActivities = course?.modules.reduce((sum, module) => {
    return sum + (module.content?.lessons?.filter((lesson: any) => 
      lesson.detailedContent && 
      ((lesson.detailedContent.practicalExercises && lesson.detailedContent.practicalExercises.length > 0) ||
       (lesson.detailedContent.assessmentQuestions && lesson.detailedContent.assessmentQuestions.length > 0))
    ).length || 0);
  }, 0) || 0;

  const pendingActivitiesCount = totalLessons - lessonsWithActivities;

  // Função para extrair atividades das aulas de um módulo
  const getModuleActivities = (module: any) => {
    if (!module.content?.lessons) return [];
    
    const activities: any[] = [];
    module.content.lessons.forEach((lesson: any) => {
      if (lesson.detailedContent?.activities) {
        lesson.detailedContent.activities.forEach((activity: any) => {
          activities.push({
            ...activity,
            lessonTitle: lesson.title,
            moduleTitle: module.title,
            moduleId: module.id
          });
        });
      }
    });
    return activities;
  };

  // Função para contar questões por módulo
  const getModuleQuestionCount = (module: any) => {
    const activities = getModuleActivities(module);
    let questionCount = 0;
    activities.forEach(activity => {
      if (activity.questions) {
        questionCount += activity.questions.length;
      }
    });
    return questionCount;
  };

  // Função para contar total de atividades por módulo
  const getModuleActivityCount = (module: any) => {
    return getModuleActivities(module).length;
  };



  const handleNextPhase = () => {
    moveToNextPhase();
    navigate("/phase5");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={4}
          title="Fase 4: Avaliações e Atividades" 
          description="Visualize e organize as atividades e avaliações geradas automaticamente na Fase 3"
          onNext={handleNextPhase}
        />

        {/* Resumo das Atividades Geradas */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Resumo das Atividades</h3>
              <p className="text-sm text-blue-700">Atividades e avaliações extraídas do conteúdo gerado na Fase 3</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {course?.modules.reduce((total, module) => total + getModuleActivityCount(module), 0)}
              </div>
              <div className="text-xs text-blue-600">Total de Atividades</div>
            </div>
          </div>
          
          {/* Botões de Ação para Gerar Atividades */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center space-x-2">
              {pendingActivitiesCount > 0 && (
                <div className="flex items-center space-x-2 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {pendingActivitiesCount} aulas sem atividades completas
                  </span>
                </div>
              )}
              {generationStatus === "generating" && (
                <div className="flex flex-col space-y-2 text-blue-700">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Gerando atividades...</span>
                  </div>
                  {currentGeneratingLesson && (
                    <div className="text-xs text-blue-600">
                      Processando: {currentGeneratingLesson}
                    </div>
                  )}
                  <div className="w-48">
                    <Progress value={generationProgress} className="h-2" />
                    <div className="text-xs text-blue-600 mt-1">
                      {Math.round(generationProgress)}% concluído
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              {pendingActivitiesCount > 0 && (
                <Button
                  onClick={() => generateMissingActivities.mutate()}
                  disabled={generationStatus === "generating"}
                  variant="outline"
                  size="sm"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Atividades Pendentes ({pendingActivitiesCount})
                </Button>
              )}
              
              <Button
                onClick={() => generateAllContent.mutate()}
                disabled={generationStatus === "generating"}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Regenerar Todas as Atividades
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800">
                {course?.modules.reduce((total, module) => total + getModuleQuestionCount(module), 0)}
              </div>
              <div className="text-xs text-blue-600">Questões</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800">
                {course?.modules.filter(module => getModuleActivityCount(module) > 0).length}
              </div>
              <div className="text-xs text-blue-600">Módulos com Atividades</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800">
                {course?.modules.length || 0}
              </div>
              <div className="text-xs text-blue-600">Total de Módulos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800">
                {Math.round(((course?.modules.filter(module => getModuleActivityCount(module) > 0).length || 0) / (course?.modules.length || 1)) * 100)}%
              </div>
              <div className="text-xs text-blue-600">Cobertura</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Módulos */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Módulos do Curso</h2>
            <div className="space-y-3">
              {course?.modules.map((module) => {
                const activityCount = getModuleActivityCount(module);
                const questionCount = getModuleQuestionCount(module);
                
                return (
                  <Card 
                    key={module.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedModule?.id === module.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedModule(module)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{module.title}</CardTitle>
                        <div className="flex space-x-1">
                          {activityCount > 0 ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                              ✅ {activityCount} atividades
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Sem atividades
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {questionCount} questões • {module.content?.lessons?.length || 0} aulas
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
          
          {/* Detalhes do Módulo Selecionado */}
          <div className="lg:col-span-2">
            {selectedModule ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{selectedModule.title}</h2>
                  <div className="flex space-x-2">
                    <Badge variant="outline">
                      {getModuleActivityCount(selectedModule)} atividades
                    </Badge>
                    <Badge variant="outline">
                      {getModuleQuestionCount(selectedModule)} questões
                    </Badge>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">{selectedModule.description}</p>
                
                {getModuleActivityCount(selectedModule) > 0 ? (
                  <div className="space-y-4">
                    {selectedModule.content?.lessons?.map((lesson: any) => {
                      if (!lesson.detailedContent?.activities || lesson.detailedContent.activities.length === 0) {
                        return null;
                      }
                      
                      return (
                        <Card key={lesson.id} className="border border-gray-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{lesson.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {lesson.detailedContent.activities.length} atividade(s) disponível(eis)
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                              {lesson.detailedContent.activities.map((activity: any, actIdx: number) => (
                                <AccordionItem key={actIdx} value={`activity-${actIdx}`}>
                                  <AccordionTrigger className="text-sm font-medium">
                                    {activity.type === 'quiz' ? '📝' : '⚡'} {activity.title}
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3">
                                      <p className="text-sm text-gray-600">{activity.description}</p>
                                      
                                      {activity.questions && activity.questions.length > 0 && (
                                        <div className="space-y-3">
                                          <h4 className="font-medium text-sm">Questões:</h4>
                                          {activity.questions.map((question: any, qIdx: number) => (
                                            <div key={qIdx} className="bg-purple-50 p-3 rounded border border-purple-200">
                                              <p className="font-medium text-sm mb-2">{qIdx + 1}. {question.question}</p>
                                              {question.options && (
                                                <div className="space-y-1">
                                                  {question.options.map((option: string, oIdx: number) => (
                                                    <div key={oIdx} className={`text-xs p-2 rounded ${
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
                                          
                                          <div className="mt-3 flex space-x-2">
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              onClick={() => {
                                                const activityText = `${activity.title}\n\n${activity.description}\n\n${activity.questions.map((q: any, i: number) => 
                                                  `${i+1}. ${q.question}\n${q.options.map((opt: string, j: number) => 
                                                    `${String.fromCharCode(65 + j)}) ${opt}`).join('\n')}\nResposta: ${String.fromCharCode(65 + q.correct)}`).join('\n\n')}`;
                                                
                                                navigator.clipboard.writeText(activityText);
                                                toast({
                                                  title: "Atividade copiada!",
                                                  description: "A atividade foi copiada para a área de transferência.",
                                                });
                                              }}
                                            >
                                              📋 Copiar Atividade
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                    <div className="text-4xl mb-2">📝</div>
                    <h3 className="text-lg font-medium text-gray-700 mb-1">Nenhuma Atividade Encontrada</h3>
                    <p className="text-sm text-gray-500">
                      Este módulo ainda não possui atividades geradas. 
                      Volte à Fase 3 para gerar conteúdo com atividades.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">👈</div>
                <p className="text-gray-500">Selecione um módulo para visualizar suas atividades e avaliações</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <Button 
            onClick={handleNextPhase}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continuar para Próxima Fase
          </Button>
        </div>
      </div>
    </div>
  );
}
