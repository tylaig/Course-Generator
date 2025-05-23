import { useState, useEffect } from "react";
import { useCourse } from "../context/CourseContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, BookOpen, CheckCircle, AlertCircle, Eye } from "lucide-react";
import PhaseNav from "../components/layout/PhaseNav";

export default function Phase4Clean() {
  const { course, setCourse } = useCourse();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingLesson, setCurrentGeneratingLesson] = useState("");
  const [generatedActivities, setGeneratedActivities] = useState<any[]>([]);

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

      {/* Generated Activities List */}
      {generatedActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atividades Geradas (PostgreSQL)</CardTitle>
            <CardDescription>
              Atividades criadas e salvas automaticamente no banco de dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{activity.lessonName}</h4>
                    <p className="text-sm text-muted-foreground">{activity.moduleName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {activity.savedActivities} atividades
                    </Badge>
                    <Badge variant="outline">
                      {activity.savedQuestions} questões
                    </Badge>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      PostgreSQL
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lessons Awaiting Generation */}
      {lessonsToGenerate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aulas Aguardando Atividades</CardTitle>
            <CardDescription>
              Estas aulas ainda não possuem atividades geradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lessonsToGenerate.map((lesson, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{lesson.lessonName}</p>
                    <p className="text-sm text-muted-foreground">{lesson.moduleName}</p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Pendente
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}