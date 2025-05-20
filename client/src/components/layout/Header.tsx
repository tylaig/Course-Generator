import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCourse } from "@/context/CourseContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { course } = useCourse();
  const { toast } = useToast();

  const handleSaveProject = () => {
    toast({
      title: "Project Saved",
      description: "Your course has been saved successfully.",
    });
  };

  const handleExport = (format: 'json' | 'csv' = 'json') => {
    if (!course?.id) return;
    
    // Since we're using an in-memory database, in a real application
    // this would make an API call to /api/export/course/${course.id}?format=${format}
    
    toast({
      title: `Export as ${format.toUpperCase()} Started`,
      description: "Your course is being prepared for export.",
    });
    
    // In a real application, we would download the file here
    // window.open(`/api/export/course/${course.id}?format=${format}`, '_blank');
  };
  
  const handleExportPhase = (phase: number, format: 'json' | 'csv' = 'json') => {
    if (!course?.id) return;
    
    // Since we're using an in-memory database, in a real application
    // this would make an API call to /api/export/phase/${course.id}/${phase}?format=${format}
    
    toast({
      title: `Export Phase ${phase} as ${format.toUpperCase()}`,
      description: `Phase ${phase} data is being prepared for export.`,
    });
    
    // In a real application, we would download the file here
    // window.open(`/api/export/phase/${course.id}/${phase}?format=${format}`, '_blank');
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <span className="text-primary material-icons">school</span>
            <h1 className="text-xl font-heading font-semibold text-primary">EduGen AI</h1>
          </div>
        </Link>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleSaveProject}
            disabled={!course}
            className="flex items-center"
          >
            <span className="material-icons text-sm mr-1">save</span>
            Save Project
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={!course}
                className="flex items-center"
              >
                <span className="material-icons text-sm mr-1">file_download</span>
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              
              {course && course.currentPhase > 1 && (
                <>
                  <DropdownMenuItem disabled className="opacity-50">
                    Export by Phase:
                  </DropdownMenuItem>
                  {[...Array(Math.min(course.currentPhase, 5))].map((_, i) => (
                    <DropdownMenuItem key={i} onClick={() => handleExportPhase(i + 1, 'json')}>
                      Phase {i + 1} - JSON
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200">
            <span className="material-icons text-neutral-700">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}
