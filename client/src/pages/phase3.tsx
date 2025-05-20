import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Checkbox
} from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Slider 
} from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import AISettings from "@/components/shared/AISettings";
import ModuleCard from "@/components/shared/ModuleCard";
import { useCourse } from "@/context/CourseContext";
import { ContentType } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Phase3() {
  const [_, navigate] = useLocation();
  const { course, updateAIConfig, moveToNextPhase } = useCourse();
  const [contentTypes, setContentTypes] = useState<ContentType[]>(
    course?.aiConfig.contentTypes || ["text", "video", "quiz"]
  );
  const [difficultyLevel, setDifficultyLevel] = useState(
    course?.aiConfig.difficultyLevel || "Intermediate"
  );
  const [contentDensity, setContentDensity] = useState(
    course?.aiConfig.contentDensity || 3
  );
  const [teachingApproach, setTeachingApproach] = useState(
    course?.aiConfig.teachingApproach || "Balanced"
  );

  const generateAllContent = useMutation({
    mutationFn: async () => {
      if (!course || !course.modules || course.modules.length === 0) {
        throw new Error("Não há módulos para gerar conteúdo");
      }
      
      // Log para debug
      console.log("Enviando dados para geração de conteúdo:", {
        courseId: course.id,
        moduleCount: course.modules.length,
        aiConfig: course.aiConfig
      });
      
      const response = await apiRequest("POST", "/api/generate/all-content", {
        courseId: course.id,
        modules: course.modules,
        courseDetails: {
          title: course.title,
          theme: course.theme,
          estimatedHours: course.estimatedHours,
          format: course.format,
          platform: course.platform,
          deliveryFormat: course.deliveryFormat,
          ...course.phaseData?.phase1
        },
        aiConfig: course.aiConfig
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Conteúdo gerado com sucesso:", data);
    },
    onError: (error) => {
      console.error("Erro ao gerar conteúdo:", error);
    }
  });

  const handleContentTypeChange = (type: ContentType, checked: boolean) => {
    if (checked) {
      setContentTypes([...contentTypes, type]);
      updateAIConfig({ contentTypes: [...contentTypes, type] });
    } else {
      const updated = contentTypes.filter(t => t !== type);
      setContentTypes(updated);
      updateAIConfig({ contentTypes: updated });
    }
  };

  const handleDifficultyChange = (value: string) => {
    setDifficultyLevel(value);
    updateAIConfig({ difficultyLevel: value });
  };

  const handleContentDensityChange = (value: number[]) => {
    setContentDensity(value[0]);
    updateAIConfig({ contentDensity: value[0] });
  };

  const handleTeachingApproachChange = (value: string) => {
    setTeachingApproach(value);
    updateAIConfig({ teachingApproach: value });
  };

  const handleGenerateAll = () => {
    generateAllContent.mutate();
  };

  const handleNextPhase = () => {
    moveToNextPhase();
    navigate("/phase4");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={3}
          title="Phase 3: Content Creation" 
          description="Generate educational content for each module based on the structure"
          onNext={handleNextPhase}
        />

        <AISettings />

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-medium text-neutral-800">Module Content</h3>
            <Button 
              variant="secondary" 
              onClick={handleGenerateAll}
              disabled={generateAllContent.isPending || !course?.modules.length}
              className="flex items-center"
            >
              <span className="material-icons text-sm mr-1">bolt</span>
              {generateAllContent.isPending ? "Generating..." : "Generate All Modules"}
            </Button>
          </div>

          {course?.modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}

          {(!course?.modules || course.modules.length === 0) && (
            <div className="text-center p-8 border border-dashed border-neutral-300 rounded-md">
              <p className="text-neutral-600">No modules available. Return to Phase 2 to create modules first.</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/phase2")}
                className="mt-4"
              >
                Go to Module Structure
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6 border border-neutral-200 rounded-md p-4">
          <h3 className="text-lg font-heading font-medium mb-4 text-neutral-800">Advanced Content Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Content Types</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="text" 
                    checked={contentTypes.includes("text")} 
                    onCheckedChange={(checked) => handleContentTypeChange("text", checked as boolean)}
                  />
                  <Label htmlFor="text" className="text-sm text-neutral-700">Text materials</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="video" 
                    checked={contentTypes.includes("video")} 
                    onCheckedChange={(checked) => handleContentTypeChange("video", checked as boolean)}
                  />
                  <Label htmlFor="video" className="text-sm text-neutral-700">Video scripts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="quiz" 
                    checked={contentTypes.includes("quiz")} 
                    onCheckedChange={(checked) => handleContentTypeChange("quiz", checked as boolean)}
                  />
                  <Label htmlFor="quiz" className="text-sm text-neutral-700">Quizzes and assessments</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="exercise" 
                    checked={contentTypes.includes("exercise")} 
                    onCheckedChange={(checked) => handleContentTypeChange("exercise", checked as boolean)}
                  />
                  <Label htmlFor="exercise" className="text-sm text-neutral-700">Interactive exercises</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="case" 
                    checked={contentTypes.includes("case")} 
                    onCheckedChange={(checked) => handleContentTypeChange("case", checked as boolean)}
                  />
                  <Label htmlFor="case" className="text-sm text-neutral-700">Case studies</Label>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Content Customization</h4>
              <div className="space-y-3">
                <div>
                  <Label className="block text-sm font-medium text-neutral-700 mb-1">Difficulty Level</Label>
                  <Select 
                    value={difficultyLevel} 
                    onValueChange={handleDifficultyChange}
                  >
                    <SelectTrigger className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-neutral-700 mb-1">Content Density</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-500">Concise</span>
                    <Slider 
                      value={[contentDensity]} 
                      onValueChange={handleContentDensityChange} 
                      min={1} 
                      max={5} 
                      step={1}
                      className="w-full"
                    />
                    <span className="text-xs text-neutral-500">Detailed</span>
                  </div>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-neutral-700 mb-1">Teaching Approach</Label>
                  <Select 
                    value={teachingApproach} 
                    onValueChange={handleTeachingApproachChange}
                  >
                    <SelectTrigger className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conceptual">Conceptual</SelectItem>
                      <SelectItem value="Balanced">Balanced</SelectItem>
                      <SelectItem value="Practical">Practical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <Button variant="outline">
            Save Draft
          </Button>
          <Button variant="outline">
            Preview
          </Button>
          <Button onClick={handleNextPhase}>
            Continue to Phase 4
          </Button>
        </div>
      </div>
    </div>
  );
}
