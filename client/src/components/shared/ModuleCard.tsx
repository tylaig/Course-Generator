import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CourseModule } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useCourse } from "@/context/CourseContext";
import ContentPreview from "./ContentPreview";

interface ModuleCardProps {
  module: CourseModule;
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const { updateModuleStatus, course } = useCourse();
  
  const generateContent = useMutation({
    mutationFn: async () => {
      updateModuleStatus(module.id, "in_progress");
      const response = await apiRequest(
        "POST", 
        "/api/generate/module-content", 
        { 
          moduleId: module.id,
          courseId: course?.id,
          aiConfig: course?.aiConfig
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      updateModuleStatus(module.id, "generated");
      queryClient.invalidateQueries({ queryKey: ['/api/modules', module.id] });
    },
    onError: () => {
      updateModuleStatus(module.id, "not_started");
    }
  });

  const regenerateContent = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        "/api/regenerate/module-content", 
        { 
          moduleId: module.id,
          courseId: course?.id,
          aiConfig: course?.aiConfig
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', module.id] });
    }
  });

  const handleGenerate = () => {
    generateContent.mutate();
  };

  const handleRegenerate = () => {
    regenerateContent.mutate();
  };

  const getStatusBadge = () => {
    switch (module.status) {
      case "generated":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="material-icons text-xs mr-1">check_circle</span>
            Generated
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <span className="material-icons text-xs mr-1">hourglass_bottom</span>
            In Progress
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <span className="material-icons text-xs mr-1">verified</span>
            Approved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
            <span className="material-icons text-xs mr-1">pending</span>
            Not Started
          </span>
        );
    }
  };

  if (module.status === "not_started") {
    return (
      <div className="mb-4 border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h4 className="font-heading font-medium text-neutral-800">{module.title}</h4>
            <p className="text-sm text-neutral-600 mt-1">{module.description}</p>
          </div>
          <div>
            {getStatusBadge()}
          </div>
        </div>

        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          <p className="text-sm text-neutral-600">Ready to generate content for this module</p>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              disabled={!course}
            >
              Edit Module Structure
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={generateContent.isPending || !course}
              className="flex items-center"
            >
              <span className="material-icons text-sm mr-1">bolt</span>
              Generate Content
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (module.status === "in_progress") {
    return (
      <div className="mb-4 border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h4 className="font-heading font-medium text-neutral-800">{module.title}</h4>
            <p className="text-sm text-neutral-600 mt-1">{module.description}</p>
          </div>
          <div>
            {getStatusBadge()}
          </div>
        </div>

        <div className="p-4 flex flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <span className="material-icons text-4xl text-neutral-300">description</span>
            <p className="text-sm text-neutral-600 mt-2">Content generation in progress</p>
          </div>
          <div className="w-full max-w-md h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "65%" }}></div>
          </div>
          <Button 
            variant="outline"
            className="bg-neutral-600 text-white hover:bg-neutral-700"
            onClick={() => {
              generateContent.reset();
              updateModuleStatus(module.id, "not_started");
            }}
          >
            <span className="material-icons text-sm mr-1">stop</span>
            Cancel Generation
          </Button>
        </div>
      </div>
    );
  }

  // For "generated" or "approved" status
  return (
    <div className="mb-4 border border-neutral-200 rounded-lg overflow-hidden">
      <div className={`p-4 ${
        module.status === "generated" ? "bg-primary-50" : "bg-blue-50"
      } border-b border-neutral-200 flex items-center justify-between`}>
        <div>
          <h4 className="font-heading font-medium text-neutral-800">{module.title}</h4>
          <p className="text-sm text-neutral-600 mt-1">{module.description}</p>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-neutral-700">Content Preview</h5>
          <div className="flex items-center space-x-2">
            <button 
              className="text-primary hover:text-primary-800"
              aria-label="Edit"
            >
              <span className="material-icons text-sm">edit</span>
            </button>
            <button 
              className="text-primary hover:text-primary-800"
              onClick={handleRegenerate}
              disabled={regenerateContent.isPending}
              aria-label="Regenerate"
            >
              <span className="material-icons text-sm">refresh</span>
            </button>
            <button 
              className="text-primary hover:text-primary-800"
              onClick={() => setShowPreview(true)}
              aria-label="View"
            >
              <span className="material-icons text-sm">visibility</span>
            </button>
          </div>
        </div>
        <div className="text-sm text-neutral-600 line-clamp-3">
          {module.content?.text ? module.content.text.substring(0, 250) + '...' : 'Content loading...'}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-neutral-700">Text Content</h5>
            <button 
              className="text-primary hover:text-primary-800"
              aria-label="Regenerate text"
            >
              <span className="material-icons text-sm">refresh</span>
            </button>
          </div>
          <p className="text-xs text-neutral-500">Comprehensive material with examples</p>
          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Generated
          </span>
        </div>
        
        <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-neutral-700">Video Script</h5>
            <button 
              className="text-primary hover:text-primary-800"
              aria-label="Regenerate video script"
            >
              <span className="material-icons text-sm">refresh</span>
            </button>
          </div>
          <p className="text-xs text-neutral-500">5-minute introduction with key concepts</p>
          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Generated
          </span>
        </div>
        
        <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-neutral-700">Activities</h5>
            <button 
              className="text-primary hover:text-primary-800"
              aria-label="Regenerate activities"
            >
              <span className="material-icons text-sm">refresh</span>
            </button>
          </div>
          <p className="text-xs text-neutral-500">Quiz with multiple-choice questions</p>
          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Generated
          </span>
        </div>
      </div>

      {showPreview && (
        <ContentPreview 
          module={module}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
