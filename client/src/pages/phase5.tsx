import { useState } from "react";
import { useCourse } from "@/context/CourseContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle, Book, ClipboardList } from "lucide-react";
import { PhaseNav } from "@/components/layout/PhaseNav";
import { WorkflowProgress } from "@/components/layout/WorkflowProgress";
import { useToast } from "@/hooks/use-toast";

export default function Phase5() {
  const { course, moveToNextPhase } = useCourse();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingActivitiesPDF, setIsGeneratingActivitiesPDF] = useState(false);

  const handleNextPhase = () => {
    moveToNextPhase();
  };

  const generateCoursePDF = async () => {
    if (!course) return;
    
    setIsGeneratingPDF(true);
    try {
      const response = await fetch('/api/generate/course-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId: course.id }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${course.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "PDF gerado com sucesso!",
          description: "O curso completo foi baixado em formato PDF.",
        });
      } else {
        throw new Error('Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF do curso. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateActivitiesPDF = async () => {
    if (!course) return;
    
    setIsGeneratingActivitiesPDF(true);
    try {
      const response = await fetch('/api/generate/activities-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId: course.id }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${course.title}_Atividades.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "PDF de atividades gerado!",
          description: "Todas as atividades e questões foram compiladas em PDF.",
        });
      } else {
        throw new Error('Erro ao gerar PDF de atividades');
      }
    } catch (error) {
      console.error('Error generating activities PDF:', error);
      toast({
        title: "Erro ao gerar PDF de atividades",
        description: "Não foi possível gerar o PDF das atividades. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingActivitiesPDF(false);
    }
  };

  // Calculate statistics
  const totalModules = course?.modules?.length || 0;
  const totalLessons = course?.modules?.reduce((sum, module) => 
    sum + (module.content?.lessons?.length || 0), 0) || 0;
  const totalQuestions = course?.modules?.reduce((sum, module) => 
    sum + (module.content?.lessons?.reduce((lessonSum: number, lesson: any) => 
      lessonSum + (lesson.detailedContent?.assessmentQuestions?.length || 0) +
      (lesson.detailedContent?.practicalExercises?.reduce((exerciseSum: number, exercise: any) => 
        exerciseSum + (exercise.questions?.length || 0), 0) || 0), 0) || 0), 0) || 0;

  const lessonsWithContent = course?.modules?.reduce((sum, module) => 
    sum + (module.content?.lessons?.filter((lesson: any) => lesson.detailedContent)?.length || 0), 0) || 0;
  
  const completionPercentage = totalLessons > 0 ? Math.round((lessonsWithContent / totalLessons) * 100) : 0;

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-gray-500">Nenhum curso encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={5}
          title="Fase 5: Revisão e Exportação" 
          description="Revise o curso completo e exporte para PDF"
          onNext={handleNextPhase}
        />
        
        {/* Course Summary */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Book className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Módulos</p>
                    <p className="text-2xl font-bold text-blue-600">{totalModules}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Aulas</p>
                    <p className="text-2xl font-bold text-green-600">{totalLessons}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Questões</p>
                    <p className="text-2xl font-bold text-purple-600">{totalQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Progresso</p>
                    <p className="text-2xl font-bold text-orange-600">{completionPercentage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Book className="h-5 w-5" />
              <span>Detalhes do Curso</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Título</p>
                <p className="text-lg">{course.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tema</p>
                <p className="text-lg">{course.theme}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Carga Horária</p>
                <p className="text-lg">{course.estimatedHours} horas</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Formato</p>
                <p className="text-lg">{course.format}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Curso Completo</span>
              </CardTitle>
              <CardDescription>
                Baixe o curso completo com todo o conteúdo das aulas, objetivos e materiais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">📖 Conteúdo das Aulas</Badge>
                  <Badge variant="outline">🎯 Objetivos</Badge>
                  <Badge variant="outline">📚 Materiais</Badge>
                  <Badge variant="outline">⏰ Cronograma</Badge>
                </div>
                <Button 
                  onClick={generateCoursePDF}
                  disabled={isGeneratingPDF}
                  className="w-full"
                >
                  {isGeneratingPDF ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Gerando PDF...
                    </span>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Curso Completo (PDF)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5" />
                <span>Atividades e Avaliações</span>
              </CardTitle>
              <CardDescription>
                Baixe apenas as atividades e questões de avaliação para aplicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">❓ {totalQuestions} Questões</Badge>
                  <Badge variant="outline">⚡ Atividades Práticas</Badge>
                  <Badge variant="outline">✅ Respostas</Badge>
                  <Badge variant="outline">📝 Explicações</Badge>
                </div>
                <Button 
                  onClick={generateActivitiesPDF}
                  disabled={isGeneratingActivitiesPDF}
                  className="w-full"
                  variant="outline"
                >
                  {isGeneratingActivitiesPDF ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-gray-600 rounded-full"></span>
                      Gerando PDF...
                    </span>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Atividades (PDF)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral dos Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {course.modules.map((module, index) => {
                const moduleQuestions = module.content?.lessons?.reduce((sum: number, lesson: any) => 
                  sum + (lesson.detailedContent?.assessmentQuestions?.length || 0) +
                  (lesson.detailedContent?.practicalExercises?.reduce((exerciseSum: number, exercise: any) => 
                    exerciseSum + (exercise.questions?.length || 0), 0) || 0), 0) || 0;
                
                const moduleLessons = module.content?.lessons?.length || 0;
                const lessonsWithContent = module.content?.lessons?.filter((lesson: any) => lesson.detailedContent)?.length || 0;
                
                return (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{index + 1}. {module.title}</h4>
                      <Badge 
                        variant={lessonsWithContent === moduleLessons ? "default" : "outline"}
                        className={lessonsWithContent === moduleLessons ? "bg-green-100 text-green-800" : ""}
                      >
                        {lessonsWithContent}/{moduleLessons} aulas
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {moduleLessons} aulas
                      </span>
                      <span className="flex items-center">
                        <ClipboardList className="h-4 w-4 mr-1" />
                        {moduleQuestions} questões
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {Math.round((lessonsWithContent / moduleLessons) * 100)}% completo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <Button 
            onClick={handleNextPhase}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Finalizar Curso
          </Button>
        </div>
      </div>
    </div>
  );
}