import { useState, useEffect } from "react";
import { useCourse } from "@/context/CourseContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Download, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Phase4() {
  const { course, updateModuleContent, setCourse } = useCourse();
  const { toast } = useToast();
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneratingLesson, setCurrentGeneratingLesson] = useState("");

  // Check for incomplete activities but don't auto-resume
  useEffect(() => {
    // Clear any leftover generation flags to prevent auto-resume
    localStorage.removeItem('wasGeneratingActivities');
    sessionStorage.removeItem('hasAutoResumed');
  }, []);

  // Generate activities with AI for all lessons without activities
  const generateActivities = async () => {
    if (!course?.modules) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Set flag to resume generation after page refresh
    localStorage.setItem('wasGeneratingActivities', 'true');
    
    const lessonsToGenerate = [];
    
    // Find all lessons that need activities
    course.modules.forEach(module => {
      if (module.content?.lessons) {
        module.content.lessons.forEach(lesson => {
          const hasActivities = lesson.detailedContent?.practicalExercises?.length > 0 ||
                               lesson.detailedContent?.assessmentQuestions?.length > 0;
          
          if (!hasActivities) {
            lessonsToGenerate.push({
              moduleId: module.id,
              lessonId: lesson.title,
              lessonName: lesson.title,
              lessonContent: lesson.detailedContent?.content || ""
            });
          }
        });
      }
    });

    console.log(`Gerando atividades para ${lessonsToGenerate.length} aulas`);

    for (let i = 0; i < lessonsToGenerate.length; i++) {
      const lessonInfo = lessonsToGenerate[i];
      
      try {
        console.log(`🎯 Gerando atividades IA para: ${lessonInfo.lessonName}`);
        setCurrentGeneratingLesson(lessonInfo.lessonName);
        setGenerationProgress((i / lessonsToGenerate.length) * 100);

        // Call OpenAI API to generate activities
        const response = await fetch('/api/lesson-content-generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lesson: {
              title: lessonInfo.lessonName,
              content: lessonInfo.lessonContent
            },
            module: {
              title: course.modules.find(m => m.id === lessonInfo.moduleId)?.title || ""
            },
            courseDetails: {
              title: course.title,
              theme: course.theme,
              estimatedHours: course.estimatedHours,
              format: course.format,
              platform: course.platform,
              deliveryFormat: course.deliveryFormat
            },
            aiConfig: course.aiConfig,
            generateOnlyActivities: true // Flag to generate only activities
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Atividades geradas para: ${lessonInfo.lessonName}`);

          if (result.success && result.content) {
            const activities = result.content.practicalExercises || [];
            const assessmentQuestions = result.content.assessmentQuestions || [];

            // Update the lesson with AI-generated activities
            const moduleToUpdate = course.modules.find(m => m.id === lessonInfo.moduleId);
            if (moduleToUpdate?.content?.lessons) {
              const lessonIndex = moduleToUpdate.content.lessons.findIndex((l: any) => l.title === lessonInfo.lessonId);
              if (lessonIndex !== -1) {
                moduleToUpdate.content.lessons[lessonIndex] = {
                  ...moduleToUpdate.content.lessons[lessonIndex],
                  detailedContent: {
                    ...moduleToUpdate.content.lessons[lessonIndex].detailedContent,
                    practicalExercises: activities,
                    assessmentQuestions: assessmentQuestions
                  },
                  status: "generated"
                };
              }

              // Save activities and force interface update
              console.log(`💾 Atividades salvas para: ${lessonInfo.lessonName}`);
              await updateModuleContent(moduleToUpdate.id, moduleToUpdate.content);
              
              // Force immediate UI update by updating the course state directly
              setCourse(prevCourse => {
                if (!prevCourse) return prevCourse;
                return {
                  ...prevCourse,
                  modules: prevCourse.modules.map(m => 
                    m.id === moduleToUpdate.id ? moduleToUpdate : m
                  )
                };
              });
            }
          }
        } else {
          console.error(`❌ Erro na API para: ${lessonInfo.lessonName}`);
          // Fallback to simple activities if API fails
          const fallbackActivities = [
            {
              title: `Atividade Prática - ${lessonInfo.lessonName}`,
              description: `Exercício baseado no conteúdo da ${lessonInfo.lessonName}`,
              questions: [
                {
                  question: `Qual é o conceito principal da ${lessonInfo.lessonName}?`,
                  options: ["Conceito A", "Conceito B", "Conceito C", "Conceito D"],
                  correct_answer: 0,
                  explanation: "Resposta baseada no conteúdo da aula."
                }
              ]
            }
          ];

          const moduleToUpdate = course.modules.find(m => m.id === lessonInfo.moduleId);
          if (moduleToUpdate?.content?.lessons) {
            const lessonIndex = moduleToUpdate.content.lessons.findIndex((l: any) => l.title === lessonInfo.lessonId);
            if (lessonIndex !== -1) {
              moduleToUpdate.content.lessons[lessonIndex] = {
                ...moduleToUpdate.content.lessons[lessonIndex],
                detailedContent: {
                  ...moduleToUpdate.content.lessons[lessonIndex].detailedContent,
                  practicalExercises: fallbackActivities,
                  assessmentQuestions: []
                },
                status: "generated"
              };
            }
            await updateModuleContent(moduleToUpdate.id, moduleToUpdate.content);
          }
        }

        // Small delay to show real-time progress
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Erro gerando atividades para ${lessonInfo.lessonName}:`, error);
      }
    }

    setGenerationProgress(100);
    setCurrentGeneratingLesson("");
    setIsGenerating(false);

    // Clear the generation flag since we're done
    localStorage.removeItem('wasGeneratingActivities');

    toast({
      title: "🎉 Atividades geradas!",
      description: `${lessonsToGenerate.length} aulas agora têm atividades personalizadas criadas por IA.`,
    });
  };

  // Calculate statistics
  const stats = course?.modules?.reduce(
    (acc, module) => {
      acc.totalModules++;
      
      if (module.content?.lessons) {
        module.content.lessons.forEach(lesson => {
          acc.totalLessons++;
          
          // Check if lesson has activities (either practicalExercises or assessmentQuestions)
          const practicalExercises = lesson.detailedContent?.practicalExercises || [];
          const assessmentQuestions = lesson.detailedContent?.assessmentQuestions || [];
          
          const hasActivities = practicalExercises.length > 0 || assessmentQuestions.length > 0;
          
          if (hasActivities) {
            acc.lessonsWithActivities++;
            
            // Count questions from practical exercises
            const practicalQuestionsCount = practicalExercises.reduce((sum, ex) => {
              return sum + (ex.questions?.length || 0);
            }, 0);
            
            // Count assessment questions
            const assessmentQuestionsCount = assessmentQuestions.length;
            
            acc.totalQuestions += practicalQuestionsCount + assessmentQuestionsCount;
          }
        });
        
        // Check if module has any activities
        const moduleHasActivities = module.content.lessons.some(l => 
          (l.detailedContent?.practicalExercises?.length || 0) > 0 || 
          (l.detailedContent?.assessmentQuestions?.length || 0) > 0
        );
        
        if (moduleHasActivities) {
          acc.modulesWithActivities++;
        }
      }
      
      return acc;
    },
    { totalModules: 0, modulesWithActivities: 0, totalLessons: 0, lessonsWithActivities: 0, totalQuestions: 0 }
  ) || { totalModules: 0, modulesWithActivities: 0, totalLessons: 0, lessonsWithActivities: 0, totalQuestions: 0 };

  const coverage = stats.totalLessons > 0 ? (stats.lessonsWithActivities / stats.totalLessons) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Fase 4: Avaliação e Atividades
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Crie atividades práticas e avaliações personalizadas para cada aula do seu curso
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aulas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lessonsWithActivities}</div>
                <p className="text-xs text-muted-foreground">
                  sem atividades completas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questões</CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                <p className="text-xs text-muted-foreground">
                  Módulos com Atividades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Módulos</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalModules}</div>
                <p className="text-xs text-muted-foreground">
                  Total de Aulas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
                <Download className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coverage.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">
                  das aulas têm atividades
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Geração de Atividades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isGenerating && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Gerando atividades para: <strong>{currentGeneratingLesson}</strong>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                  <div className="text-center text-sm text-gray-500">
                    {Math.round(generationProgress)}% concluído
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={generateActivities}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isGenerating ? "Gerando..." : `Gerar Atividades Pendentes (${stats.totalLessons - stats.lessonsWithActivities})`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Modules Overview */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Módulos do Curso
            </h2>

            {course?.modules?.map((module, index) => {
              const moduleStats = module.content?.lessons?.reduce(
                (acc, lesson) => {
                  acc.total++;
                  
                  const practicalExercises = lesson.detailedContent?.practicalExercises || [];
                  const assessmentQuestions = lesson.detailedContent?.assessmentQuestions || [];
                  
                  const hasActivities = practicalExercises.length > 0 || assessmentQuestions.length > 0;
                  
                  if (hasActivities) {
                    acc.withActivities++;
                    
                    // Count total questions in this lesson
                    const practicalQuestionsCount = practicalExercises.reduce((sum, ex) => {
                      return sum + (ex.questions?.length || 0);
                    }, 0);
                    
                    acc.totalQuestions += practicalQuestionsCount + assessmentQuestions.length;
                  }
                  
                  return acc;
                },
                { total: 0, withActivities: 0, totalQuestions: 0 }
              ) || { total: 0, withActivities: 0, totalQuestions: 0 };

              return (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          Módulo {index + 1}: {module.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {module.description}
                        </p>
                      </div>
                      <Badge variant={moduleStats.withActivities === moduleStats.total ? "default" : "secondary"}>
                        {moduleStats.withActivities === moduleStats.total ? "Completo" : "Sem atividades"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {moduleStats.totalQuestions} questões • {moduleStats.total} aulas ({moduleStats.withActivities} com atividades)
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}