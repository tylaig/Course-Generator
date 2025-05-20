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
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { useCourse } from "@/context/CourseContext";
import { CourseModule } from "@/types";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Schema para validação de módulos
const moduleSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  estimatedHours: z.coerce.number().min(1, "Horas devem ser pelo menos 1"),
  objective: z.string().min(10, "O objetivo deve ter pelo menos 10 caracteres"),
  topics: z.string().min(5, "Adicione pelo menos um tópico"),
  contents: z.string().min(5, "Adicione pelo menos um tipo de conteúdo"),
  activities: z.string().min(5, "Adicione pelo menos uma atividade"),
  cognitiveSkills: z.string().min(3, "Adicione pelo menos uma competência cognitiva"),
  behavioralSkills: z.string().min(3, "Adicione pelo menos uma competência comportamental"),
  technicalSkills: z.string().min(3, "Adicione pelo menos uma competência técnica"),
  evaluationType: z.string().min(3, "Adicione o tipo de avaliação"),
  bloomLevel: z.string()
});

type ModuleFormData = z.infer<typeof moduleSchema>;

// Níveis de Bloom para competências cognitivas
const bloomLevels = [
  { value: "remembering", label: "Lembrar", description: "Recordar fatos e conceitos básicos" },
  { value: "understanding", label: "Compreender", description: "Explicar ideias ou conceitos" },
  { value: "applying", label: "Aplicar", description: "Usar informações em novas situações" },
  { value: "analyzing", label: "Analisar", description: "Estabelecer conexões entre ideias" },
  { value: "evaluating", label: "Avaliar", description: "Justificar uma posição ou decisão" },
  { value: "creating", label: "Criar", description: "Produzir trabalho original" }
];

export default function Phase2() {
  const [_, navigate] = useLocation();
  const { course, updateModules, moveToNextPhase, updateProgress, updatePhaseData } = useCourse();
  const { toast } = useToast();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
  const [moduleCount, setModuleCount] = useState<number>(4); // Número padrão de módulos
  const [lessonsPerModule, setLessonsPerModule] = useState<number>(3); // Número padrão de aulas por módulo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState("module-structure");
  const [competenciesMap, setCompetenciesMap] = useState<Record<string, string[]>>({});
  const [isGeneratingCompetencies, setIsGeneratingCompetencies] = useState(false);

  // Formulário para edição de módulos
  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
      estimatedHours: 1,
      objective: "",
      topics: "",
      contents: "",
      activities: "",
      cognitiveSkills: "",
      behavioralSkills: "",
      technicalSkills: "",
      evaluationType: "",
      bloomLevel: "understanding"
    }
  });

  // Carregar os módulos existentes do curso
  useEffect(() => {
    if (course?.modules && course.modules.length > 0) {
      setModules(course.modules);
    }
    
    // Carregar mapeamento de competências caso exista nos dados da fase
    if (course?.phaseData?.phase2?.competenciesMap) {
      setCompetenciesMap(course.phaseData.phase2.competenciesMap);
    }
    
    // Definir o número de módulos baseado nas configurações existentes
    if (course?.phaseData?.phase2?.moduleCount) {
      setModuleCount(course.phaseData.phase2.moduleCount);
    }
    
    // Definir o número de aulas por módulo baseado nas configurações existentes
    if (course?.phaseData?.phase2?.lessonsPerModule) {
      setLessonsPerModule(course.phaseData.phase2.lessonsPerModule);
    }
  }, [course]);

  // Mutação para geração de estrutura de módulos com IA
  const generateStructure = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const courseDetails = {
        title: course?.title,
        theme: course?.theme,
        estimatedHours: course?.estimatedHours,
        format: course?.format,
        platform: course?.platform,
        deliveryFormat: course?.deliveryFormat,
        moduleCount: moduleCount,
        lessonsPerModule: lessonsPerModule,
        phaseData: course?.phaseData?.phase1
      };
      
      const response = await apiRequest("POST", "/api/generate/structure", courseDetails);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.modules && Array.isArray(data.modules)) {
        // Converter os módulos gerados para o formato esperado
        const newModules = data.modules.map((module, index) => ({
          id: `module-${Date.now()}-${index}`,
          title: module.title,
          description: module.description,
          order: index + 1,
          estimatedHours: module.estimatedHours || Math.ceil(course?.estimatedHours! / moduleCount),
          status: "not_started",
          objective: module.objective || "",
          topics: module.topics?.join("\n") || "",
          contents: module.contents?.join("\n") || "",
          activities: module.activities?.join("\n") || "",
          cognitiveSkills: module.cognitiveSkills?.join(", ") || "",
          behavioralSkills: module.behavioralSkills?.join(", ") || "",
          technicalSkills: module.technicalSkills?.join(", ") || "",
          evaluationType: module.evaluationType || "",
          bloomLevel: module.bloomLevel || "understanding"
        }));
        
        setModules(newModules);
        updateModules(newModules);
        
        // Salvar mapeamento de competências se disponível
        if (data.competenciesMap) {
          setCompetenciesMap(data.competenciesMap);
          updatePhaseData(2, {
            moduleCount,
            competenciesMap: data.competenciesMap,
            bloomLevelDistribution: data.bloomLevelDistribution,
            completed: true
          });
        }
        
        updateProgress(2, 100);
        
        toast({
          title: "Estrutura gerada com sucesso",
          description: `Foram gerados ${newModules.length} módulos para o curso.`
        });
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Erro ao gerar estrutura:", error);
      setIsSubmitting(false);
      toast({
        title: "Erro ao gerar estrutura",
        description: "Não foi possível gerar a estrutura de módulos. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Adicionar módulo manualmente
  const handleAddModule = (data: ModuleFormData) => {
    const newModule: CourseModule = {
      id: `module-${Date.now()}`,
      title: data.title,
      description: data.description,
      order: modules.length + 1,
      estimatedHours: data.estimatedHours,
      status: "not_started",
      // Adicionar campos extras do formulário
      objective: data.objective,
      topics: data.topics,
      contents: data.contents,
      activities: data.activities,
      cognitiveSkills: data.cognitiveSkills,
      behavioralSkills: data.behavioralSkills,
      technicalSkills: data.technicalSkills,
      evaluationType: data.evaluationType,
      bloomLevel: data.bloomLevel
    };
    
    const updatedModules = [...modules, newModule];
    setModules(updatedModules);
    updateModules(updatedModules);
    form.reset();
    
    toast({
      title: "Módulo adicionado",
      description: `O módulo "${data.title}" foi adicionado com sucesso.`
    });
  };

  // Editar módulo existente
  const handleEditModule = (index: number) => {
    const module = modules[index];
    setActiveModuleIndex(index);
    
    form.reset({
      title: module.title,
      description: module.description,
      estimatedHours: module.estimatedHours,
      objective: module.objective || "",
      topics: module.topics || "",
      contents: module.contents || "",
      activities: module.activities || "",
      cognitiveSkills: module.cognitiveSkills || "",
      behavioralSkills: module.behavioralSkills || "",
      technicalSkills: module.technicalSkills || "",
      evaluationType: module.evaluationType || "",
      bloomLevel: module.bloomLevel || "understanding"
    });
  };

  // Atualizar módulo após edição
  const handleUpdateModule = (data: ModuleFormData) => {
    if (activeModuleIndex === null) return;
    
    const updatedModules = [...modules];
    updatedModules[activeModuleIndex] = {
      ...updatedModules[activeModuleIndex],
      title: data.title,
      description: data.description,
      estimatedHours: data.estimatedHours,
      objective: data.objective,
      topics: data.topics,
      contents: data.contents,
      activities: data.activities,
      cognitiveSkills: data.cognitiveSkills,
      behavioralSkills: data.behavioralSkills,
      technicalSkills: data.technicalSkills,
      evaluationType: data.evaluationType,
      bloomLevel: data.bloomLevel
    };
    
    setModules(updatedModules);
    updateModules(updatedModules);
    setActiveModuleIndex(null);
    form.reset();
    
    toast({
      title: "Módulo atualizado",
      description: `O módulo "${data.title}" foi atualizado com sucesso.`
    });
  };

  // Remover módulo
  const handleRemoveModule = (index: number) => {
    const newModules = [...modules];
    newModules.splice(index, 1);
    
    // Reordenar os módulos restantes
    const reorderedModules = newModules.map((module, idx) => ({
      ...module,
      order: idx + 1
    }));
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
    
    if (activeModuleIndex === index) {
      setActiveModuleIndex(null);
      form.reset();
    }
    
    toast({
      title: "Módulo removido",
      description: "O módulo foi removido com sucesso."
    });
  };

  // Manipular o reordenamento por drag-and-drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Atualizar a ordem dos módulos
    const reorderedModules = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
  };

  // Submeter e avançar para próxima fase
  const handleSubmit = () => {
    if (modules.length === 0) {
      toast({
        title: "Nenhum módulo criado",
        description: "Por favor, crie pelo menos um módulo antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    // Salvar dados da fase 2
    updatePhaseData(2, {
      moduleCount,
      competenciesMap,
      completed: true
    });
    
    updateProgress(2, 100);
    moveToNextPhase();
    navigate("/phase3");
  };

  // Atualizar o mapeamento de competências
  const updateCompetencyMapping = (competency: string, moduleIndices: string[]) => {
    setCompetenciesMap(prev => ({
      ...prev,
      [competency]: moduleIndices
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={2}
          title="Fase 2: Estrutura" 
          description="Organização dos módulos e estrutura do curso"
          onNext={handleSubmit}
        />
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Sumário do Curso</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Título</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{course?.title || "Não definido"}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Carga Horária</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{course?.estimatedHours || 0} horas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Módulos</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min={1}
                  max={50}
                  value={moduleCount}
                  onChange={(e) => {
                    const newValue = Math.max(1, parseInt(e.target.value) || 1);
                    setModuleCount(newValue);
                    // Salvar no contexto do curso
                    updatePhaseData(2, {
                      ...course?.phaseData?.phase2,
                      moduleCount: newValue,
                      lessonsPerModule
                    });
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">(1-50 módulos)</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Formato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{course?.format || "Não definido"}</p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Tabs defaultValue="module-structure" value={currentTab} onValueChange={setCurrentTab} className="mt-8">
          <TabsList className="mb-6 grid grid-cols-1 md:grid-cols-3">
            <TabsTrigger value="module-structure">Estrutura de Módulos</TabsTrigger>
            <TabsTrigger value="competency-mapping">Mapeamento de Competências</TabsTrigger>
            <TabsTrigger value="module-detail">Detalhamento de Módulo</TabsTrigger>
          </TabsList>
          
          {/* Tab: Estrutura de Módulos */}
          <TabsContent value="module-structure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral da Estrutura Modular</CardTitle>
                <CardDescription>
                  Organize os módulos do curso e defina seus objetivos específicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-sm font-medium mb-1">Número de Módulos</label>
                      <div className="flex items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const newValue = Math.max(1, moduleCount - 1);
                            setModuleCount(newValue);
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              moduleCount: newValue,
                              lessonsPerModule
                            });
                          }}
                          className="h-10 px-3"
                        >
                          <span className="material-icons" style={{ fontSize: '16px' }}>remove</span>
                        </Button>
                        <Input 
                          type="number" 
                          value={moduleCount} 
                          onChange={(e) => {
                            const newValue = Math.max(1, parseInt(e.target.value) || 1);
                            setModuleCount(newValue);
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              moduleCount: newValue,
                              lessonsPerModule
                            });
                          }}
                          min={1}
                          max={50}
                          className="w-20 h-10 text-center mx-2"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const newValue = Math.min(50, moduleCount + 1);
                            setModuleCount(newValue);
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              moduleCount: newValue,
                              lessonsPerModule
                            });
                          }}
                          className="h-10 px-3"
                        >
                          <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="text-sm font-medium mb-1">Aulas por Módulo</label>
                      <div className="flex items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const newValue = Math.max(1, lessonsPerModule - 1);
                            setLessonsPerModule(newValue);
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              moduleCount,
                              lessonsPerModule: newValue
                            });
                          }}
                          className="h-10 px-3"
                        >
                          <span className="material-icons" style={{ fontSize: '16px' }}>remove</span>
                        </Button>
                        <Input 
                          type="number" 
                          value={lessonsPerModule} 
                          onChange={(e) => {
                            const newValue = Math.max(1, parseInt(e.target.value) || 1);
                            setLessonsPerModule(newValue);
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              moduleCount,
                              lessonsPerModule: newValue
                            });
                          }}
                          min={1}
                          max={10}
                          className="w-20 h-10 text-center mx-2"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const newValue = Math.min(10, lessonsPerModule + 1);
                            setLessonsPerModule(newValue);
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              moduleCount,
                              lessonsPerModule: newValue
                            });
                          }}
                          className="h-10 px-3"
                        >
                          <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <h3 className="text-lg font-semibold">Módulos ({modules.length})</h3>
                      <p className="text-sm text-muted-foreground">Arraste para reordenar</p>
                    </div>
                    
                    <Button
                      onClick={() => generateStructure.mutate()}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                          Gerando estrutura...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <span className="material-icons text-sm mr-2">auto_awesome</span>
                          Gerar Estrutura com IA
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Ordem</TableHead>
                      <TableHead>Título do Módulo</TableHead>
                      <TableHead>Objetivo Específico</TableHead>
                      <TableHead className="w-20">Horas</TableHead>
                      <TableHead className="w-24">Nível de Bloom</TableHead>
                      <TableHead className="w-32 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum módulo definido. Gere a estrutura com IA ou adicione manualmente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="modules">
                          {(provided) => (
                            <tbody
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              {modules.map((module, index) => (
                                <Draggable key={module.id} draggableId={module.id} index={index}>
                                  {(provided) => (
                                    <TableRow
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                    >
                                      <TableCell className="font-medium">{module.order}</TableCell>
                                      <TableCell>{module.title}</TableCell>
                                      <TableCell>{module.objective}</TableCell>
                                      <TableCell>{module.estimatedHours}h</TableCell>
                                      <TableCell>
                                        {bloomLevels.find(b => b.value === module.bloomLevel)?.label || "Compreender"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditModule(index)}
                                          className="mr-1"
                                        >
                                          <span className="material-icons text-sm">edit</span>
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveModule(index)}
                                          className="text-red-500"
                                        >
                                          <span className="material-icons text-sm">delete</span>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </tbody>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab: Mapeamento de Competências */}
          <TabsContent value="competency-mapping" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mapeamento de Competências por Módulo</CardTitle>
                  <CardDescription>
                    Defina quais competências serão trabalhadas em cada módulo
                  </CardDescription>
                </div>
                
                <Button
                  variant="default"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  onClick={() => {
                    setIsGeneratingCompetencies(true);
                    
                    // Implementar chamada para gerar mapeamento de competências com IA
                    const courseData = {
                      title: course?.title,
                      theme: course?.theme,
                      moduleCount: moduleCount,
                      modules: modules,
                      phaseData: course?.phaseData?.phase1
                    };
                    
                    // Simular chamada de API (seria substituída pela chamada real)
                    setTimeout(() => {
                      // Criar mapeamento simulado para demonstração
                      const newCompetencyMap: Record<string, string[]> = {};
                      
                      // Popular mapeamento cognitivo
                      modules.forEach(module => {
                        const moduleId = module.id;
                        
                        // Distribuir competências aleatoriamente entre os módulos
                        if (Math.random() > 0.5) newCompetencyMap["cognitiveCompetency"] = [...(newCompetencyMap["cognitiveCompetency"] || []), moduleId];
                        if (Math.random() > 0.5) newCompetencyMap["analyticalThinking"] = [...(newCompetencyMap["analyticalThinking"] || []), moduleId];
                        if (Math.random() > 0.5) newCompetencyMap["problemSolving"] = [...(newCompetencyMap["problemSolving"] || []), moduleId];
                        
                        // Distribuir competências comportamentais
                        if (Math.random() > 0.5) newCompetencyMap["teamwork"] = [...(newCompetencyMap["teamwork"] || []), moduleId];
                        if (Math.random() > 0.5) newCompetencyMap["communication"] = [...(newCompetencyMap["communication"] || []), moduleId];
                        
                        // Distribuir competências técnicas
                        if (Math.random() > 0.5) newCompetencyMap["technicalSkill"] = [...(newCompetencyMap["technicalSkill"] || []), moduleId];
                        if (Math.random() > 0.5) newCompetencyMap["codingPractice"] = [...(newCompetencyMap["codingPractice"] || []), moduleId];
                      });
                      
                      // Atualizar estado
                      setCompetenciesMap(newCompetencyMap);
                      
                      // Salvar no contexto do curso
                      updatePhaseData(2, {
                        ...course?.phaseData?.phase2,
                        competenciesMap: newCompetencyMap,
                        moduleCount,
                        lessonsPerModule
                      });
                      
                      setIsGeneratingCompetencies(false);
                      
                      toast({
                        title: "Mapeamento gerado com sucesso",
                        description: "As competências foram distribuídas entre os módulos de acordo com análise pedagógica.",
                      });
                    }, 1500);
                  }}
                  disabled={isGeneratingCompetencies || modules.length === 0}
                >
                  {isGeneratingCompetencies ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Mapeando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="material-icons text-sm mr-2">psychology</span>
                      Mapear com IA
                    </span>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Competências Cognitivas</h3>
                  {Object.entries(competenciesMap)
                    .filter(([key]) => key.startsWith('cognitiva:'))
                    .map(([key, moduleIds], index) => (
                      <div key={key} className="mb-4 p-3 border rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{key.replace('cognitiva:', '')}</span>
                          <div className="flex gap-2">
                            {modules.map((module, moduleIndex) => (
                              <Button
                                key={module.id}
                                variant={moduleIds.includes(module.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  const newModuleIds = moduleIds.includes(module.id)
                                    ? moduleIds.filter(id => id !== module.id)
                                    : [...moduleIds, module.id];
                                  updateCompetencyMapping(key, newModuleIds);
                                }}
                              >
                                M{module.order}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Competências Comportamentais</h3>
                  {Object.entries(competenciesMap)
                    .filter(([key]) => key.startsWith('comportamental:'))
                    .map(([key, moduleIds], index) => (
                      <div key={key} className="mb-4 p-3 border rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{key.replace('comportamental:', '')}</span>
                          <div className="flex gap-2">
                            {modules.map((module, moduleIndex) => (
                              <Button
                                key={module.id}
                                variant={moduleIds.includes(module.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  const newModuleIds = moduleIds.includes(module.id)
                                    ? moduleIds.filter(id => id !== module.id)
                                    : [...moduleIds, module.id];
                                  updateCompetencyMapping(key, newModuleIds);
                                }}
                              >
                                M{module.order}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Competências Técnicas</h3>
                  {Object.entries(competenciesMap)
                    .filter(([key]) => key.startsWith('tecnica:'))
                    .map(([key, moduleIds], index) => (
                      <div key={key} className="mb-4 p-3 border rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{key.replace('tecnica:', '')}</span>
                          <div className="flex gap-2">
                            {modules.map((module, moduleIndex) => (
                              <Button
                                key={module.id}
                                variant={moduleIds.includes(module.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  const newModuleIds = moduleIds.includes(module.id)
                                    ? moduleIds.filter(id => id !== module.id)
                                    : [...moduleIds, module.id];
                                  updateCompetencyMapping(key, newModuleIds);
                                }}
                              >
                                M{module.order}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab: Detalhamento de Módulo */}
          <TabsContent value="module-detail" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeModuleIndex !== null 
                    ? `Editar Módulo: ${modules[activeModuleIndex]?.title}`
                    : "Adicionar Novo Módulo"}
                </CardTitle>
                <CardDescription>
                  Defina os detalhes do módulo, incluindo conteúdo, atividades e competências
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(activeModuleIndex !== null ? handleUpdateModule : handleAddModule)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        name="estimatedHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carga Horária (horas)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={40} 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Módulo</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva brevemente o conteúdo deste módulo"
                              className="min-h-[80px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="objective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo Específico</FormLabel>
                          <FormDescription>
                            Use um verbo de ação + conteúdo + contexto (Ex: Compreender os fundamentos do JavaScript para desenvolvimento web)
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="Defina o objetivo específico deste módulo"
                              className="min-h-[80px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bloomLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível Cognitivo (Taxonomia de Bloom)</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o nível cognitivo" />
                              </SelectTrigger>
                              <SelectContent>
                                {bloomLevels.map(level => (
                                  <SelectItem key={level.value} value={level.value}>
                                    {level.label} - {level.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Accordion type="single" collapsible defaultValue="section-1" className="w-full">
                      <AccordionItem value="section-1">
                        <AccordionTrigger className="text-base font-semibold">
                          Conteúdos e Atividades
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6">
                          <FormField
                            control={form.control}
                            name="topics"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tópicos Abordados</FormLabel>
                                <FormDescription>
                                  Liste os principais tópicos que serão abordados (um por linha)
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Variáveis e tipos de dados&#10;Estruturas de controle&#10;Funções e escopo"
                                    className="min-h-[120px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="contents"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Conteúdos Esperados (formatos)</FormLabel>
                                <FormDescription>
                                  Liste os formatos de conteúdo que serão utilizados (um por linha)
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Vídeo explicativo&#10;Infográfico&#10;Simulação interativa"
                                    className="min-h-[120px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="activities"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Atividades Esperadas</FormLabel>
                                <FormDescription>
                                  Liste as atividades que serão realizadas neste módulo (uma por linha)
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Quiz com 5 questões&#10;Exercício prático&#10;Discussão em fórum"
                                    className="min-h-[120px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="evaluationType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Avaliação</FormLabel>
                                <FormDescription>
                                  Descreva como o aprendizado será avaliado neste módulo
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Avaliação objetiva com feedback automatizado"
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="section-2">
                        <AccordionTrigger className="text-base font-semibold">
                          Competências Desenvolvidas
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6">
                          <FormField
                            control={form.control}
                            name="cognitiveSkills"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Competências Cognitivas</FormLabel>
                                <FormDescription>
                                  Liste as principais competências cognitivas desenvolvidas neste módulo
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Compreensão de conceitos, análise de problemas, síntese de soluções"
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="behavioralSkills"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Competências Comportamentais</FormLabel>
                                <FormDescription>
                                  Liste as principais competências comportamentais desenvolvidas neste módulo
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Trabalho em equipe, comunicação, resiliência"
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="technicalSkills"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Competências Técnicas</FormLabel>
                                <FormDescription>
                                  Liste as principais competências técnicas desenvolvidas neste módulo
                                </FormDescription>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: Uso de ferramentas específicas, aplicação de metodologias"
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="flex justify-end space-x-2">
                      {activeModuleIndex !== null && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setActiveModuleIndex(null);
                            form.reset();
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                      
                      <Button type="submit">
                        {activeModuleIndex !== null ? "Atualizar Módulo" : "Adicionar Módulo"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}