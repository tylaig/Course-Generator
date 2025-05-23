import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Course, CourseModule } from "@/types";
import { CourseStorage } from "@/lib/storage";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function LMSView() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    localStorage.getItem('currentCourseId')
  );
  const [availableCourses, setAvailableCourses] = useState<{id: string, title: string}[]>([]);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  
  // Fetch all available courses from local storage
  useEffect(() => {
    try {
      // Get all storage keys that start with "course_"
      const keys = Object.keys(localStorage).filter(key => key.startsWith("course_"));
      const courses = keys.map(key => {
        try {
          const courseData = JSON.parse(localStorage.getItem(key) || "{}");
          return {
            id: key.replace("course_", ""),
            title: courseData?.title || "Untitled Course"
          };
        } catch (e) {
          console.warn("Failed to parse course data for key:", key);
          return null;
        }
      }).filter(Boolean);
      
      setAvailableCourses(courses as {id: string, title: string}[]);
    } catch (error) {
      console.error("Error loading courses:", error);
      setAvailableCourses([]);
    }
  }, []);
  
  // Fetch current course data from local storage
  const { data: course, isLoading, refetch } = useQuery({
    queryKey: ['/api/courses', currentCourseId],
    queryFn: async () => {
      if (!currentCourseId) return null;
      try {
        // Try to get data from API first
        try {
          const response = await apiRequest("GET", `/api/courses/${currentCourseId}`, {});
          if (response.ok) {
            const data = await response.json();
            return data as Course;
          }
        } catch (apiError) {
          console.log("API request failed, falling back to localStorage:", apiError);
        }
        
        // If API fails, use localStorage data
        console.log("Loading course from localStorage");
        const courseData = CourseStorage.getCourse(currentCourseId);
        if (courseData) {
          return courseData as Course;
        } else {
          throw new Error("Course not found in localStorage");
        }
      } catch (error) {
        console.error("Error fetching course:", error);
        return null;
      }
    },
    enabled: !!currentCourseId,
  });
  
  // Handle course selection change
  const handleCourseChange = (courseId: string) => {
    localStorage.setItem('currentCourseId', courseId);
    setCurrentCourseId(courseId);
    refetch();
  };
  
  // Generate image for a module
  const generateImageMutation = useMutation({
    mutationFn: async ({ moduleId, courseId }: { moduleId: string, courseId: string }) => {
      if (!courseId) throw new Error("No course ID found");
      
      setImageGenerationError(null);
      
      try {
        const response = await apiRequest(
          "POST", 
          "/api/generate/module-image", 
          { 
            moduleId,
            courseId
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to generate image");
        }
        
        return response.json();
      } catch (error) {
        setImageGenerationError(error.message || "An error occurred during image generation");
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', currentCourseId] });
      refetch();
      
      toast({
        title: "Imagem Gerada",
        description: "A imagem do módulo foi gerada com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Falha na Geração de Imagem",
        description: error.message || "Não foi possível gerar a imagem do módulo.",
        variant: "destructive"
      });
    }
  });
  
  const handleGenerateAllImages = async () => {
    if (!course || !course.modules?.length) return;
    
    toast({
      title: "Gerando Imagens",
      description: "Iniciando geração de todas as imagens de módulos...",
    });
    
    try {
      const response = await apiRequest(
        "POST", 
        "/api/generate/all-module-images", 
        { courseId: currentCourseId }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate images");
      }
      
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/courses', currentCourseId] });
      refetch();
      
      toast({
        title: "Imagens Geradas",
        description: `${data.generatedCount} imagens de módulos foram geradas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Falha na Geração de Imagens",
        description: error.message || "Ocorreu um erro ao gerar as imagens dos módulos.",
        variant: "destructive"
      });
    }
  };
  
  // Status badge helper
  const getStatusBadge = (status: CourseModule["status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>;
      case "generated":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Gerado</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Em Progresso</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Não Iniciado</Badge>;
    }
  };
  
  // If no course data is available yet
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando dados do curso...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-64">
              <Select
                value={currentCourseId || ""}
                onValueChange={handleCourseChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.length === 0 ? (
                    <SelectItem value="no-courses" disabled>
                      No courses available
                    </SelectItem>
                  ) : (
                    availableCourses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {course && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{course.title || "Untitled Course"}</h1>
                <p className="text-gray-600 mt-1">{course.theme}</p>
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Dashboard
            </Button>
            {course && (
              <Button 
                onClick={handleGenerateAllImages}
                disabled={!course.modules?.length}
              >
                Generate All Images
              </Button>
            )}
          </div>
        </div>
        
        {course && (
          <div className="flex items-center mt-6 text-sm text-gray-600">
            <div className="flex items-center mr-6">
              <span className="material-icons text-gray-400 mr-1 text-base">schedule</span>
              <span>{course.estimatedHours} hours</span>
            </div>
            <div className="flex items-center mr-6">
              <span className="material-icons text-gray-400 mr-1 text-base">view_module</span>
              <span>{course.modules?.length || 0} modules</span>
            </div>
            <div className="flex items-center mr-6">
              <span className="material-icons text-gray-400 mr-1 text-base">laptop</span>
              <span>{course.platform}</span>
            </div>
            <div className="flex items-center">
              <span className="material-icons text-gray-400 mr-1 text-base">school</span>
              <span>{course.format}</span>
            </div>
          </div>
        )}
      </div>
      
      {!course && currentCourseId && (
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-8">The selected course could not be found. Please select another course or create a new one.</p>
          <Button onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </div>
      )}
      
      {!currentCourseId && (
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold mb-4">No Active Course</h1>
          <p className="text-gray-600 mb-8">You don't have any active course. Select an existing course or create a new one.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {availableCourses.length > 0 ? (
              <Select onValueChange={handleCourseChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Button onClick={() => navigate("/phase1")}>
                Create New Course
              </Button>
            )}
            <Button onClick={() => navigate("/")}>
              Go to Home
            </Button>
          </div>
        </div>
      )}
      
      {course && (
        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="info">Course Information</TabsTrigger>
            <TabsTrigger value="settings">AI Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {course.modules.map((module) => (
                <Card key={module.id} className="overflow-hidden transition-all hover:shadow-md">
                  <div className="relative aspect-video bg-gray-100">
                    {module.imageUrl ? (
                      <img 
                        src={module.imageUrl} 
                        alt={module.title} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center p-4">
                          <span className="material-icons text-4xl text-gray-300 mb-2">image</span>
                          <p className="text-sm text-gray-500">Nenhuma imagem gerada</p>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="mt-2" 
                                variant="outline"
                                disabled={generateImageMutation.isPending}
                              >
                                {generateImageMutation.isPending ? "Gerando..." : "Gerar Imagem"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Gerar Imagem do Módulo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você está prestes a gerar uma imagem para o módulo "{module.title}". 
                                  Este processo utiliza créditos de API da OpenAI. Deseja continuar?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => 
                                    generateImageMutation.mutate({ 
                                      moduleId: module.id,
                                      courseId: currentCourseId!
                                    })
                                  }
                                >
                                  Gerar Imagem
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          {imageGenerationError && (
                            <p className="text-xs text-red-500 mt-2">{imageGenerationError}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(module.status)}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-medium">{module.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-1 text-sm text-gray-500">
                      {module.estimatedHours} horas • Módulo {module.order}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                    
                    {module.content && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {module.content.text && (
                          <div className="bg-gray-50 p-2 rounded text-xs text-center">
                            <span className="material-icons text-gray-400 text-sm">description</span>
                            <p>Texto</p>
                          </div>
                        )}
                        {module.content.videoScript && (
                          <div className="bg-gray-50 p-2 rounded text-xs text-center">
                            <span className="material-icons text-gray-400 text-sm">videocam</span>
                            <p>Script de Vídeo</p>
                          </div>
                        )}
                        {module.content.activities && module.content.activities.length > 0 && (
                          <div className="bg-gray-50 p-2 rounded text-xs text-center">
                            <span className="material-icons text-gray-400 text-sm">quiz</span>
                            <p>{module.content.activities.length} Atividades</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-0">
                    <div className="flex space-x-2 w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          navigate(`/phase${course.currentPhase}`);
                        }}
                      >
                        <span className="material-icons text-xs mr-1">visibility</span>
                        Ver Conteúdo
                      </Button>
                      
                      {module.imageUrl && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={generateImageMutation.isPending}
                            >
                              <span className="material-icons text-xs">refresh</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Atualizar Imagem</AlertDialogTitle>
                              <AlertDialogDescription>
                                Você deseja gerar uma nova imagem para este módulo? A imagem atual será substituída.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => 
                                  generateImageMutation.mutate({ 
                                    moduleId: module.id,
                                    courseId: currentCourseId!
                                  })
                                }
                              >
                                Atualizar Imagem
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
              
              {course.modules.length === 0 && (
                <div className="col-span-3 flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <span className="material-icons text-4xl text-gray-300 mb-2">apps</span>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum Módulo Criado</h3>
                    <p className="text-gray-500 mb-4">Vá para a Fase 2 para criar os módulos do curso</p>
                    <Button onClick={() => navigate("/phase2")}>Criar Módulos</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="info">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Curso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Título</h3>
                      <p className="text-gray-900">{course.title}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Tema</h3>
                      <p className="text-gray-900">{course.theme}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Formato</h3>
                      <p className="text-gray-900">{course.format}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Plataforma</h3>
                      <p className="text-gray-900">{course.platform}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Formato de Entrega</h3>
                      <p className="text-gray-900">{course.deliveryFormat}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Carga Horária Estimada</h3>
                      <p className="text-gray-900">{course.estimatedHours} horas</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" onClick={() => navigate("/phase1")}>
                    Editar Informações do Curso
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Progresso do Curso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Fase {course.currentPhase}</span>
                        <span className="text-sm text-gray-500">Fase Atual</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${Math.min(course.currentPhase * 20, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Módulos</span>
                        <span className="text-sm text-gray-500">
                          {course.modules.filter(m => m.status === "generated" || m.status === "approved").length} / {course.modules.length} Concluídos
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${course.modules.length ? 
                              (course.modules.filter(m => m.status === "generated" || m.status === "approved").length / course.modules.length) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {course.progress && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Progresso Geral</span>
                          <span className="text-sm text-gray-500">
                            {Math.round(course.progress.overall)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-purple-600 h-2.5 rounded-full" 
                            style={{ width: `${course.progress.overall}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de IA</CardTitle>
                <CardDescription>
                  Configurações usadas para gerar o conteúdo do curso com IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Modelo</h3>
                    <p className="text-gray-900">{course.aiConfig.model}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Otimização</h3>
                    <p className="text-gray-900">{course.aiConfig.optimization}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Estilo de Linguagem</h3>
                    <p className="text-gray-900">{course.aiConfig.languageStyle}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Nível de Dificuldade</h3>
                    <p className="text-gray-900">{course.aiConfig.difficultyLevel}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Densidade de Conteúdo</h3>
                    <div className="flex items-center">
                      <div className="relative w-full max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-blue-600"
                          style={{ width: `${(course.aiConfig.contentDensity / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-gray-900">{course.aiConfig.contentDensity}/5</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Abordagem de Ensino</h3>
                    <p className="text-gray-900">{course.aiConfig.teachingApproach}</p>
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tipos de Conteúdo</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {course.aiConfig.contentTypes.map((type) => (
                        <Badge key={type} variant="secondary">
                          {type === 'text' && 'Texto'}
                          {type === 'video' && 'Vídeo'}
                          {type === 'quiz' && 'Quiz'}
                          {type === 'exercise' && 'Exercício'}
                          {type === 'case' && 'Estudo de Caso'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => navigate("/phase3")}>
                  Editar Configurações de IA
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}