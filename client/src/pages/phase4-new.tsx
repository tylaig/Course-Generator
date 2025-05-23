import { useState, useEffect } from "react";
import { useCourse } from "@/context/CourseContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Download, Zap, BookOpen, Users, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Phase4New() {
  const { course, updateModuleContent, setCourse } = useCourse();
  const { toast } = useToast();
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneratingLesson, setCurrentGeneratingLesson] = useState("");
  const [generatedActivities, setGeneratedActivities] = useState<Set<string>>(new Set());

  // Calculate activity statistics
  const stats = course?.modules?.reduce(
    (acc, module) => {
      acc.totalModules++;
      
      if (module.content?.lessons) {
        module.content.lessons.forEach(lesson => {
          acc.totalLessons++;
          
          // Check if lesson has activities
          const practicalExercises = lesson.detailedContent?.practicalExercises || [];
          const assessmentQuestions = lesson.detailedContent?.assessmentQuestions || [];
          
          const hasActivities = practicalExercises.length > 0 || assessmentQuestions.length > 0;
          
          if (hasActivities) {
            acc.lessonsWithActivities++;
            
            // Count questions from practical exercises
            const practicalQuestionsCount = practicalExercises.reduce((sum: number, ex: any) => {
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

  // Generate activities for lessons without activities
  const generateActivities = async () => {
    if (!course?.modules) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    // Collect all lessons that need activities
    const lessonsToGenerate: any[] = [];
    
    course.modules.forEach(module => {
      if (module.content?.lessons) {
        module.content.lessons.forEach(lesson => {
          const practicalExercises = lesson.detailedContent?.practicalExercises || [];
          const assessmentQuestions = lesson.detailedContent?.assessmentQuestions || [];
          const hasActivities = practicalExercises.length > 0 || assessmentQuestions.length > 0;
          
          if (!hasActivities) {
            lessonsToGenerate.push({
              moduleId: module.id,
              lessonName: lesson.title,
              module: module,
              lesson: lesson
            });
          }
        });
      }
    });

    console.log(`🎯 Gerando atividades para ${lessonsToGenerate.length} aulas`);

    let completed = 0;
    const total = lessonsToGenerate.length;

    for (const lessonInfo of lessonsToGenerate) {
      try {
        setCurrentGeneratingLesson(lessonInfo.lessonName);
        console.log(`🎯 Gerando atividades IA para: ${lessonInfo.lessonName}`);

        // Generate activities via API
        const response = await fetch("/api/generate/lesson-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonTitle: lessonInfo.lessonName,
            courseDetails: {
              title: course.title,
              theme: course.theme || "",
              publicTarget: course.theme || "",
              educationalLevel: "Iniciante",
              estimatedHours: course.estimatedHours || 40
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.content) {
            console.log(`✅ Atividades geradas para: ${lessonInfo.lessonName}`);
            
            // Update lesson with generated activities
            const updatedLesson = {
              ...lessonInfo.lesson,
              detailedContent: {
                ...lessonInfo.lesson.detailedContent,
                practicalExercises: result.content.practicalExercises || [],
                assessmentQuestions: result.content.assessmentQuestions || []
              }
            };

            // Update module with new lesson content
            const updatedModule = {
              ...lessonInfo.module,
              content: {
                ...lessonInfo.module.content,
                lessons: lessonInfo.module.content.lessons.map((l: any) => 
                  l.title === lessonInfo.lessonName ? updatedLesson : l
                )
              }
            };

            // Update course immediately in state and database
            const updatedCourse = {
              ...course,
              modules: course.modules.map(m => 
                m.id === lessonInfo.moduleId ? updatedModule : m
              )
            };

            // Save to database first
            try {
              const saveResponse = await fetch(`/api/courses/${course.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedCourse)
              });
              
              if (saveResponse.ok) {
                console.log(`💾 Atividades salvas no banco para: ${lessonInfo.lessonName}`);
                
                // Update local state
                setCourse(updatedCourse);
                setGeneratedActivities(prev => new Set([...Array.from(prev), lessonInfo.lessonName]));
                
                toast({
                  title: "Atividades Geradas! ✅",
                  description: `${lessonInfo.lessonName} - Atividades criadas com sucesso!`,
                  duration: 2000
                });
              }
            } catch (saveError) {
              console.error(`❌ Erro ao salvar no banco: ${lessonInfo.lessonName}`, saveError);
            }
          }
        } else {
          console.error(`❌ Erro na API para: ${lessonInfo.lessonName}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao gerar atividades para: ${lessonInfo.lessonName}`, error);
      }

      completed++;
      setGenerationProgress((completed / total) * 100);
    }

    setIsGenerating(false);
    setCurrentGeneratingLesson("");
    
    toast({
      title: "Geração Concluída! 🎉",
      description: `Todas as ${total} atividades foram geradas com sucesso!`,
      duration: 5000
    });
  };

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
                <CardTitle className="text-sm font-medium">Aulas com Atividades</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lessonsWithActivities}</div>
                <p className="text-xs text-muted-foreground">
                  de {stats.totalLessons} aulas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Questões</CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                <p className="text-xs text-muted-foreground">
                  questões criadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Módulos</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.modulesWithActivities}</div>
                <p className="text-xs text-muted-foreground">
                  de {stats.totalModules} módulos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(coverage)}%</div>
                <p className="text-xs text-muted-foreground">
                  das aulas cobertas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Generation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Geração de Atividades com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGenerating ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Gerando atividades...</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(generationProgress)}%
                    </span>
                  </div>
                  <Progress value={generationProgress} className="w-full" />
                  {currentGeneratingLesson && (
                    <p className="text-sm text-muted-foreground">
                      📝 Criando atividades para: <strong>{currentGeneratingLesson}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Gere atividades práticas e questões de avaliação automaticamente
                    </p>
                  </div>
                  <Button onClick={generateActivities} disabled={!course?.modules}>
                    <Zap className="mr-2 h-4 w-4" />
                    Gerar Atividades
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modules with Activities */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Módulos e Atividades
            </h2>
            
            {course?.modules?.map((module, moduleIndex) => (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span>Módulo {moduleIndex + 1}: {module.title}</span>
                    </div>
                    <Badge variant="outline">
                      {module.content?.lessons?.filter(l => 
                        (l.detailedContent?.practicalExercises?.length || 0) > 0 || 
                        (l.detailedContent?.assessmentQuestions?.length || 0) > 0
                      ).length || 0} de {module.content?.lessons?.length || 0} aulas
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {module.content?.lessons?.map((lesson, lessonIndex) => {
                      const practicalExercises = lesson.detailedContent?.practicalExercises || [];
                      const assessmentQuestions = lesson.detailedContent?.assessmentQuestions || [];
                      const hasActivities = practicalExercises.length > 0 || assessmentQuestions.length > 0;
                      const totalQuestions = practicalExercises.reduce((sum: number, ex: any) => 
                        sum + (ex.questions?.length || 0), 0) + assessmentQuestions.length;
                      
                      return (
                        <div key={lessonIndex} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Aula {lessonIndex + 1}: {lesson.title}
                            </h4>
                            {hasActivities ? (
                              <Badge className="bg-green-100 text-green-800">
                                ✅ {totalQuestions} questões
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Sem atividades
                              </Badge>
                            )}
                          </div>
                          
                          {hasActivities && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              {practicalExercises.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                  <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                                    <Users className="inline h-4 w-4 mr-1" />
                                    Exercícios Práticos
                                  </h5>
                                  <div className="space-y-2">
                                    {practicalExercises.map((exercise: any, exIndex: number) => (
                                      <div key={exIndex} className="text-xs">
                                        <span className="font-medium">{exercise.title}</span>
                                        {exercise.questions && (
                                          <span className="text-muted-foreground ml-2">
                                            ({exercise.questions.length} questões)
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {assessmentQuestions.length > 0 && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                                  <h5 className="text-sm font-medium text-orange-900 dark:text-orange-300 mb-2">
                                    <Target className="inline h-4 w-4 mr-1" />
                                    Questões de Avaliação
                                  </h5>
                                  <div className="text-xs">
                                    <span>{assessmentQuestions.length} questões disponíveis</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}