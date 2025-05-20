import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCourse } from "@/context/CourseContext";
import { CourseStorage } from "@/lib/storage";
import { Course } from "@/types";

export default function CourseList() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { course, createNewCourse, loadCourse } = useCourse();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar lista de cursos do armazenamento local
  useEffect(() => {
    const loadCoursesFromStorage = () => {
      try {
        // Obter todos os IDs de cursos do localStorage
        const allKeys = Object.keys(localStorage);
        const courseKeys = allKeys.filter(key => key.startsWith('course_'));
        
        // Carregar cada curso
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
      } finally {
        setLoading(false);
      }
    };
    
    loadCoursesFromStorage();
  }, [toast]);

  // Tentar carregar cursos do servidor
  const { isLoading: isLoadingFromServer } = useQuery({
    queryKey: ['/api/courses'],
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setCourses(data as Course[]);
      }
    },
    onError: (error) => {
      console.error("Erro ao carregar cursos do servidor:", error);
      // Já temos os cursos do localStorage, então não precisamos mostrar erro
    }
  });

  // Criar novo curso
  const handleCreateNewCourse = () => {
    if (createNewCourse) {
      try {
        const newCourseData = createNewCourse();
        toast({
          title: "Curso Criado",
          description: "Um novo curso foi criado com sucesso!"
        });
        navigate("/phase1");
      } catch (error) {
        console.error("Erro ao criar curso:", error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o curso. Tente novamente.",
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

  // Excluir um curso
  const handleDeleteCourse = (courseId: string) => {
    try {
      // Remover do localStorage
      localStorage.removeItem(courseId);
      
      // Atualizar a lista
      setCourses(prev => prev.filter(c => c.id !== courseId));
      
      toast({
        title: "Curso Excluído",
        description: "O curso foi removido com sucesso."
      });
    } catch (error) {
      console.error("Erro ao excluir curso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o curso.",
        variant: "destructive"
      });
    }
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteCourse(c.id)}
                >
                  <span className="material-icons text-sm mr-1">delete</span>
                  Excluir
                </Button>
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