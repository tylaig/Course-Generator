import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCourse } from "@/context/CourseContext";
import { CourseStorage } from "@/lib/storage";
import { Course } from "@/types";
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

export default function CourseList() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { course, createNewCourse, loadCourse } = useCourse();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Carregar lista de cursos do banco de dados
  useEffect(() => {
    const loadCoursesFromDatabase = async () => {
      try {
        const response = await apiRequest("GET", "/api/courses");
        const coursesData = await response.json();
        
        // Converter IDs para string para compatibilidade
        const coursesWithStringIds = coursesData.map((course: any) => ({
          ...course,
          id: course.id.toString(),
          // Adicionar dados padrão se não existirem
          progress: course.progress || {
            phase1: 0,
            phase2: 0,
            phase3: 0,
            phase4: 0,
            phase5: 0,
            overall: 0,
            lastUpdated: new Date().toISOString(),
          },
          phaseData: course.phaseData || {
            phase1: {},
            phase2: {},
          },
          aiConfig: course.aiConfig || {
            model: "gpt-4o",
            optimization: "balanced",
            languageStyle: "professional",
            difficultyLevel: "intermediate",
            contentDensity: 0.7,
            teachingApproach: "practical",
            contentTypes: ["text", "video", "quiz", "exercise", "case"],
            language: "pt-BR",
          }
        }));
        
        setCourses(coursesWithStringIds);
      } catch (error) {
        console.error("Erro ao carregar cursos do banco:", error);
        
        // Fallback para localStorage se o banco falhar
        try {
          const allKeys = Object.keys(localStorage);
          const courseKeys = allKeys.filter(key => key.startsWith('course_'));
          
          const loadedCourses = courseKeys.map(key => {
            const courseData = localStorage.getItem(key);
            if (courseData) {
              try {
                return JSON.parse(courseData) as Course;
              } catch (e) {
                console.error("Erro ao analisar dados do curso:", e);
                return null;
              }
            }
            return null;
          }).filter(c => c !== null) as Course[];
          
          setCourses(loadedCourses);
        } catch (e) {
          console.error("Erro ao carregar cursos:", e);
          toast({
            title: "Erro",
            description: "Não foi possível carregar a lista de cursos.",
            variant: "destructive"
          });
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadCoursesFromDatabase();
  }, [toast]);

  // Tentar carregar cursos do servidor
  const { isLoading: isLoadingFromServer } = useQuery({
    queryKey: ['/api/courses']
  });

  // Criar novo curso
  const handleCreateNewCourse = async () => {
    if (createNewCourse) {
      try {
        await createNewCourse();
        toast({
          title: "Curso Criado",
          description: "Um novo curso foi criado com sucesso no banco de dados!"
        });
        navigate("/phase1");
      } catch (error) {
        console.error("Erro ao criar curso:", error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o curso no banco de dados. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  // Continuar um curso existente
  const handleContinueCourse = (courseId: string) => {
    if (loadCourse) {
      try {
        loadCourse(courseId);
        const storedCourse = CourseStorage.getCourse(courseId);
        if (storedCourse && storedCourse.currentPhase) {
          toast({
            title: "Curso Carregado",
            description: "Continuando seu curso em andamento."
          });
          navigate(`/phase${storedCourse.currentPhase}`);
        }
      } catch (error) {
        console.error("Erro ao carregar curso:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o curso selecionado.",
          variant: "destructive"
        });
      }
    }
  };

  // Mutação para deletar curso
  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const numericId = parseInt(courseId);
      
      if (!isNaN(numericId)) {
        // Deletar do banco de dados
        await apiRequest("DELETE", `/api/courses/${numericId}`);
      }
      
      // Remover do localStorage também
      localStorage.removeItem(`course_${courseId}`);
      CourseStorage.clearCourseData(courseId);
      
      return courseId;
    },
    onSuccess: (deletedCourseId) => {
      // Atualizar a lista local
      setCourses(prev => prev.filter(c => c.id !== deletedCourseId));
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      
      toast({
        title: "Curso Excluído",
        description: "O curso foi removido com sucesso."
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir curso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o curso. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteCourse = (courseId: string) => {
    deleteCourse.mutate(courseId);
  };

  // Formatador de data
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Meus Cursos</h1>
          <p className="text-slate-600">
            Visualize, edite e gerencie todos os seus cursos educacionais
          </p>
        </div>
        <Button onClick={handleCreateNewCourse}>
          <span className="material-icons text-sm mr-2">add_circle</span>
          Criar Novo Curso
        </Button>
      </div>

      {loading || isLoadingFromServer ? (
        <div className="text-center py-10">
          <span className="material-icons text-5xl text-primary/30 mb-4">autorenew</span>
          <p className="text-slate-500">Carregando cursos...</p>
        </div>
      ) : courses.length === 0 ? (
        <Card className="bg-neutral-50 border-dashed border-2 border-neutral-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <span className="material-icons text-5xl text-neutral-300 mb-4">school</span>
            <h3 className="text-xl font-medium text-neutral-600 mb-2">Nenhum Curso Encontrado</h3>
            <p className="text-neutral-500 text-center max-w-md mb-6">
              Você ainda não criou nenhum curso. Comece agora criando seu primeiro curso educacional!
            </p>
            <Button onClick={handleCreateNewCourse}>
              <span className="material-icons text-sm mr-2">add_circle</span>
              Criar Meu Primeiro Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div 
                className="h-3 w-full bg-primary/10"
                style={{ 
                  background: `linear-gradient(to right, var(--primary) ${c.progress?.overall || 0}%, var(--background) 0%)` 
                }}
              ></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg line-clamp-1">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{c.theme}</CardDescription>
                  </div>
                  <span className="material-icons text-primary">school</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Formato:</span>
                    <p className="font-medium">{c.format}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Plataforma:</span>
                    <p className="font-medium">{c.platform}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Carga Horária:</span>
                    <p className="font-medium">{c.estimatedHours}h</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Fase Atual:</span>
                    <p className="font-medium">Fase {c.currentPhase}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500 text-sm">Progresso:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${c.progress?.overall || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{c.progress?.overall || 0}%</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={deleteCourse.isPending}
                    >
                      <span className="material-icons text-sm mr-1">delete</span>
                      {deleteCourse.isPending ? "Excluindo..." : "Excluir"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o curso "{c.title}"? 
                        Esta ação não pode ser desfeita e todos os dados do curso serão perdidos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteCourse(c.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir Curso
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button 
                  size="sm"
                  onClick={() => handleContinueCourse(c.id)}
                >
                  <span className="material-icons text-sm mr-1">edit</span>
                  Continuar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}