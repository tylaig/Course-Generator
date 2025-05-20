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
      const response = await apiRequest("POST", "/api/courses", {
        title: "New Course",
        theme: "General Education",
        estimatedHours: 10,
        format: "Online",
        platform: "Web",
        deliveryFormat: "Self-paced",
        currentPhase: 1,
        modules: [],
        aiConfig: {
          model: "gpt-4o",
          optimization: "balanced",
          languageStyle: "professional",
          difficultyLevel: "intermediate",
          contentDensity: 0.7,
          teachingApproach: "practical",
          contentTypes: ["text", "video", "quiz"]
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentCourseId(data.id);
      localStorage.setItem('currentCourseId', data.id);
      navigate("/phase1");
      
      toast({
        title: "Course Created",
        description: "New course has been created successfully.",
      });
    }
  });
  
  const handleCreateNewCourse = () => {
    createCourseMutation.mutate();
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
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Create complete educational courses with AI-powered content generation
          </p>
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
