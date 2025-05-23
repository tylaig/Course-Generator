import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter"; 
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Course, CourseModule } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourse } from "@/context/CourseContext";
import { CourseStorage } from "@/lib/storage";

export default function Home() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { course, createNewCourse } = useCourse();
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    localStorage.getItem('currentCourseId')
  );
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  
  // Check if there's a draft when loading the page
  useEffect(() => {
    if (course) {
      setHasDraft(true);
      console.log("Course in progress found:", course);
    } else {
      const draftId = localStorage.getItem('currentCourseId');
      if (draftId) {
        const draftCourse = CourseStorage.getCourse(draftId);
        if (draftCourse) {
          setHasDraft(true);
          console.log("Draft found in local storage:", draftCourse);
        }
      }
    }
  }, [course]);
  
  // Create new course mutation
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      // Creating a new course with values inspired by the pedagogical framework
      console.log("Starting course creation...");
      const response = await apiRequest("POST", "/api/courses", {
        title: "New Educational Course",
        theme: "Education and Learning",
        estimatedHours: 20,
        format: "Online",
        platform: "Web",
        deliveryFormat: "Self-paced",
        currentPhase: 1,
        modules: [],
        aiConfig: {
          model: "gpt-4o", // the latest OpenAI model
          optimization: "balanced",
          languageStyle: "professional",
          difficultyLevel: "intermediate",
          contentDensity: 0.7,
          teachingApproach: "practical",
          contentTypes: ["text", "video", "quiz", "exercise", "case"]
        }
      });
      
      return response;
    },
    onSuccess: async (response) => {
      // Processing the response
      const data = await response.json();
      console.log("Course created successfully:", data);
      
      // Updating local state
      setCurrentCourseId(data.id);
      localStorage.setItem('currentCourseId', data.id);
      
      if (createNewCourse) {
        createNewCourse();
      }
      
      // Notifying the user
      toast({
        title: "Course Created",
        description: "A new course has been created successfully!",
      });
      
      // Redirecting to phase 1
      navigate("/phase1");
    },
    onError: (error) => {
      console.error("Error creating course:", error);
      toast({
        title: "Error",
        description: "Could not create the course. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleCreateNewCourse = () => {
    console.log("Requesting course creation...");
    
    // Create course locally without depending on the server
    if (createNewCourse) {
      try {
        const newCourseData = createNewCourse();
        console.log("Course created locally:", newCourseData);
        
        // Notify the user
        toast({
          title: "Course Created",
          description: "A new course has been created successfully!"
        });
        
        // Redirect to phase 1
        navigate("/phase1");
      } catch (error) {
        console.error("Error creating local course:", error);
        toast({
          title: "Error",
          description: "Could not create the course. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      console.error("createNewCourse function not available");
      toast({
        title: "Error",
        description: "System unavailable. Please reload the page and try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleContinueCourse = () => {
    if (course && course.currentPhase) {
      // Se temos um curso ativo, navegue para a fase atual
      navigate(`/phase${course.currentPhase}`);
    } else {
      // Se não temos um curso ativo mas temos um ID, tente carregar do armazenamento
      const draftId = localStorage.getItem('currentCourseId');
      if (draftId) {
        const draftCourse = CourseStorage.getCourse(draftId);
        if (draftCourse && draftCourse.currentPhase) {
          if (createNewCourse) {
            // Isso vai carregar o curso existente em vez de criar um novo
            createNewCourse();
          }
          
          toast({
            title: "Curso Carregado",
            description: "Continuando seu curso em andamento."
          });
          
          navigate(`/phase${draftCourse.currentPhase}`);
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível carregar o curso em andamento. Tente criar um novo.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Nenhum Curso Encontrado",
          description: "Você não tem cursos em andamento. Crie um novo curso para começar."
        });
      }
    }
  };

  return (
    <div className="pt-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Course Creator Dashboard</h1>
        <p className="text-slate-600">
          Welcome to the educational course creation platform using Artificial Intelligence
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-7">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100 mb-6">
            <h2 className="text-xl font-semibold mb-3 text-slate-800">5-Stage Pedagogical Framework</h2>
            <p className="text-slate-600 mb-4">
              Our platform uses a structured approach for creating educational courses.
            </p>
            
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(phase => (
                <div key={phase} className="relative">
                  <div className={`h-2 rounded-full ${course && course.currentPhase >= phase ? 'bg-primary' : 'bg-slate-200'}`}></div>
                  <div className="text-xs text-center mt-1 text-slate-600">{phase}</div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
              <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
                <div className="font-medium text-sm text-slate-800 mb-1">Strategy</div>
                <div className="text-xs text-slate-500">Define objectives and target audience</div>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
                <div className="font-medium text-sm text-slate-800 mb-1">Structure</div>
                <div className="text-xs text-slate-500">Organize modules and schedule</div>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
                <div className="font-medium text-sm text-slate-800 mb-1">Content</div>
                <div className="text-xs text-slate-500">Generate educational material</div>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
                <div className="font-medium text-sm text-slate-800 mb-1">Evaluation</div>
                <div className="text-xs text-slate-500">Create activities and tests</div>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 shadow-sm">
                <div className="font-medium text-sm text-slate-800 mb-1">Review</div>
                <div className="text-xs text-slate-500">Finalize and export</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Iniciar Novo Curso</CardTitle>
                <CardDescription>
                  Crie um curso educacional completo com IA
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                    <span>Definição de metas pedagógicas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                    <span>Estruturação automática de módulos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                    <span>Geração de conteúdo didático rico</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-primary text-sm mr-2">check_circle</span>
                    <span>Criação de atividades e avaliações</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleCreateNewCourse} 
                  className="w-full"
                  disabled={createCourseMutation.isPending}
                >
                  {createCourseMutation.isPending ? (
                    <>
                      <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-current rounded-full"></span>
                      Criando...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-sm mr-2">add_circle</span>
                      Criar Novo Curso
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card className={!course ? "opacity-70" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Continuar Curso</CardTitle>
                <CardDescription>
                  Retome seu projeto em andamento
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                {course ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Curso atual:</span>
                      <span className="text-sm text-primary font-semibold">{course.title || "Sem título"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Fase atual:</span>
                      <div className="flex items-center">
                        <span className="material-icons text-primary text-sm mr-1">auto_awesome</span>
                        <span className="text-sm text-primary font-semibold">Fase {course.currentPhase}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Módulos:</span>
                      <span className="text-sm text-primary font-semibold">{course.modules.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Progresso:</span>
                      <div className="w-24 bg-slate-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" 
                          style={{ width: `${course.progress?.overall || 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Você não tem cursos em andamento. Crie um novo curso para começar.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleContinueCourse} 
                  disabled={!course}
                  variant={course ? "default" : "outline"}
                  className="w-full"
                >
                  <span className="material-icons text-sm mr-2">play_arrow</span>
                  Continuar Curso
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        <div className="lg:col-span-5">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="material-icons text-slate-700 mr-2">auto_awesome</span>
              Sobre nosso Gerador de Cursos com IA
            </h2>
            
            <div className="text-sm text-slate-600 space-y-4">
              <p>
                Nossa plataforma integra a poderosa API da OpenAI para criar cursos educacionais completos através de um processo estruturado em 5 fases.
              </p>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-medium text-slate-800 mb-2">Framework Pedagógico</h3>
                <p className="text-xs text-slate-600 mb-3">
                  Nosso modelo segue uma abordagem estruturada para garantir conteúdo educacional de alta qualidade:
                </p>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start">
                    <span className="material-icons text-emerald-500 text-xs mr-1">check</span>
                    <span>Definição de objetivos claros e mensuráveis</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-emerald-500 text-xs mr-1">check</span>
                    <span>Estruturação de módulos com carga horária balanceada</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-emerald-500 text-xs mr-1">check</span>
                    <span>Geração de conteúdo didático em múltiplos formatos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-emerald-500 text-xs mr-1">check</span>
                    <span>Desenvolvimento de avaliações alinhadas com objetivos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="material-icons text-emerald-500 text-xs mr-1">check</span>
                    <span>Revisão completa de alinhamento pedagógico</span>
                  </li>
                </ul>
              </div>
              
              <p>
                Cada fase do processo permite customização completa, incluindo ajustes no modelo de IA, densidade de conteúdo, abordagem didática e níveis de dificuldade.
              </p>
              
              <div className="mt-4">
                <h3 className="font-medium text-slate-800 mb-2">Recursos</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-blue-50 rounded text-xs text-center text-blue-700">
                    <span className="material-icons text-xs mb-1">description</span>
                    <div>Exportação JSON/CSV</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded text-xs text-center text-purple-700">
                    <span className="material-icons text-xs mb-1">image</span>
                    <div>Imagens por IA</div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded text-xs text-center text-emerald-700">
                    <span className="material-icons text-xs mb-1">school</span>
                    <div>Visualização LMS</div>
                  </div>
                  <div className="p-2 bg-amber-50 rounded text-xs text-center text-amber-700">
                    <span className="material-icons text-xs mb-1">quiz</span>
                    <div>Avaliações</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}