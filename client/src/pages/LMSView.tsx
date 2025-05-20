import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Course, CourseModule } from "@/types";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LMSView() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    localStorage.getItem('currentCourseId')
  );
  
  // Fetch current course data
  const { data: course, isLoading } = useQuery({
    queryKey: ['/api/courses', currentCourseId],
    queryFn: async () => {
      if (!currentCourseId) return null;
      try {
        const response = await apiRequest("GET", `/api/courses/${currentCourseId}`, {});
        const data = await response.json();
        return data as Course;
      } catch (error) {
        console.error("Error fetching course:", error);
        return null;
      }
    },
    enabled: !!currentCourseId,
  });
  
  // Generate image for a module
  const generateImageMutation = useMutation({
    mutationFn: async ({ moduleId }: { moduleId: string }) => {
      if (!currentCourseId) throw new Error("No course ID found");
      
      const response = await apiRequest(
        "POST", 
        "/api/generate/module-image", 
        { 
          moduleId,
          courseId: currentCourseId
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', currentCourseId] });
      toast({
        title: "Image Generated",
        description: "Module image has been generated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Image Generation Failed",
        description: "Failed to generate module image.",
        variant: "destructive"
      });
    }
  });
  
  const handleGenerateAllImages = async () => {
    if (!course || !course.modules.length) return;
    
    toast({
      title: "Generating Images",
      description: "Starting generation of all module images...",
    });
    
    try {
      const response = await apiRequest(
        "POST", 
        "/api/generate/all-module-images", 
        { courseId: currentCourseId }
      );
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/courses', currentCourseId] });
      
      toast({
        title: "Images Generated",
        description: `Generated ${data.generatedCount} module images successfully.`,
      });
    } catch (error) {
      toast({
        title: "Image Generation Failed",
        description: "There was an error generating module images.",
        variant: "destructive"
      });
    }
  };
  
  // Status badge helper
  const getStatusBadge = (status: CourseModule["status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case "generated":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Generated</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Not Started</Badge>;
    }
  };
  
  // If no course data is available yet
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading course data...</p>
        </div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold mb-4">No Active Course</h1>
          <p className="text-gray-600 mb-8">You don't have any active course. Create a new course to get started.</p>
          <Button onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title || "Untitled Course"}</h1>
            <p className="text-gray-600 mt-1">{course.theme}</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Dashboard
            </Button>
            <Button 
              onClick={handleGenerateAllImages}
              disabled={!course.modules.length}
            >
              Generate All Images
            </Button>
          </div>
        </div>
        
        <div className="flex items-center mt-6 text-sm text-gray-600">
          <div className="flex items-center mr-6">
            <span className="material-icons text-gray-400 mr-1 text-base">schedule</span>
            <span>{course.estimatedHours} hours</span>
          </div>
          <div className="flex items-center mr-6">
            <span className="material-icons text-gray-400 mr-1 text-base">view_module</span>
            <span>{course.modules.length} modules</span>
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
      </div>
      
      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="info">Course Info</TabsTrigger>
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
                        <p className="text-sm text-gray-500">No image generated</p>
                        <Button 
                          size="sm" 
                          className="mt-2" 
                          variant="outline"
                          onClick={() => generateImageMutation.mutate({ moduleId: module.id })}
                          disabled={generateImageMutation.isPending}
                        >
                          {generateImageMutation.isPending ? "Generating..." : "Generate Image"}
                        </Button>
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
                    {module.estimatedHours} hours • Module {module.order}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                  
                  {module.content && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {module.content.text && (
                        <div className="bg-gray-50 p-2 rounded text-xs text-center">
                          <span className="material-icons text-gray-400 text-sm">description</span>
                          <p>Text Content</p>
                        </div>
                      )}
                      {module.content.videoScript && (
                        <div className="bg-gray-50 p-2 rounded text-xs text-center">
                          <span className="material-icons text-gray-400 text-sm">videocam</span>
                          <p>Video Script</p>
                        </div>
                      )}
                      {module.content.activities && module.content.activities.length > 0 && (
                        <div className="bg-gray-50 p-2 rounded text-xs text-center">
                          <span className="material-icons text-gray-400 text-sm">quiz</span>
                          <p>{module.content.activities.length} Activities</p>
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
                      View Content
                    </Button>
                    
                    {module.imageUrl && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => generateImageMutation.mutate({ moduleId: module.id })}
                        disabled={generateImageMutation.isPending}
                      >
                        <span className="material-icons text-xs">refresh</span>
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
            
            {course.modules.length === 0 && (
              <div className="col-span-3 flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <span className="material-icons text-4xl text-gray-300 mb-2">apps</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Modules Created</h3>
                  <p className="text-gray-500 mb-4">Go to Phase 2 to create course modules</p>
                  <Button onClick={() => navigate("/phase2")}>Create Modules</Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="info">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Title</h3>
                    <p className="text-gray-900">{course.title}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Theme</h3>
                    <p className="text-gray-900">{course.theme}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Format</h3>
                    <p className="text-gray-900">{course.format}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Platform</h3>
                    <p className="text-gray-900">{course.platform}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Delivery Format</h3>
                    <p className="text-gray-900">{course.deliveryFormat}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Estimated Hours</h3>
                    <p className="text-gray-900">{course.estimatedHours}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => navigate("/phase1")}>
                  Edit Course Information
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Phase {course.currentPhase}</span>
                      <span className="text-sm text-gray-500">Current Phase</span>
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
                      <span className="text-sm font-medium">Modules</span>
                      <span className="text-sm text-gray-500">
                        {course.modules.filter(m => m.status === "generated" || m.status === "approved").length} / {course.modules.length} Completed
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${course.modules.length 
                            ? (course.modules.filter(m => m.status === "generated" || m.status === "approved").length / course.modules.length) * 100 
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Settings used for AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">AI Model</h3>
                  <p className="text-gray-900">{course.aiConfig?.model || "Default"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Optimization</h3>
                  <p className="text-gray-900">{course.aiConfig?.optimization || "Balanced"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Language Style</h3>
                  <p className="text-gray-900">{course.aiConfig?.languageStyle || "Professional"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Difficulty Level</h3>
                  <p className="text-gray-900">{course.aiConfig?.difficultyLevel || "Intermediate"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Teaching Approach</h3>
                  <p className="text-gray-900">{course.aiConfig?.teachingApproach || "Practical"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Content Density</h3>
                  <p className="text-gray-900">{course.aiConfig?.contentDensity || 0.7}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Content Types</h3>
                <div className="flex flex-wrap gap-2">
                  {course.aiConfig?.contentTypes?.map((type, index) => (
                    <Badge key={index} variant="secondary">{type}</Badge>
                  ))}
                  {(!course.aiConfig?.contentTypes || course.aiConfig.contentTypes.length === 0) && (
                    <span className="text-gray-500 text-sm">No content types specified</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => navigate("/phase3")}>
                Edit AI Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}