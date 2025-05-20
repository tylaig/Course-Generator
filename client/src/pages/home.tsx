import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter"; 
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Course, CourseModule } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    localStorage.getItem('currentCourseId')
  );
  
  // Fetch course data
  const { data: course, isLoading } = useQuery({
    queryKey: ['/api/courses', currentCourseId],
    queryFn: async () => {
      if (!currentCourseId) return null;
      const response = await apiRequest("GET", `/api/courses/${currentCourseId}`, {});
      const data = await response.json();
      return data as Course;
    },
    enabled: !!currentCourseId,
  });
  
  // Create new course mutation
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      // Criando um novo curso com valores inspirados no framework pedagógico
      const response = await apiRequest("POST", "/api/courses", {
        title: "Novo Curso Educacional",
        theme: "Educação e Aprendizagem",
        estimatedHours: 20,
        format: "Online",
        platform: "Web",
        deliveryFormat: "Self-paced",
        currentPhase: 1,
        modules: [],
        aiConfig: {
          model: "gpt-4o", // o modelo mais recente da OpenAI
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
      // Processando a resposta
      const data = await response.json();
      console.log("Curso criado com sucesso:", data);
      
      // Atualizando o estado local
      setCurrentCourseId(data.id);
      localStorage.setItem('currentCourseId', data.id);
      
      // Notificando o usuário
      toast({
        title: "Curso Criado",
        description: "Um novo curso foi criado com sucesso!",
      });
      
      // Redirecionando para a fase 1
      navigate("/phase1");
    },
    onError: (error) => {
      console.error("Erro ao criar curso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o curso. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  const handleCreateNewCourse = () => {
    console.log("Creating new course...");
    try {
      createCourseMutation.mutate();
      console.log("Mutation triggered");
    } catch (error) {
      console.error("Error creating course:", error);
      toast({
        title: "Error",
        description: "Failed to create new course. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleContinueCourse = () => {
    if (course && course.currentPhase) {
      navigate(`/phase${course.currentPhase}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading font-bold text-neutral-900 mb-4">
            EduGen AI Course Creator
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-4">
            Create complete educational courses with AI-powered content generation
          </p>
          {course && (
            <Button 
              onClick={() => navigate("/lms-view")}
              variant="outline"
              className="mt-2"
            >
              <span className="material-icons text-sm mr-2">dashboard</span>
              Ver Visualização LMS
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
              <CardDescription>
                Start from scratch with a new educational course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                Follow our 5-phase process to create a comprehensive course:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-600">
                <li>Define course objectives and target audience</li>
                <li>Structure your modules and learning path</li>
                <li>Generate educational content with AI</li>
                <li>Create assessments and activities</li>
                <li>Review and finalize your course</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateNewCourse} className="w-full">
                <span className="material-icons text-sm mr-2">add_circle</span>
                Create New Course
              </Button>
            </CardFooter>
          </Card>

          <Card className={!course ? "opacity-70" : ""}>
            <CardHeader>
              <CardTitle>Continue Course</CardTitle>
              <CardDescription>
                Resume work on your existing course
              </CardDescription>
            </CardHeader>
            <CardContent>
              {course ? (
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="font-medium">Current course:</span>
                    <span className="text-primary">{course.title || "Untitled Course"}</span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="font-medium">Current phase:</span>
                    <span className="text-primary">Phase {course.currentPhase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Modules:</span>
                    <span className="text-primary">{course.modules.length}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-600">
                  You don't have any courses in progress. Create a new course to get started.
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
                Continue Course
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
