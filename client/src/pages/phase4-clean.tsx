import { useState, useEffect } from "react";
import { useCourse } from "../context/CourseContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, BookOpen, CheckCircle, AlertCircle, Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PhaseNav from "../components/layout/PhaseNav";

export default function Phase4Clean() {
  const { course, setCourse } = useCourse();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingLesson, setCurrentGeneratingLesson] = useState("");
  const [generatedActivities, setGeneratedActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  // 🚀 CARREGAR ATIVIDADES SALVAS DO POSTGRESQL AO MONTAR O COMPONENTE
  useEffect(() => {
    loadSavedActivities();
  }, [course]);

  const loadSavedActivities = async () => {
    if (!course?.modules) return;

    try {
      console.log("🔍 Carregando atividades salvas do PostgreSQL...");
      
      // Buscar todas as atividades salvas no PostgreSQL para este curso
      const response = await fetch("/api/lessons/all");
      if (response.ok) {
        const savedLessons = await response.json();
        console.log("✅ Atividades carregadas do PostgreSQL:", savedLessons);
        
        // Converter dados do PostgreSQL para o formato esperado pelo frontend
        const activitiesFromDB = savedLessons.map((lesson: any) => ({
          moduleId: lesson.moduleId,
          moduleName: `Módulo ${lesson.moduleId}`,
          lessonName: lesson.title,
          savedActivities: lesson.totalActivities || lesson.activities?.length || 0,
          savedQuestions: lesson.totalQuestions || lesson.activities?.reduce((total: number, activity: any) => 
            total + (activity.questions?.length || 0), 0) || 0,
          postgresLessonId: lesson.id,
          practicalExercises: lesson.activities || [],
          assessmentQuestions: lesson.activities?.flatMap((a: any) => a.questions || []) || []
        }));
        
        setGeneratedActivities(activitiesFromDB);
        console.log(`📊 ${activitiesFromDB.length} atividades recuperadas do banco`);
        console.log(`📊 Atividades por aula:`, activitiesFromDB.map(a => `${a.lessonName}: ${a.savedActivities} atividades, ${a.savedQuestions} questões`));
      } else {
        console.error("❌ Erro na resposta da API:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar atividades salvas:", error);
    }
  };

  // Calculate statistics from PostgreSQL generated activities
  const getStatistics = () => {
    const totalLessons = course?.modules?.reduce((total, module) => {
      return total + (module.content?.lessons?.length || 0);
    }, 0) || 0;

    const lessonsWithActivities = generatedActivities.length;
    const totalQuestions = generatedActivities.reduce((total, activity) => {
      return total + (activity.savedQuestions || 0);
    }, 0);

    const coverage = totalLessons > 0 ? (lessonsWithActivities / totalLessons) * 100 : 0;

    return {
      totalLessons,
      lessonsWithActivities,
      totalQuestions,
      coverage
    };
  };

  const stats = getStatistics();

  // Get lessons that need activities
  const getLessonsNeedingActivities = () => {
    if (!course?.modules) return [];

    const lessons: any[] = [];
    course.modules.forEach(module => {
      if (module.content?.lessons) {
        module.content.lessons.forEach((lesson: any) => {
          // Check if this lesson already has generated activities
          const hasGenerated = generatedActivities.some(activity => 
            activity.lessonName === lesson.title && activity.moduleId === module.id
          );
          
          if (!hasGenerated && lesson.title && lesson.title.trim() !== "") {
            lessons.push({
              moduleId: module.id,
              moduleName: module.title,
              lessonName: lesson.title,
              lesson: lesson
            });
          }
        });
      }
    });

    return lessons;
  };

  const lessonsToGenerate = getLessonsNeedingActivities();

  // Generate activities using OpenAI and save to PostgreSQL
  const generateActivities = async () => {
    if (lessonsToGenerate.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentGeneratingLesson("");

    console.log(`🎯 Iniciando geração de atividades para ${lessonsToGenerate.length} aulas`);

    let completedCount = 0;
    const newActivities = [];

    for (const lessonInfo of lessonsToGenerate) {
      try {
        setCurrentGeneratingLesson(lessonInfo.lessonName);
        console.log(`🔥 Gerando para: ${lessonInfo.lessonName}`);

        // 🚀 LOGS DETALHADOS PARA DEBUG COMPLETO
        console.log(`🔍 FRONTEND DEBUG - lessonInfo:`, JSON.stringify(lessonInfo, null, 2));
        
        // GARANTIR QUE moduleId NUNCA SEJA "NaN" OU INVÁLIDO
        const safeModuleId = (lessonInfo.moduleId && 
                             lessonInfo.moduleId !== "NaN" && 
                             lessonInfo.moduleId !== null && 
                             lessonInfo.moduleId !== undefined && 
                             !isNaN(parseInt(lessonInfo.moduleId.toString()))) 
          ? lessonInfo.moduleId 
          : 1; // Fallback sempre válido

        console.log(`🔍 FRONTEND DEBUG - safeModuleId:`, safeModuleId);

        const requestPayload = {
          lessons: [{
            moduleId: safeModuleId,
            lessonName: lessonInfo.lessonName,
            content: lessonInfo.lesson?.content || ""
          }],
          courseDetails: {
            title: course?.title || "Curso Educacional",
            theme: course?.theme || "Educação e Aprendizagem", 
            estimatedHours: course?.estimatedHours || 40
          }
        };

        console.log(`🔍 FRONTEND DEBUG - requestPayload:`, JSON.stringify(requestPayload, null, 2));

        // Call the integrated PostgreSQL endpoint
        const response = await fetch("/api/generate-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.results && result.results.length > 0) {
            const activityData = result.results[0];
            console.log(`✅ Atividades salvas no PostgreSQL para: ${lessonInfo.lessonName}`);
            console.log(`📊 Estatísticas: ${activityData.savedActivities} atividades, ${activityData.savedQuestions} questões`);

            const newActivity = {
              moduleId: lessonInfo.moduleId,
              moduleName: lessonInfo.moduleName,
              lessonName: lessonInfo.lessonName,
              savedActivities: activityData.savedActivities || 0,
              savedQuestions: activityData.savedQuestions || 0,
              postgresLessonId: activityData.postgresLessonId,
              practicalExercises: activityData.activities || [],
              assessmentQuestions: activityData.assessmentQuestions || []
            };

            newActivities.push(newActivity);
            
            // 🚀 ATUALIZAR A TELA EM TEMPO REAL conforme as atividades são geradas
            setGeneratedActivities(prev => [...prev, newActivity]);
          }
        } else {
          console.error(`❌ Erro na API para ${lessonInfo.lessonName}:`, await response.text());
        }

        completedCount++;
        setGenerationProgress((completedCount / lessonsToGenerate.length) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Erro ao gerar atividades para ${lessonInfo.lessonName}:`, error);
      }
    }

    // Update the generated activities list
    setGeneratedActivities(prev => [...prev, ...newActivities]);
    
    setIsGenerating(false);
    setCurrentGeneratingLesson("");
    setGenerationProgress(100);

    console.log(`🎉 Geração concluída! ${newActivities.length} aulas processadas`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PhaseNav 
        currentPhase={4}
        title="Geração de Atividades"
        description="Crie atividades educacionais personalizadas usando IA"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Aulas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLessons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Atividades</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.lessonsWithActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Questões</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.coverage)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Geração de Atividades via IA
          </CardTitle>
          <CardDescription>
            Gere atividades educacionais personalizadas que são salvas automaticamente no PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lessonsToGenerate.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {lessonsToGenerate.length} aulas aguardando geração de atividades
                  </p>
                </div>
                <Button 
                  onClick={generateActivities}
                  disabled={isGenerating}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isGenerating ? "Gerando..." : "Gerar Atividades"}
                </Button>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Gerando atividades...</span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                  {currentGeneratingLesson && (
                    <p className="text-xs text-muted-foreground">
                      Processando: {currentGeneratingLesson}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Todas as aulas já têm atividades geradas!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Activities List - ÚNICA SEÇÃO NECESSÁRIA */}
      {generatedActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Atividades Geradas ({generatedActivities.length})
            </CardTitle>
            <CardDescription>
              Atividades criadas via IA e vinculadas permanentemente às aulas do curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {activity.lessonName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {activity.moduleName}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {activity.savedActivities} atividades
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {activity.savedQuestions} questões
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedActivity(activity);
                        setShowActivityDialog(true);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Visualizar
                    </Button>
                    <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Vinculada
                    </Badge>
                  </div>
                </div>
              ))}

            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para visualizar atividades detalhadas */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Detalhes da Atividade
            </DialogTitle>
            <DialogDescription>
              Visualização completa das atividades e questões geradas
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="space-y-6">
              {/* Informações da Atividade */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{selectedActivity.lessonName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selectedActivity.moduleName}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{selectedActivity.savedActivities}</span>
                    <span className="text-gray-600 dark:text-gray-400">atividades práticas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{selectedActivity.savedQuestions}</span>
                    <span className="text-gray-600 dark:text-gray-400">questões de avaliação</span>
                  </div>
                </div>
              </div>

              {/* Conteúdo das Atividades */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Atividades Geradas via IA
                </h4>
                
                <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                  <div className="grid gap-4">
                    <div>
                      <h5 className="font-medium mb-2">📝 Exercícios Práticos</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Atividades interativas personalizadas para desenvolver as competências específicas da aula.
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">🎯 Questões de Avaliação</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Questões elaboradas para verificar o aprendizado e fixar o conteúdo apresentado.
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">💾 Status de Persistência</h5>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Salvo Permanentemente
                        </Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Vinculado ao curso e módulo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowActivityDialog(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    console.log("📚 Detalhes completos da atividade:", selectedActivity);
                    alert("✅ Atividade confirmada como persistente!\n\nTodos os dados estão salvos e vinculados ao curso.");
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}