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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function Phase4() {
  const [_, navigate] = useLocation();
  const { course, moveToNextPhase, updatePhaseData } = useCourse();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [evaluationType, setEvaluationType] = useState("quiz");

  const generateEvaluation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate/evaluation", {
        courseId: course?.id,
        moduleId: selectedModule,
        evaluationType
      });
      return response.json();
    },
    onSuccess: (data) => {
      updatePhaseData(4, {
        ...course?.phaseData.phase4,
        evaluations: {
          ...(course?.phaseData?.phase4?.evaluations || {}),
          [selectedModule as string]: data
        }
      });
    }
  });

  const generateAllEvaluations = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate/all-evaluations", {
        courseId: course?.id,
        evaluationType
      });
      return response.json();
    },
    onSuccess: (data) => {
      updatePhaseData(4, {
        ...course?.phaseData.phase4,
        evaluations: data.moduleEvaluations,
        courseEvaluation: data.courseEvaluation
      });
    }
  });

  const handleNextPhase = () => {
    moveToNextPhase();
    navigate("/phase5");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={4}
          title="Phase 4: Evaluation Design" 
          description="Create assessment activities aligned with learning objectives"
          onNext={handleNextPhase}
        />

        <div className="mb-6 p-4 border border-neutral-200 rounded-md bg-neutral-50">
          <h3 className="text-md font-heading font-medium mb-3 text-neutral-800">Evaluation Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Select Module</label>
              <Select
                value={selectedModule || ""}
                onValueChange={setSelectedModule}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Entire Course</SelectItem>
                  {course?.modules.map(module => (
                    <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Evaluation Type</label>
              <Select
                value={evaluationType}
                onValueChange={setEvaluationType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Multiple Choice Quiz</SelectItem>
                  <SelectItem value="case-study">Case Study</SelectItem>
                  <SelectItem value="project">Project-Based</SelectItem>
                  <SelectItem value="peer-review">Peer Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => generateEvaluation.mutate()}
                disabled={!selectedModule || generateEvaluation.isPending}
                className="w-full"
              >
                <span className="material-icons text-sm mr-1">build</span>
                {generateEvaluation.isPending ? "Generating..." : "Create Evaluation"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-heading font-medium text-neutral-800">Evaluations</h3>
          <Button 
            variant="secondary"
            onClick={() => generateAllEvaluations.mutate()}
            disabled={generateAllEvaluations.isPending || !course?.modules.length}
            className="flex items-center"
          >
            <span className="material-icons text-sm mr-1">bolt</span>
            {generateAllEvaluations.isPending ? "Generating..." : "Generate All Evaluations"}
          </Button>
        </div>

        <Tabs defaultValue="moduleEvaluations">
          <TabsList className="mb-4">
            <TabsTrigger value="moduleEvaluations">Module Evaluations</TabsTrigger>
            <TabsTrigger value="courseEvaluation">Course Evaluation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="moduleEvaluations">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {course?.modules.map(module => {
                const hasEvaluation = course?.phaseData?.phase4?.evaluations?.[module.id];
                
                return (
                  <Card key={module.id} className={hasEvaluation ? "border-green-200" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {hasEvaluation ? "Evaluation created" : "No evaluation yet"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {hasEvaluation ? (
                        <div>
                          <div className="text-sm mb-2">
                            <span className="font-medium">Type:</span>{" "}
                            {hasEvaluation.type || "Multiple Choice Quiz"}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Questions:</span>{" "}
                            {hasEvaluation.questions?.length || 0}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-500 italic">
                          Select this module and generate an evaluation
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <div className="flex space-x-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!hasEvaluation}
                          className="flex-1"
                        >
                          <span className="material-icons text-xs mr-1">visibility</span>
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedModule(module.id);
                            generateEvaluation.mutate();
                          }}
                          disabled={generateEvaluation.isPending}
                          className="flex-1"
                        >
                          {hasEvaluation ? "Regenerate" : "Generate"}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="courseEvaluation">
            <Card>
              <CardHeader>
                <CardTitle>Final Course Evaluation</CardTitle>
                <CardDescription>
                  Comprehensive assessment covering all course content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {course?.phaseData?.phase4?.courseEvaluation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Evaluation Type</h4>
                        <p className="text-sm">{course.phaseData.phase4.courseEvaluation.type || "Comprehensive"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Total Questions</h4>
                        <p className="text-sm">{course.phaseData.phase4.courseEvaluation.questions?.length || 0}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm">{course.phaseData.phase4.courseEvaluation.description || "Final evaluation covering all course modules."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-icons text-4xl text-neutral-300 mb-2">assessment</span>
                    <p className="text-neutral-600">No course evaluation has been generated yet.</p>
                    <Button 
                      className="mt-4"
                      onClick={() => {
                        setSelectedModule("course");
                        generateEvaluation.mutate();
                      }}
                      disabled={generateEvaluation.isPending}
                    >
                      Generate Course Evaluation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <Button 
            variant="outline"
          >
            Preview Evaluations
          </Button>
          <Button 
            onClick={handleNextPhase}
          >
            Continue to Phase 5
          </Button>
        </div>
      </div>
    </div>
  );
}
