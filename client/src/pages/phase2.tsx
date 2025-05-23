import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  type DropResult 
} from "react-beautiful-dnd";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { CourseModule } from "@/types";

export default function Phase2() {
  const [_, navigate] = useLocation();
  const { course, updatePhaseData, updateModules, moveToNextPhase, updateProgress } = useCourse();
  const { toast } = useToast();
  
  // Configuration states
  const [moduleCount, setModuleCount] = useState(6);
  const [lessonsPerModule, setLessonsPerModule] = useState([5]); // Array for the Slider
  const [configurationsSaved, setConfigurationsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // States for modules and competencies
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [competenciesMap, setCompetenciesMap] = useState<Record<string, string[]>>({});

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Derived states
  const showModules = configurationsSaved;
  const showCompetencyMapping = modules.length > 0;

  // Load existing data
  useEffect(() => {
    if (course?.modules && course.modules.length > 0) {
      setModules(course.modules);
    }
    
    if (course?.phaseData?.phase2?.moduleCount) {
      setModuleCount(course.phaseData.phase2.moduleCount);
    }
    
    if (course?.phaseData?.phase2?.lessonsPerModule) {
      setLessonsPerModule([course.phaseData.phase2.lessonsPerModule]);
    }

    if (course?.phaseData?.phase2?.configurationsSaved) {
      setConfigurationsSaved(true);
    }
  }, [course]);

  // Function to save configurations
  const saveConfigurations = async () => {
    console.log("Saving configurations:", { moduleCount, lessonsPerModule: lessonsPerModule[0] });
    
    if (course) {
      try {
        setIsSaving(true);
        
        // Save to PostgreSQL via API
        const response = await fetch(`/api/courses/${course.id}/phase/2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moduleCount,
            lessonsPerModule: lessonsPerModule[0],
            configurationsSaved: true,
            modules: modules,
            lastUpdated: new Date().toISOString()
          }),
        });

        if (response.ok) {
          // Update local context
          updatePhaseData(2, {
            moduleCount,
            lessonsPerModule: lessonsPerModule[0],
            configurationsSaved: true,
            modules: modules
          });
          
          setConfigurationsSaved(true);
          
          toast({
            title: "Saved!",
            description: `${moduleCount} modules with ${lessonsPerModule[0]} lessons each.`,
            variant: "default",
          });
          
          console.log("Configurations saved successfully to PostgreSQL!");
        } else {
          throw new Error(`HTTP Error: ${response.status}`);
        }
      } catch (error) {
        console.error("Error saving to database:", error);
        toast({
          title: "Save Error",
          description: "Failed to save to database. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      console.error("Course not found!");
      toast({
        title: "Error",
        description: "Course not found. Please return to Phase 1.",
        variant: "destructive",
      });
    }
  };

  // Mutation to generate structure with AI
  const generateStructure = useMutation({
    mutationFn: async () => {
      // Get strategy data from Phase 1
      const phase1Data = course?.phaseData?.phase1;
      if (!phase1Data) {
        throw new Error("Phase 1 data not found. Complete Phase 1 first.");
      }

      console.log("Sending to API:", {
        moduleCount,
        lessonsPerModule: lessonsPerModule[0],
        phase1Data
      });

      const response = await apiRequest(
        "POST", 
        "/api/courses/structure", 
        { 
          courseDetails: {
            ...phase1Data,
            moduleCount,
            lessonsPerModule: lessonsPerModule[0]
          },
          moduleCount,
          lessonsPerModule: lessonsPerModule[0]
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Data received from API:", data);
      if (data.modules && Array.isArray(data.modules)) {
        // Convert generated modules to expected format
        const newModules = data.modules.map((module: any, index: number) => {
          // Check if the module has the content.lessons structure
          const lessons = module.content?.lessons || [];
          console.log(`Module ${index + 1}: ${module.title} - ${lessons.length} lessons`);
          
          return {
            id: `module-${Date.now()}-${index}`,
            title: module.title,
            description: module.description,
            order: index + 1,
            estimatedHours: module.estimatedHours || 3,
            status: "not_started" as const,
            content: {
              lessons: lessons, // Preserve lessons structure
              ...module.content // Preserve other content data
            },
            imageUrl: null
          };
        });
        
        const totalLessons = newModules.reduce((acc: number, mod: any) => acc + (mod.content?.lessons?.length || 0), 0);
        console.log(`Total lessons created: ${totalLessons}`);
        
        setModules(newModules);
        updateModules(newModules);
        updateProgress(2, 50);
        
        toast({
          title: "Structure Generated!",
          description: `${data.modules.length} modules created with ${totalLessons} lessons in total.`,
          variant: "default",
        });
      } else {
        throw new Error("Invalid response format");
      }
    },
    onError: (error) => {
      console.error("Error generating structure:", error);
      toast({
        title: "Error",
        description: "Failed to generate structure. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation to generate competency mapping
  const generateCompetencyMapping = useMutation({
    mutationFn: async () => {
      const phase1Data = course?.phaseData?.phase1;
      if (!phase1Data) {
        throw new Error("Phase 1 data not found. Complete Phase 1 first.");
      }

      if (modules.length === 0) {
        throw new Error("No modules found. Generate structure first.");
      }

      // Send only essential module data to avoid large payload
      const modulesSummary = modules.map(module => ({
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.order,
        estimatedHours: module.estimatedHours
      }));

      const response = await apiRequest(
        "POST", 
        "/api/courses/competency-mapping", 
        { 
          courseDetails: phase1Data,
          modules: modulesSummary
        }
      );
      
      const responseText = await response.text();
      console.log("Raw server response:", responseText);
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        console.error("Response received:", responseText);
        throw new Error("Invalid server response");
      }
    },
    onSuccess: (data) => {
      console.log("Competency mapping received:", data);
      if (data.mapping) {
        setCompetenciesMap(data.mapping);
        
        toast({
          title: "Mapping Generated!",
          description: `Competencies distributed across ${modules.length} modules.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      console.error("Error generating mapping:", error);
      toast({
        title: "Error",
        description: "Failed to generate competency mapping. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Reorder modules
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const reorderedModules = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
  };

  // Submit and advance to next phase
  const handleSubmit = () => {
    if (modules.length === 0) {
      toast({
        title: "No modules created",
        description: "Please create at least one module before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    updatePhaseData(2, {
      moduleCount,
      lessonsPerModule: lessonsPerModule[0],
      competenciesMap,
      completed: true
    });
    
    updateProgress(2, 100);
    moveToNextPhase();
    navigate("/phase3");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={2}
          title="Phase 2: Structure" 
          description="Configure and organize the course structure"
          onNext={handleSubmit}
        />
        
        <Tabs defaultValue="configurations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configurations">Configuration</TabsTrigger>
            <TabsTrigger value="modules" disabled={!configurationsSaved}>Modules</TabsTrigger>
            <TabsTrigger value="competencies" disabled={modules.length === 0}>Mapping</TabsTrigger>
          </TabsList>
          
          {/* TAB 1: CONFIGURATION */}
          <TabsContent value="configurations" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Structure Configuration</h2>
              <p className="text-muted-foreground">Define the basic structure of your course</p>
            </div>

            {/* Course Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Course Summary</CardTitle>
                <CardDescription>Basic information defined in Phase 1</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Title</p>
                    <p className="text-lg font-semibold">{course?.title || "Not defined"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Theme</p>
                    <p className="text-lg font-semibold">{course?.theme || "Not defined"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated Hours</p>
                    <p className="text-lg font-semibold">{course?.estimatedHours || 0} hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Structure Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Number of Modules</CardTitle>
                  <CardDescription>How many modules the course will have</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setModuleCount(Math.max(1, moduleCount - 1))}
                      disabled={moduleCount <= 1}
                    >
                      -
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-3xl font-bold text-primary">{moduleCount}</span>
                      <p className="text-sm text-muted-foreground">modules</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setModuleCount(Math.min(20, moduleCount + 1))}
                      disabled={moduleCount >= 20}
                    >
                      +
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Minimum: 1 | Maximum: 20
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lessons per Module</CardTitle>
                  <CardDescription>How many lessons each module will have</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-primary">{lessonsPerModule[0]}</span>
                      <p className="text-sm text-muted-foreground">lessons per module</p>
                    </div>
                    <Slider
                      value={lessonsPerModule}
                      onValueChange={setLessonsPerModule}
                      max={20}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>10</span>
                      <span>20</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Calculated Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{moduleCount}</p>
                    <p className="text-sm text-muted-foreground">Modules</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{moduleCount * lessonsPerModule[0]}</p>
                    <p className="text-sm text-muted-foreground">Total Lessons</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{Math.round((course?.estimatedHours || 0) / moduleCount)}</p>
                    <p className="text-sm text-muted-foreground">Hours/Module</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{Math.round((course?.estimatedHours || 0) / (moduleCount * lessonsPerModule[0]))}</p>
                    <p className="text-sm text-muted-foreground">Hours/Lesson</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Configuration Button */}
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  console.log("Button clicked!");
                  saveConfigurations();
                }}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-8 py-2"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Saving...
                  </span>
                ) : configurationsSaved ? "✓ Save" : "Save"}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: MODULES */}
          <TabsContent value="modules" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Course Modules</h2>
                <p className="text-muted-foreground">Generate and organize course modules</p>
              </div>
              
              <Button
                  onClick={() => {
                    console.log("Generating structure with:", { moduleCount, lessonsPerModule: lessonsPerModule[0] });
                    
                    // Check if there are existing modules
                    if (modules.length > 0) {
                      if (confirm(`Warning! You already have ${modules.length} modules created.\n\nGenerating new structure will REPLACE all current modules.\n\nDo you want to continue?`)) {
                        generateStructure.mutate();
                      }
                    } else {
                      generateStructure.mutate();
                    }
                  }}
                  disabled={generateStructure.isPending || !configurationsSaved}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                >
                  {generateStructure.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Generating {moduleCount} modules with {lessonsPerModule[0]} lessons each...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="material-icons text-sm mr-2">auto_awesome</span>
                      {modules.length > 0 ? 'Regenerate' : 'Generate'} AI Structure ({moduleCount} modules, {lessonsPerModule[0]} lessons each)
                    </span>
                  )}
                </Button>
            </div>

            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="text-lg font-semibold mb-2">No Modules Created</h3>
                    <p className="text-muted-foreground mb-4">
                      Click the "Generate AI Structure" button to create course modules
                    </p>
                    {!configurationsSaved && (
                      <Badge variant="outline" className="text-orange-600">
                        Save configurations first
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="modules">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {modules.map((module, index) => (
                        <Draggable key={module.id} draggableId={module.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <CardHeader 
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleModuleExpansion(module.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <CardTitle className="text-lg font-semibold text-gray-900">
                                      {module.title}
                                    </CardTitle>
                                    <CardDescription className="mt-1 text-gray-600">
                                      {module.description}
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      {(module.content as any)?.lessons?.length || 0} lessons
                                    </Badge>
                                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                                      {module.estimatedHours}h
                                    </Badge>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="ml-2"
                                    >
                                      {expandedModules.has(module.id) ? '▼' : '▶'}
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              {/* Display lessons in Hotmart style format - only when expanded */}
                              {expandedModules.has(module.id) && module.content && (module.content as any)?.lessons && (module.content as any)?.lessons.length > 0 && (
                                <CardContent className="pt-0">
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide border-b pb-2">
                                      📚 Module Lessons
                                    </h4>
                                    <div className="grid gap-2">
                                      {((module.content as any)?.lessons || []).map((lesson: any, i: number) => (
                                        <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-semibold mr-3">
                                            {i + 1}
                                          </div>
                                          <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm leading-tight">
                                              {lesson.title || `Lesson ${i + 1}`}
                                            </p>
                                            {lesson.description && (
                                              <p className="text-xs text-gray-500 mt-1">
                                                {lesson.description}
                                              </p>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded">
                                              {lesson.duration || "45min"}
                                            </span>
                                            {lesson.type && (
                                              <p className="text-xs text-gray-400 mt-1">
                                                📹 {lesson.type === 'video' ? 'Video lesson' : lesson.type}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Module summary */}
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-blue-800">
                                          Total: {((module.content as any)?.lessons || []).length} lessons
                                        </span>
                                        <span className="text-blue-600">
                                          ⏱️ {module.estimatedHours} hours of content
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </TabsContent>

          {/* TAB 3: COMPETENCY MAPPING */}
          <TabsContent value="competencies" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Competency Mapping</h2>
              <p className="text-muted-foreground">Associate competencies with course modules</p>
            </div>

            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-lg font-semibold mb-2">Generate Structure First</h3>
                    <p className="text-muted-foreground">
                      You need to generate modules before mapping competencies
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Competencies Defined in Phase 1</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {course?.phaseData?.phase1?.cognitiveSkills && (
                      <div>
                        <h4 className="font-medium text-blue-600">Cognitive Competencies</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.phaseData.phase1.cognitiveSkills}
                        </p>
                      </div>
                    )}
                    {course?.phaseData?.phase1?.behavioralSkills && (
                      <div>
                        <h4 className="font-medium text-green-600">Behavioral Competencies</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.phaseData.phase1.behavioralSkills}
                        </p>
                      </div>
                    )}
                    {course?.phaseData?.phase1?.technicalSkills && (
                      <div>
                        <h4 className="font-medium text-purple-600">Technical Competencies</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.phaseData.phase1.technicalSkills}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Distribution by Modules</CardTitle>
                      <CardDescription>
                        Each competency will be developed throughout the modules
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        console.log("Generating competency mapping...");
                        generateCompetencyMapping.mutate();
                      }}
                      disabled={generateCompetencyMapping.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
                    >
                      {generateCompetencyMapping.isPending ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                          Mapping...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <span className="material-icons text-sm mr-2">psychology</span>
                          Generate AI Mapping
                        </span>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {!competenciesMap || Object.keys(competenciesMap).length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔗</div>
                        <h3 className="text-lg font-semibold mb-2">Automatic Mapping</h3>
                        <p className="text-muted-foreground">
                          Click the "Generate AI Mapping" button to automatically distribute competencies across modules
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {modules.map((module, index) => {
                          const moduleKey = `module_${index + 1}`;
                          const moduleCompetencies = competenciesMap[moduleKey] || {
                            cognitive: [],
                            behavioral: [],
                            technical: []
                          };
                          
                          return (
                            <Card key={module.id} className="bg-gray-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg">{module.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Cognitive Skills */}
                                  <div>
                                    <h5 className="font-medium text-blue-600 mb-2 flex items-center">
                                      🧠 Cognitive
                                    </h5>
                                    {(moduleCompetencies as any).cognitive && (moduleCompetencies as any).cognitive.length > 0 ? (
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {(moduleCompetencies as any).cognitive.map((comp: string, i: number) => (
                                          <li key={i} className="flex items-start">
                                            <span className="text-blue-500 mr-1">•</span>
                                            {comp}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-gray-400">No cognitive skills</p>
                                    )}
                                  </div>

                                  {/* Behavioral Skills */}
                                  <div>
                                    <h5 className="font-medium text-green-600 mb-2 flex items-center">
                                      🤝 Behavioral
                                    </h5>
                                    {(moduleCompetencies as any).behavioral && (moduleCompetencies as any).behavioral.length > 0 ? (
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {(moduleCompetencies as any).behavioral.map((comp: string, i: number) => (
                                          <li key={i} className="flex items-start">
                                            <span className="text-green-500 mr-1">•</span>
                                            {comp}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-gray-400">No behavioral skills</p>
                                    )}
                                  </div>

                                  {/* Technical Skills */}
                                  <div>
                                    <h5 className="font-medium text-purple-600 mb-2 flex items-center">
                                      ⚙️ Technical
                                    </h5>
                                    {(moduleCompetencies as any).technical && (moduleCompetencies as any).technical.length > 0 ? (
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {(moduleCompetencies as any).technical.map((comp: string, i: number) => (
                                          <li key={i} className="flex items-start">
                                            <span className="text-purple-500 mr-1">•</span>
                                            {comp}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-gray-400">No technical skills</p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Botões de Navegação */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={() => navigate("/phase1")}>
            ← Voltar para Phase 1
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={modules.length === 0}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
          >
            Continuar para Phase 3 →
          </Button>
        </div>
      </div>
    </div>
  );
}