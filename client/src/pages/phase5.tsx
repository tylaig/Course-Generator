import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Phase5() {
  const [_, navigate] = useLocation();
  const { course, updatePhaseData } = useCourse();
  const [reviewNotes, setReviewNotes] = useState<string>(
    course?.phaseData?.phase5?.reviewNotes || ""
  );
  const { toast } = useToast();

  const reviewCourse = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate/review", {
        courseId: course?.id,
        reviewNotes
      });
      return response.json();
    },
    onSuccess: (data) => {
      updatePhaseData(5, {
        ...course?.phaseData?.phase5,
        aiReview: data,
        reviewNotes,
        completed: true
      });
      
      toast({
        title: "Course Review Complete",
        description: "Your course has been reviewed successfully.",
      });
    }
  });

  const exportCourse = useMutation({
    mutationFn: async (format: 'json' | 'csv' = 'json') => {
      const response = await apiRequest("GET", `/api/export/course/${course?.id}?format=${format}`, {});
      return response;
    },
    onSuccess: (response) => {
      toast({
        title: "Course Exported",
        description: "Your course has been exported successfully.",
      });
      
      // In a real application, handle file download here
      // For example:
      // response.blob().then(blob => {
      //   const url = window.URL.createObjectURL(blob);
      //   const a = document.createElement('a');
      //   a.href = url;
      //   a.download = `course_${course?.id}.${format}`;
      //   a.click();
      // });
    }
  });

  const handleSaveReviewNotes = () => {
    updatePhaseData(5, {
      ...course?.phaseData?.phase5,
      reviewNotes
    });
    
    toast({
      title: "Review Notes Saved",
      description: "Your review notes have been saved.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={5}
          title="Phase 5: Review & Finalization" 
          description="Review, refine and finalize your course content"
        />

        <div className="mb-8">
          <h3 className="text-lg font-heading font-medium text-neutral-800 mb-4">Course Overview</h3>
          
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{course?.title || "Untitled Course"}</CardTitle>
              <CardDescription>
                {course?.theme || "No theme specified"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Total Modules</h4>
                  <p className="text-2xl font-semibold text-primary">{course?.modules.length || 0}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Estimated Hours</h4>
                  <p className="text-2xl font-semibold text-primary">{course?.estimatedHours || 0}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Format</h4>
                  <p className="text-lg font-medium">{course?.format || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Platform</h4>
                  <p className="text-lg font-medium">{course?.platform || "Not specified"}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Module Completion Status</h4>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ 
                      width: `${course ? 
                        (course.modules.filter(m => m.status === "generated" || m.status === "approved").length / 
                        Math.max(course.modules.length, 1)) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>0%</span>
                  <span>
                    {course ? 
                      Math.round((course.modules.filter(m => m.status === "generated" || m.status === "approved").length / 
                      Math.max(course.modules.length, 1)) * 100) : 0}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="modules">
            <TabsList className="mb-4">
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="reviewer">Review Assistant</TabsTrigger>
            </TabsList>
            
            <TabsContent value="modules">
              <div className="space-y-4">
                {course?.modules.map(module => (
                  <Card key={module.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">{module.title}</CardTitle>
                        <span className={`text-xs px-2 py-1 rounded ${
                          module.status === "approved" 
                            ? "bg-green-100 text-green-800" 
                            : module.status === "generated" 
                            ? "bg-blue-100 text-blue-800"
                            : "bg-neutral-100"
                        }`}>
                          {module.status === "approved" ? "Approved" : 
                           module.status === "generated" ? "Generated" : 
                           module.status === "in_progress" ? "In Progress" : "Not Started"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-neutral-600">{module.description}</p>
                      
                      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                        <div className="flex items-center">
                          <span className="material-icons text-xs mr-1">schedule</span>
                          <span>{module.estimatedHours} hours</span>
                        </div>
                        {module.content && (
                          <>
                            <span>•</span>
                            <div className="flex items-center">
                              <span className="material-icons text-xs mr-1">description</span>
                              <span>Content available</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!module.content}
                          className="text-xs"
                        >
                          <span className="material-icons text-xs mr-1">visibility</span>
                          View Content
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!course?.phaseData?.phase4?.evaluations?.[module.id]}
                          className="text-xs"
                        >
                          <span className="material-icons text-xs mr-1">quiz</span>
                          View Evaluation
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
                
                {(!course?.modules || course.modules.length === 0) && (
                  <div className="text-center p-6 border border-dashed border-neutral-300 rounded-md">
                    <p className="text-neutral-600">No modules available. Return to Phase 2 to create modules.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="evaluation">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evaluation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {course?.phaseData?.phase4?.evaluations ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Module Evaluations</h4>
                          <p className="text-2xl font-semibold text-primary">
                            {Object.keys(course.phaseData.phase4.evaluations).length} / {course.modules.length}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Final Evaluation</h4>
                          <p className="text-lg font-medium">
                            {course.phaseData.phase4.courseEvaluation ? "Created" : "Not created"}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline"
                        onClick={() => navigate("/phase4")}
                      >
                        View & Edit Evaluations
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="material-icons text-4xl text-neutral-300 mb-2">assessment</span>
                      <p className="text-neutral-600">No evaluations have been created yet.</p>
                      <Button 
                        className="mt-4"
                        onClick={() => navigate("/phase4")}
                      >
                        Go to Evaluation Phase
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviewer">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Notes</CardTitle>
                    <CardDescription>
                      Add your notes for the AI reviewer to consider
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Add any notes or specific aspects you want the AI to focus on during review..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="min-h-32"
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={handleSaveReviewNotes}
                    >
                      Save Notes
                    </Button>
                    <Button 
                      onClick={() => reviewCourse.mutate()}
                      disabled={reviewCourse.isPending}
                    >
                      <span className="material-icons text-sm mr-1">rate_review</span>
                      {reviewCourse.isPending ? "Reviewing..." : "Generate AI Review"}
                    </Button>
                  </CardFooter>
                </Card>
                
                {course?.phaseData?.phase5?.aiReview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Review Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none text-sm">
                        <div dangerouslySetInnerHTML={{ 
                          __html: typeof course.phaseData.phase5.aiReview === "string" 
                            ? course.phaseData.phase5.aiReview.replace(/\n/g, '<br />') 
                            : JSON.stringify(course.phaseData.phase5.aiReview, null, 2)
                        }} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            <span className="material-icons text-sm mr-1">home</span>
            Return to Home
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => exportCourse.mutate('json')}
              disabled={exportCourse.isPending}
            >
              <span className="material-icons text-sm mr-1">code</span>
              {exportCourse.isPending ? "Exporting..." : "Export as JSON"}
            </Button>
            <Button 
              onClick={() => exportCourse.mutate('csv')}
              disabled={exportCourse.isPending}
            >
              <span className="material-icons text-sm mr-1">file_download</span>
              {exportCourse.isPending ? "Exporting..." : "Export as CSV"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
