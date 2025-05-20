import { useState } from "react";
import { CourseModule } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ContentPreview from "./ContentPreview";

interface ModuleViewProps {
  module: CourseModule;
  onUpdateModule?: (moduleId: string, data: Partial<CourseModule>) => void;
}

export default function ModuleView({ module, onUpdateModule }: ModuleViewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [moduleImageUrl, setModuleImageUrl] = useState<string>(module.imageUrl || "");
  const { toast } = useToast();

  const generateImage = useMutation({
    mutationFn: async () => {
      const courseId = localStorage.getItem('currentCourseId');
      if (!courseId) throw new Error("No course ID found");
      
      const response = await apiRequest(
        "POST",
        "/api/generate/module-image", 
        { 
          moduleId: module.id,
          courseId
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      setModuleImageUrl(data.url);
      if (onUpdateModule) {
        onUpdateModule(module.id, { 
          imageUrl: data.url 
        });
      }
      
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

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="relative aspect-video bg-gray-100">
        {moduleImageUrl ? (
          <img 
            src={moduleImageUrl} 
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
                onClick={() => generateImage.mutate()}
                disabled={generateImage.isPending}
              >
                {generateImage.isPending ? "Generating..." : "Generate Image"}
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
            onClick={() => setShowPreview(true)}
            disabled={!module.content}
          >
            <span className="material-icons text-xs mr-1">visibility</span>
            View Content
          </Button>
          
          {moduleImageUrl && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => generateImage.mutate()}
              disabled={generateImage.isPending}
            >
              <span className="material-icons text-xs">refresh</span>
            </Button>
          )}
        </div>
      </CardFooter>
      
      {showPreview && (
        <ContentPreview 
          module={module}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Card>
  );
}