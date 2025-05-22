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
            detailedContent: content.content,
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
        
        {module.content.lessons.map((lesson: any, index: number) => (
          <Card key={lesson.title || index} className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{lesson.title}</CardTitle>
                  <CardDescription className="text-sm">
                    Duração: {lesson.duration || "45min"}
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-2">
                  {lesson.detailedContent ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Conteúdo Gerado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100">
                      Sem Conteúdo
                    </Badge>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => generateLessonContent.mutate({ 
                      moduleId: module.id, 
                      lessonId: lesson.title 
                    })}
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
            
            {lesson.detailedContent && (
              <CardContent className="pt-0">
                <Accordion type="single" collapsible>
                  <AccordionItem value="content">
                    <AccordionTrigger className="text-sm">
                      Ver Conteúdo Gerado
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-sm">
                            {lesson.detailedContent?.content || "Conteúdo não disponível"}
                          </pre>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            )}
          </Card>
        ))}
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