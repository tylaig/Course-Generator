import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { CourseModule } from "@/types";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ModuleFormData {
  title: string;
  description: string;
  estimatedHours: number;
}

export default function Phase2() {
  const [_, navigate] = useLocation();
  const { course, updateModules, moveToNextPhase, setGenerationStatus, updatePhaseData } = useCourse();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCount, setModuleCount] = useState<number>(4); // Número padrão de módulos a gerar

  const form = useForm<ModuleFormData>({
    defaultValues: {
      title: "",
      description: "",
      estimatedHours: 1
    }
  });

  useEffect(() => {
    if (course?.modules) {
      setModules(course.modules);
    }
  }, [course?.modules]);

  const generateStructure = useMutation({
    mutationFn: async () => {
      if (!course || !course.id) {
        console.error("Não há curso ativo para gerar módulos");
        throw new Error("Curso não encontrado");
      }
      
      setGenerationStatus("generating");
      
      // Log para debug
      console.log("Enviando dados do curso para geração:", {
        id: course.id,
        title: course.title,
        phaseData: course.phaseData
      });
      
      const courseData = {
        courseId: course.id,
        title: course.title,
        theme: course.theme,
        estimatedHours: course.estimatedHours,
        moduleCount: moduleCount, // Enviando o número de módulos desejados
        phaseData: course.phaseData?.phase1 || {}
      };
      
      const response = await apiRequest("POST", "/api/generate/structure", courseData);
      return response.json();
    },
    onSuccess: (data) => {
      setGenerationStatus("success");
      
      // Create modules from the generated structure
      if (data.modules) {
        const newModules = data.modules.map((module: any, index: number) => ({
          id: `module-${Date.now()}-${index}`,
          title: module.title,
          description: module.description || "",
          order: index + 1,
          estimatedHours: module.estimatedHours || Math.floor(course!.estimatedHours / data.modules.length),
          status: "not_started",
        }));
        
        setModules(newModules);
        updateModules(newModules);
      }

      // Save the AI generated structure data
      updatePhaseData(2, data);
    },
    onError: () => {
      setGenerationStatus("error");
    }
  });

  const handleAddModule = (data: ModuleFormData) => {
    if (editingModuleId) {
      // Update existing module
      const updatedModules = modules.map(module => 
        module.id === editingModuleId 
          ? { ...module, ...data } 
          : module
      );
      setModules(updatedModules);
      updateModules(updatedModules);
      setEditingModuleId(null);
    } else {
      // Add new module
      const newModule: CourseModule = {
        id: `module-${Date.now()}`,
        ...data,
        order: modules.length + 1,
        status: "not_started"
      };
      
      const updatedModules = [...modules, newModule];
      setModules(updatedModules);
      updateModules(updatedModules);
    }
    
    form.reset({
      title: "",
      description: "",
      estimatedHours: 1
    });
  };

  const handleEditModule = (moduleId: string) => {
    const moduleToEdit = modules.find(module => module.id === moduleId);
    if (moduleToEdit) {
      form.reset({
        title: moduleToEdit.title,
        description: moduleToEdit.description,
        estimatedHours: moduleToEdit.estimatedHours
      });
      setEditingModuleId(moduleId);
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    const updatedModules = modules.filter(module => module.id !== moduleId);
    // Reorder remaining modules
    const reorderedModules = updatedModules.map((module, index) => ({
      ...module,
      order: index + 1
    }));
    setModules(reorderedModules);
    updateModules(reorderedModules);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property of all modules
    const reorderedModules = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
  };

  const handleNextPhase = () => {
    if (modules.length > 0) {
      moveToNextPhase();
      navigate("/phase3");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={2}
          title="Phase 2: Module Structure" 
          description="Organize your course into modules and define their sequence"
          onNext={handleNextPhase}
        />

        <div className="mb-6">
          <div className="flex justify-between mb-3">
            <h3 className="text-lg font-heading font-medium text-neutral-800">Course Modules</h3>
          </div>
          
          <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-md mb-4">
            <h4 className="text-sm font-medium mb-3">Opções de Geração</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-neutral-600 mb-1 block">Número de módulos:</label>
                <div className="flex items-center">
                  <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    value={moduleCount} 
                    onChange={(e) => setModuleCount(Number(e.target.value))}
                    className="w-32 mr-3"
                  />
                  <span className="text-sm font-medium">{moduleCount} módulos</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                onClick={() => generateStructure.mutate()} 
                variant="secondary"
                disabled={generateStructure.isPending}
                className="flex items-center"
              >
                <span className="material-icons text-sm mr-1">bolt</span>
                {generateStructure.isPending ? "Gerando..." : "Gerar Módulos"}
              </Button>
            </div>
          </div>
        </div>

        {modules.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="modules">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3 mb-6"
                >
                  {modules.map((module, index) => (
                    <Draggable 
                      key={module.id} 
                      draggableId={module.id} 
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-4 border border-neutral-200 rounded-md bg-neutral-50 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-neutral-400 material-icons">drag_indicator</span>
                            <div>
                              <h4 className="font-medium text-neutral-800">{module.title}</h4>
                              <p className="text-sm text-neutral-600">{module.description}</p>
                              <span className="text-xs text-neutral-500">Estimated: {module.estimatedHours} hour{module.estimatedHours !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditModule(module.id)}
                              className="text-neutral-500 hover:text-neutral-800"
                            >
                              <span className="material-icons">edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteModule(module.id)}
                              className="text-neutral-500 hover:text-red-600"
                            >
                              <span className="material-icons">delete</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-neutral-600">
                No modules have been created yet. Use the form below to add modules or click "Generate Modules" to create them automatically.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="border-t border-neutral-200 pt-6">
          <h3 className="text-lg font-heading font-medium text-neutral-800 mb-4">
            {editingModuleId ? "Edit Module" : "Add New Module"}
          </h3>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddModule)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: "Title is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Introduction to the Topic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  rules={{ required: "Hours are required", min: { value: 1, message: "Minimum 1 hour" } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                rules={{ required: "Description is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Briefly describe what this module will cover..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-3">
                {editingModuleId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingModuleId(null);
                      form.reset({
                        title: "",
                        description: "",
                        estimatedHours: 1
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="flex items-center">
                  <span className="material-icons text-sm mr-1">
                    {editingModuleId ? "save" : "add"}
                  </span>
                  {editingModuleId ? "Update Module" : "Add Module"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
