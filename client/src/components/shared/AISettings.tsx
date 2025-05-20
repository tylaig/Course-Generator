import { useState, useEffect } from "react";
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
import { 
  Label 
} from "@/components/ui/label";
import { AIConfig } from "@/types";
import { useCourse } from "@/context/CourseContext";

export default function AISettings() {
  const { course, updateAIConfig } = useCourse();
  const [config, setConfig] = useState<AIConfig>({
    model: "gpt-4o",
    optimization: "Educational Content",
    languageStyle: "Neutral and International",
    difficultyLevel: "Intermediate",
    contentDensity: 3,
    teachingApproach: "Balanced",
    contentTypes: ["text", "video", "quiz"]
  });

  useEffect(() => {
    if (course?.aiConfig) {
      setConfig(course.aiConfig);
    }
  }, [course?.aiConfig]);

  const handleConfigChange = (key: keyof AIConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updateAIConfig({ [key]: value });
  };

  return (
    <div className="mb-6 p-4 border border-neutral-200 rounded-md bg-neutral-50">
      <h3 className="text-md font-heading font-medium mb-3 text-neutral-800">AI Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="block text-sm font-medium text-neutral-700 mb-1">Model Selection</Label>
          <Select 
            value={config.model} 
            onValueChange={(value) => handleConfigChange("model", value)}
          >
            <SelectTrigger className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o (recommended)</SelectItem>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-neutral-700 mb-1">Optimization</Label>
          <Select 
            value={config.optimization} 
            onValueChange={(value) => handleConfigChange("optimization", value)}
          >
            <SelectTrigger className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
              <SelectValue placeholder="Select optimization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Educational Content">Educational Content</SelectItem>
              <SelectItem value="Technical Documentation">Technical Documentation</SelectItem>
              <SelectItem value="Creative Teaching">Creative Teaching</SelectItem>
              <SelectItem value="Simple Explanation">Simple Explanation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-neutral-700 mb-1">Language Style</Label>
          <Select 
            value={config.languageStyle} 
            onValueChange={(value) => handleConfigChange("languageStyle", value)}
          >
            <SelectTrigger className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
              <SelectValue placeholder="Select language style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Neutral and International">Neutral and International</SelectItem>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="Conversational">Conversational</SelectItem>
              <SelectItem value="Technical">Technical</SelectItem>
              <SelectItem value="Portuguese - Formal">Português - Formal</SelectItem>
              <SelectItem value="Portuguese - Informal">Português - Informal</SelectItem>
              <SelectItem value="Portuguese - Technical">Português - Técnico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
