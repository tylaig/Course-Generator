import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useMutation } from "@tanstack/react-query";

// Components
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Icons
import {
  Plus,
  Trash2,
  Edit,
  Save,
  Cancel,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Target,
  Users,
  Brain,
  Lightbulb,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Play
} from "lucide-react";

// Context and Utils
import { useCourse } from "@/context/CourseContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";

// Types
import { CourseModule } from "@/types";

// Validation Schema
const moduleSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  estimatedHours: z.number().min(0.5, "Deve ter pelo menos 0.5 horas").max(10, "Máximo de 10 horas"),
  objectives: z.array(z.string().min(5, "Objetivos devem ter pelo menos 5 caracteres")).min(1, "Pelo menos um objetivo é obrigatório"),
  competencyType: z.enum(["cognitive", "behavioral", "technical"]).optional(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  evaluationType: z.enum(["quiz", "project", "assignment", "discussion"]).optional(),
  bloomLevel: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]).optional(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function Phase2() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const {
    course,
    updatePhaseData,
    updateModules,
    updateProgress,
    moveToNextPhase
  } = useCourse();

  // Estados locais
  const [modules, setModules] = useState<CourseModule[]>(course?.modules || []);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [competenciesMap, setCompetenciesMap] = useState<any>({});
  const [lessonSettings, setLessonSettings] = useState({
    moduleCount: course?.phaseData?.phase2?.moduleCount || 5,
    lessonsPerModule: course?.phaseData?.phase2?.lessonsPerModule || 5
  });

  // Form
  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
      estimatedHours: 2,
      objectives: [""],
      competencyType: "cognitive",
      difficultyLevel: "intermediate",
      evaluationType: "quiz",
      bloomLevel: "understand"
    }
  });

  // Mutations
  const structureMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/courses/structure", data);
    },
    onSuccess: (data) => {
      if (data.modules) {
        const formattedModules = data.modules.map((module: any, index: number) => ({
          ...module,
          id: module.id || uuidv4(),
          order: index + 1,
          status: "not_started" as const,
          objectives: module.learningObjectives || module.objectives || [],
          competencyType: module.competencyType || "cognitive",
          difficultyLevel: module.difficultyLevel || "intermediate",
          evaluationType: module.moduleAssessment?.type || "quiz",
          bloomLevel: module.bloomLevel || "understand"
        }));
        setModules(formattedModules);
        updateModules(formattedModules);
        
        // Salvar dados estruturais avançados
        if (data.courseStructure || data.assessmentStrategy || data.innovationFeatures) {
          updatePhaseData(2, {
            ...data,
            advancedStructure: {
              courseStructure: data.courseStructure,
              assessmentStrategy: data.assessmentStrategy,
              innovationFeatures: data.innovationFeatures,
              qualityAssurance: data.qualityAssurance,
              statistics: data.statistics
            }
          });
        }
      }
      
      toast({
        title: "🚀 Estrutura Avançada Criada!",
        description: `${data.modules?.length || 0} módulos com ${data.statistics?.totalLessons || 0} aulas detalhadas foram gerados com IA.`
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar estrutura",
        description: "Tente novamente ou ajuste os parâmetros.",
        variant: "destructive"
      });
    }
  });

  // Effects
  useEffect(() => {
    if (course) {
      setModules(course.modules || []);
      setLessonSettings({
        moduleCount: course.phaseData?.phase2?.moduleCount || 5,
        lessonsPerModule: course.phaseData?.phase2?.lessonsPerModule || 5
      });
    }
  }, [course]);

  useEffect(() => {
    if (course) {
      updateProgress(2, modules.length > 0 ? 50 : 10);
    }
  }, [course, modules.length, updateProgress]);

  // Handlers
  const handleGoBack = () => {
    setLocation("/phase1");
  };

  const handleSubmit = () => {
    if (modules.length === 0) {
      toast({
        title: "Nenhum módulo adicionado",
        description: "Adicione pelo menos um módulo antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    updatePhaseData(2, {
      modules,
      competenciesMap,
      moduleCount: lessonSettings.moduleCount,
      lessonsPerModule: lessonSettings.lessonsPerModule
    });
    updateProgress(2, 100);
    moveToNextPhase();
    setLocation("/phase3");
    
    toast({
      title: "Fase concluída",
      description: "A estrutura do curso foi definida com sucesso!",
    });
  };

  const handleAddModule = (data: ModuleFormData) => {
    const newModule: CourseModule = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      order: modules.length + 1,
      estimatedHours: data.estimatedHours,
      objectives: data.objectives.filter(obj => obj.trim() !== ""),
      status: "not_started",
      competencyType: data.competencyType,
      difficultyLevel: data.difficultyLevel,
      evaluationType: data.evaluationType,
      bloomLevel: data.bloomLevel
    };

    const updatedModules = [...modules, newModule];
    setModules(updatedModules);
    updateModules(updatedModules);
    form.reset();
    setIsDialogOpen(false);
    
    toast({
      title: "Módulo adicionado",
      description: `${newModule.title} foi adicionado com sucesso.`
    });
  };

  const handleUpdateModule = (data: ModuleFormData) => {
    if (!editingModule) return;

    const updatedModules = modules.map(module =>
      module.id === editingModule.id
        ? {
            ...module,
            ...data,
            objectives: data.objectives.filter(obj => obj.trim() !== "")
          }
        : module
    );

    setModules(updatedModules);
    updateModules(updatedModules);
    setEditingModule(null);
    setIsDialogOpen(false);
    form.reset();
    
    toast({
      title: "Módulo atualizado",
      description: `${data.title} foi atualizado com sucesso.`
    });
  };

  const handleDeleteModule = (moduleId: string) => {
    const updatedModules = modules
      .filter(module => module.id !== moduleId)
      .map((module, index) => ({ ...module, order: index + 1 }));
    
    setModules(updatedModules);
    updateModules(updatedModules);
    
    toast({
      title: "Módulo removido",
      description: "O módulo foi removido com sucesso."
    });
  };

  const handleEditModule = (module: CourseModule) => {
    setEditingModule(module);
    form.reset({
      title: module.title,
      description: module.description,
      estimatedHours: module.estimatedHours,
      objectives: module.objectives || [""],
      competencyType: module.competencyType || "cognitive",
      difficultyLevel: module.difficultyLevel || "intermediate",
      evaluationType: module.evaluationType || "quiz",
      bloomLevel: module.bloomLevel || "understand"
    });
    setIsDialogOpen(true);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedModules = items.map((module, index) => ({
      ...module,
      order: index + 1
    }));

    setModules(updatedModules);
    updateModules(updatedModules);
  };

  const handleGenerateStructure = () => {
    if (!course) return;

    structureMutation.mutate({
      courseDetails: {
        title: course.title,
        theme: course.theme,
        estimatedHours: course.estimatedHours,
        format: course.format,
        platform: course.platform,
        deliveryFormat: course.deliveryFormat,
        publicTarget: course.phaseData?.phase1?.publicTarget,
        educationalLevel: course.phaseData?.phase1?.educationalLevel,
        familiarityLevel: course.phaseData?.phase1?.familiarityLevel
      },
      phaseData: course.phaseData?.phase1 || {},
      moduleCount: lessonSettings.moduleCount,
      lessonsPerModule: lessonSettings.lessonsPerModule
    });
  };

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">Nenhum curso encontrado</p>
        <Button onClick={handleGoBack} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Fase 1
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <WorkflowProgress />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fase 2: Estruturação dos Módulos</h1>
        <p className="text-muted-foreground">
          Defina a estrutura modular do curso "{course.title}"
        </p>
      </div>

      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modules">Módulos do Curso</TabsTrigger>
          <TabsTrigger value="competencies">Mapeamento de Competências</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-6">
          {/* Cabeçalho com estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Módulos</p>
                    <p className="text-2xl font-bold">{modules.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Horas Totais</p>
                    <p className="text-2xl font-bold">
                      {modules.reduce((total, module) => total + module.estimatedHours, 0)}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Objetivos</p>
                    <p className="text-2xl font-bold">
                      {modules.reduce((total, module) => total + (module.objectives?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nível</p>
                    <p className="text-lg font-semibold">
                      {course.phaseData?.phase1?.educationalLevel || "Intermediário"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-between items-center">
            <Button 
              onClick={handleGenerateStructure}
              disabled={structureMutation.isPending}
              className="gap-2"
            >
              {structureMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Gerando Estrutura...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Gerar Estrutura com IA
                </>
              )}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingModule(null);
                  form.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Módulo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingModule ? "Editar Módulo" : "Adicionar Novo Módulo"}
                  </DialogTitle>
                  <DialogDescription>
                    Defina as informações básicas do módulo do curso
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(editingModule ? handleUpdateModule : handleAddModule)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Módulo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Introdução ao JavaScript" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva o que será abordado neste módulo..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horas Estimadas</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.5"
                              min="0.5"
                              max="10"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="competencyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Competência</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cognitive">Cognitiva</SelectItem>
                                <SelectItem value="behavioral">Comportamental</SelectItem>
                                <SelectItem value="technical">Técnica</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="difficultyLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nível de Dificuldade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o nível" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">Iniciante</SelectItem>
                                <SelectItem value="intermediate">Intermediário</SelectItem>
                                <SelectItem value="advanced">Avançado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="evaluationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Avaliação</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Tipo de avaliação" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="project">Projeto</SelectItem>
                                <SelectItem value="assignment">Tarefa</SelectItem>
                                <SelectItem value="discussion">Discussão</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bloomLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nível de Bloom</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Nível cognitivo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="remember">Lembrar</SelectItem>
                                <SelectItem value="understand">Compreender</SelectItem>
                                <SelectItem value="apply">Aplicar</SelectItem>
                                <SelectItem value="analyze">Analisar</SelectItem>
                                <SelectItem value="evaluate">Avaliar</SelectItem>
                                <SelectItem value="create">Criar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Objetivos de Aprendizagem</FormLabel>
                      {form.watch("objectives").map((_, index) => (
                        <FormField
                          key={index}
                          control={form.control}
                          name={`objectives.${index}`}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input 
                                    placeholder={`Objetivo ${index + 1}`}
                                    {...field} 
                                  />
                                </FormControl>
                                {index > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const objectives = form.getValues("objectives");
                                      objectives.splice(index, 1);
                                      form.setValue("objectives", objectives);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const objectives = form.getValues("objectives");
                          form.setValue("objectives", [...objectives, ""]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Objetivo
                      </Button>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingModule ? "Atualizar" : "Adicionar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de módulos */}
          {modules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum módulo adicionado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comece criando módulos para estruturar seu curso ou use a IA para gerar uma estrutura automaticamente.
                </p>
                <Button onClick={handleGenerateStructure} disabled={structureMutation.isPending}>
                  <Brain className="h-4 w-4 mr-2" />
                  Gerar Estrutura com IA
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="modules">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {modules.map((module, index) => (
                      <Draggable key={module.id} draggableId={module.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 p-1 hover:bg-muted rounded cursor-grab"
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant="outline">Módulo {module.order}</Badge>
                                      <Badge variant={
                                        module.competencyType === 'cognitive' ? 'default' :
                                        module.competencyType === 'behavioral' ? 'secondary' : 'outline'
                                      }>
                                        {module.competencyType === 'cognitive' ? 'Cognitiva' :
                                         module.competencyType === 'behavioral' ? 'Comportamental' : 'Técnica'}
                                      </Badge>
                                      <Badge variant="outline">
                                        {module.difficultyLevel === 'beginner' ? 'Iniciante' :
                                         module.difficultyLevel === 'intermediate' ? 'Intermediário' : 'Avançado'}
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-lg">{module.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                      {module.description}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditModule(module)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteModule(module.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                                <div className="flex items-center space-x-4">
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{module.estimatedHours}h</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Target className="h-4 w-4" />
                                    <span>{module.objectives?.length || 0} objetivos</span>
                                  </span>
                                </div>
                                <Badge variant="outline">
                                  {module.evaluationType === 'quiz' ? 'Quiz' :
                                   module.evaluationType === 'project' ? 'Projeto' :
                                   module.evaluationType === 'assignment' ? 'Tarefa' : 'Discussão'}
                                </Badge>
                              </div>
                              
                              {module.objectives && module.objectives.length > 0 && (
                                <Accordion type="single" collapsible>
                                  <AccordionItem value="objectives">
                                    <AccordionTrigger className="text-sm">
                                      Objetivos de Aprendizagem
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <ul className="space-y-1">
                                        {module.objectives.map((objective, idx) => (
                                          <li key={idx} className="flex items-start space-x-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>{objective}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </CardContent>
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

        <TabsContent value="competencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Mapeamento de Competências</span>
              </CardTitle>
              <CardDescription>
                Visualize como as competências são distribuídas pelos módulos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Adicione módulos para visualizar o mapeamento de competências
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Competências Cognitivas</h4>
                      <div className="space-y-1">
                        {modules.filter(m => m.competencyType === 'cognitive').map(module => (
                          <div key={module.id} className="text-sm p-2 bg-blue-50 rounded">
                            {module.title}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Competências Comportamentais</h4>
                      <div className="space-y-1">
                        {modules.filter(m => m.competencyType === 'behavioral').map(module => (
                          <div key={module.id} className="text-sm p-2 bg-green-50 rounded">
                            {module.title}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Competências Técnicas</h4>
                      <div className="space-y-1">
                        {modules.filter(m => m.competencyType === 'technical').map(module => (
                          <div key={module.id} className="text-sm p-2 bg-purple-50 rounded">
                            {module.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Estrutura</CardTitle>
              <CardDescription>
                Ajuste os parâmetros para geração automática de estrutura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Número de Módulos: {lessonSettings.moduleCount}
                  </Label>
                  <Slider
                    value={[lessonSettings.moduleCount]}
                    onValueChange={([value]) => 
                      setLessonSettings(prev => ({ ...prev, moduleCount: value }))
                    }
                    max={50}
                    min={3}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recomendado: 5-12 módulos para cursos equilibrados
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Aulas por Módulo: {lessonSettings.lessonsPerModule}
                  </Label>
                  <Slider
                    value={[lessonSettings.lessonsPerModule]}
                    onValueChange={([value]) => 
                      setLessonSettings(prev => ({ ...prev, lessonsPerModule: value }))
                    }
                    max={7}
                    min={4}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Configurado para 4-7 aulas por módulo conforme especificação
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Estimativas do Curso</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span>Total de aulas estimadas:</span>
                    <span className="font-medium">
                      {lessonSettings.moduleCount * lessonSettings.lessonsPerModule}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duração estimada:</span>
                    <span className="font-medium">
                      {Math.round(lessonSettings.moduleCount * 2.5)}h
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PhaseNav 
        currentPhase={2}
        onBack={handleGoBack}
        onNext={handleSubmit}
        canProceed={modules.length > 0}
        nextLabel="Ir para Fase 3"
        backLabel="Voltar para Fase 1"
      />
    </div>
  );
}