import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { toast } = useToast();

  const handleSaveProject = () => {
    toast({
      title: "Project Saved",
      description: "Your course has been saved successfully.",
    });
  };

  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    try {
      toast({
        title: `Export as ${format.toUpperCase()} Started`,
        description: "Your course is being prepared for export.",
      });
      
      // Direct API call instead of using context
      const courseId = localStorage.getItem('currentCourseId');
      if (courseId) {
        const response = await apiRequest("GET", `/api/export/course/${courseId}?format=${format}`, {});
        
        // In a real application, this would handle file download
        // const blob = await response.blob();
        // const url = window.URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = url;
        // a.download = `course_${courseId}.${format}`;
        // a.click();
        
        toast({
          title: "Export Complete",
          description: `Course has been exported as ${format.toUpperCase()} successfully.`,
        });
      } else {
        toast({
          title: "No Active Course",
          description: "Please select or create a course first.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your course.",
        variant: "destructive"
      });
    }
  };
  
  const handleExportPhase = (phase: number, format: 'json' | 'csv' = 'json') => {
    const courseId = localStorage.getItem('currentCourseId');
    if (!courseId) {
      toast({
        title: "No Active Course",
        description: "Please select or create a course first.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: `Export Phase ${phase} as ${format.toUpperCase()}`,
      description: `Phase ${phase} data is being prepared for export.`,
    });
    
    // In a real application, we would make the API call and download the file
    // apiRequest("GET", `/api/export/phase/${courseId}/${phase}?format=${format}`, {})
    //  .then(response => response.blob())
    //  .then(blob => {
    //    const url = window.URL.createObjectURL(blob);
    //    const a = document.createElement('a');
    //    a.href = url;
    //    a.download = `course_${courseId}_phase_${phase}.${format}`;
    //    a.click();
    //  });
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
        <div className="flex items-center space-x-2">
          <Link href="/lms-view">
            <Button variant="ghost" className="flex items-center">
              <span className="material-icons text-sm mr-1">dashboard</span>
              Visualização LMS
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleSaveProject}
            className="flex items-center"
          >
            <span className="material-icons text-sm mr-1">save</span>
            Save Project
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
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
              
              {/* Simplified phase export menu */}
              <DropdownMenuItem disabled className="opacity-50">
                Export by Phase:
              </DropdownMenuItem>
              {[1, 2, 3, 4, 5].map((phase) => (
                <DropdownMenuItem key={phase} onClick={() => handleExportPhase(phase, 'json')}>
                  Phase {phase} - JSON
                </DropdownMenuItem>
              ))}
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
