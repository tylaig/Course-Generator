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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [lessonConfigModalOpen, setLessonConfigModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [isGeneratingLessonContent, setIsGeneratingLessonContent] = useState(false);

  // Formulário para edição de módulos
  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
      estimatedHours: 4,
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

  // Preenche os módulos do curso quando o componente é carregado
  useEffect(() => {
    if (course?.modules?.length) {
      setModules(course.modules);
    }
    
    // Recuperar a configuração de módulos e aulas se existirem
    if (course?.phaseData?.phase2) {
      const phaseData = course.phaseData.phase2;
      
      if (phaseData.moduleCount) {
        setModuleCount(phaseData.moduleCount);
      }
      
      if (phaseData.lessonsPerModule) {
        setLessonsPerModule(phaseData.lessonsPerModule);
      }
      
      if (phaseData.competenciesMap) {
        setCompetenciesMap(phaseData.competenciesMap);
      }
    }
  }, [course]);
  
  // Efeito separado para atualizar o progresso
  useEffect(() => {
    if (course) {
      // Atualizar o progresso para a fase 2
      updateProgress(2, modules.length > 0 ? 50 : 10);
    }
  }, [course, modules.length, updateProgress]);

  // Função para lidar com o redirecionamento para a fase 1
  const handleGoBack = () => {
    navigate("/phase1");
  };

  // Função para lidar com o redirecionamento para a fase 3
  const handleSubmit = () => {
    moveToNextPhase();
    navigate("/phase3");
  };
  
  // Função para gerar conteúdo de aulas com IA
  const generateLessonContent = async () => {
    if (!selectedModule || !course) return;
    
    setIsGeneratingLessonContent(true);
    
    try {
      // Obter os dados do curso e fase da Fase 1
      const courseData = {
        id: course.id,
        title: course.title,
        theme: course.theme,
        estimatedHours: course.estimatedHours,
        format: course.format,
        platform: course.platform,
        deliveryFormat: course.deliveryFormat,
        ...course.phaseData?.phase1
      };
      
      // Obter a configuração de IA
      const aiConfig = course.aiConfig || {
        model: "gpt-4o",
        optimization: "quality",
        languageStyle: "formal",
        difficultyLevel: "intermediate",
        contentDensity: 0.7,
        teachingApproach: "practical",
        contentTypes: ["text", "exercises", "examples", "questions"]
      };
      
      // Preparar o módulo atualizado com as aulas geradas
      const updatedModule = { ...selectedModule };
      
      // Verificar se o módulo já tem aulas
      if (!updatedModule.lessons || !Array.isArray(updatedModule.lessons) || updatedModule.lessons.length === 0) {
        // Criar estrutura de aulas vazia com base no número de aulas por módulo
        updatedModule.lessons = Array.from({ length: lessonsPerModule }).map((_, index) => ({
          id: `${updatedModule.id}-lesson-${index + 1}`,
          title: `Aula ${index + 1}`,
          description: "",
          order: index + 1,
          content: {},
          activities: [],
          resources: [],
          status: "pending"
        }));
      }
      
      // Gerar conteúdo para cada aula
      const response = await fetch('/api/generate/module-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          moduleId: updatedModule.id,
          courseId: course.id,
          module: updatedModule,
          courseDetails: courseData,
          aiConfig
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na geração do conteúdo: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Atualizar o módulo com o conteúdo gerado
      if (data && data.lessons) {
        updatedModule.lessons = data.lessons.map((lessonData: any, index: number) => {
          return {
            ...updatedModule.lessons[index],
            title: lessonData.title || updatedModule.lessons[index].title,
            description: lessonData.description || "",
            content: lessonData.content || {},
            activities: lessonData.activities || [],
            resources: lessonData.resources || [],
            status: "completed"
          };
        });
        
        // Atualizar o módulo na lista de módulos
        const updatedModules = modules.map(mod => 
          mod.id === updatedModule.id ? updatedModule : mod
        );
        
        setModules(updatedModules);
        updateModules(updatedModules);
        
        toast({
          title: "Conteúdo gerado com sucesso",
          description: `As aulas do módulo "${updatedModule.title}" foram criadas com assistência de IA.`,
        });
      }
    } catch (error) {
      console.error("Erro ao gerar conteúdo de aulas:", error);
      toast({
        title: "Erro ao gerar conteúdo",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingLessonContent(false);
      setLessonConfigModalOpen(false);
    }
  };

  // Função para lidar com adição de módulos
  const handleAddModule = (data: ModuleFormData) => {
    const newModule: CourseModule = {
      id: `module-${Date.now()}`,
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
      bloomLevel: data.bloomLevel,
      order: modules.length + 1,
      status: "pending",
      lessons: []
    };
    
    // Adicionar o novo módulo à lista de módulos
    const updatedModules = [...modules, newModule];
    setModules(updatedModules);
    updateModules(updatedModules);
    
    // Resetar o formulário
    form.reset();
    
    // Atualizar o progresso para a fase 2
    updateProgress(2, Math.min(90, 20 + (updatedModules.length * 10)));
    
    toast({
      title: "Módulo adicionado com sucesso",
      description: `O módulo "${data.title}" foi adicionado ao curso.`,
    });
  };

  // Função para lidar com atualização de módulos
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
    
    // Resetar o formulário e o índice do módulo ativo
    form.reset();
    setActiveModuleIndex(null);
    
    toast({
      title: "Módulo atualizado com sucesso",
      description: `O módulo "${data.title}" foi atualizado.`,
    });
  };

  // Função para lidar com remoção de módulos
  const handleRemoveModule = (index: number) => {
    const updatedModules = [...modules];
    updatedModules.splice(index, 1);
    
    // Atualizar a ordem dos módulos
    updatedModules.forEach((module, i) => {
      module.order = i + 1;
    });
    
    setModules(updatedModules);
    updateModules(updatedModules);
    
    // Atualizar o progresso para a fase 2
    updateProgress(2, Math.max(10, 20 + (updatedModules.length * 10)));
    
    toast({
      title: "Módulo removido com sucesso",
      description: "O módulo foi removido do curso.",
    });
  };

  // Função para lidar com edição de módulos
  const handleEditModule = (index: number) => {
    const moduleToEdit = modules[index];
    
    form.reset({
      title: moduleToEdit.title,
      description: moduleToEdit.description,
      estimatedHours: moduleToEdit.estimatedHours,
      objective: moduleToEdit.objective || "",
      topics: moduleToEdit.topics || "",
      contents: moduleToEdit.contents || "",
      activities: moduleToEdit.activities || "",
      cognitiveSkills: moduleToEdit.cognitiveSkills || "",
      behavioralSkills: moduleToEdit.behavioralSkills || "",
      technicalSkills: moduleToEdit.technicalSkills || "",
      evaluationType: moduleToEdit.evaluationType || "",
      bloomLevel: moduleToEdit.bloomLevel || "understanding"
    });
    
    setActiveModuleIndex(index);
  };

  // Função para lidar com o arraste e solte de módulos
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const reorderedModules = Array.from(modules);
    const [removed] = reorderedModules.splice(result.source.index, 1);
    reorderedModules.splice(result.destination.index, 0, removed);
    
    // Atualizar a ordem dos módulos
    reorderedModules.forEach((module, i) => {
      module.order = i + 1;
    });
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
  };
  
  // Função para atualizar o valor do mapeamento de competências
  const updateCompetencyMapping = (competency: string, moduleIds: string[]) => {
    const updatedMap = { ...competenciesMap };
    updatedMap[competency] = moduleIds;
    setCompetenciesMap(updatedMap);
    
    // Persistir a alteração
    updatePhaseData(2, {
      ...course?.phaseData?.phase2,
      competenciesMap: updatedMap,
      moduleCount,
      lessonsPerModule
    });
  };

  // Função para continuar para a próxima fase
  const handleContinue = () => {
    setIsSubmitting(true);
    
    // Persistir dados na próxima fase
    if (modules.length > 0) {
      updatePhaseData(2, {
        competenciesMap,
        moduleCount,
        lessonsPerModule
      });
      
      updateModules(modules);
      updateProgress(2, 100);
      moveToNextPhase();
      navigate("/phase3");
    } else {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um módulo antes de continuar",
        variant: "destructive"
      });
    }
    
    setIsSubmitting(false);
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
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="module-structure">Estrutura de Módulos</TabsTrigger>
            <TabsTrigger value="competency-mapping">Mapeamento de Competências</TabsTrigger>
            <TabsTrigger value="detailed-planning">Planejamento Detalhado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="module-structure" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Estrutura de Módulos</CardTitle>
                <CardDescription>
                  Defina os módulos que compõem seu curso. Arraste os módulos para reorganizá-los.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantidade de Módulos
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModuleCount(Math.max(1, moduleCount - 1))}
                      >
                        -
                      </Button>
                      <span className="min-w-[40px] text-center">{moduleCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModuleCount(Math.min(50, moduleCount + 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Aulas por Módulo
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLessonsPerModule(Math.max(1, lessonsPerModule - 1))}
                      >
                        -
                      </Button>
                      <span className="min-w-[40px] text-center">{lessonsPerModule}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLessonsPerModule(Math.min(10, lessonsPerModule + 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        updatePhaseData(2, {
                          ...course?.phaseData?.phase2,
                          moduleCount,
                          lessonsPerModule
                        });
                        
                        toast({
                          title: "Configurações salvas",
                          description: `O curso terá ${moduleCount} módulos com ${lessonsPerModule} aulas cada.`
                        });
                      }}
                    >
                      Salvar Configuração
                    </Button>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      onClick={() => {
                        // Esta funcionalidade poderia gerar automaticamente os módulos com base no briefing da Fase 1
                        toast({
                          title: "Gerar Módulos com IA",
                          description: "Esta funcionalidade será implementada na próxima atualização."
                        });
                      }}
                    >
                      <span className="material-icons mr-2">auto_awesome</span>
                      Gerar Módulos com IA
                    </Button>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      onClick={() => setLessonConfigModalOpen(true)}
                    >
                      <span className="material-icons mr-2">class</span>
                      Configurar Aulas
                    </Button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Adicionar/Editar Módulo</h3>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(activeModuleIndex !== null ? handleUpdateModule : handleAddModule)}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título do Módulo</FormLabel>
                              <FormControl>
                                <Input placeholder="Introdução ao tema" {...field} />
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
                                <Input type="number" min="1" {...field} />
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
                          <FormItem className="mb-4">
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Breve descrição do módulo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Accordion type="single" collapsible className="w-full mb-4">
                        <AccordionItem value="section-1">
                          <AccordionTrigger className="text-base font-semibold">
                            Detalhes do Módulo
                          </AccordionTrigger>
                          <AccordionContent className="space-y-6">
                            <FormField
                              control={form.control}
                              name="objective"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Objetivo do Módulo</FormLabel>
                                  <FormDescription>
                                    Descreva o objetivo principal deste módulo
                                  </FormDescription>
                                  <FormControl>
                                    <Textarea placeholder="Capacitar o aluno a..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="topics"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tópicos Abordados</FormLabel>
                                  <FormDescription>
                                    Liste os principais tópicos abordados no módulo (separados por vírgula)
                                  </FormDescription>
                                  <FormControl>
                                    <Textarea placeholder="Conceitos básicos, fundamentos..." {...field} />
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
                                  <FormLabel>Conteúdos Propostos</FormLabel>
                                  <FormDescription>
                                    Liste os tipos de conteúdo que serão abordados (separados por vírgula)
                                  </FormDescription>
                                  <FormControl>
                                    <Textarea placeholder="Vídeos, textos, atividades práticas..." {...field} />
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
                                  <FormLabel>Atividades Previstas</FormLabel>
                                  <FormDescription>
                                    Liste as atividades propostas para este módulo (separadas por vírgula)
                                  </FormDescription>
                                  <FormControl>
                                    <Textarea placeholder="Exercícios, projetos, discussões..." {...field} />
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
                                  <FormLabel>Método de Avaliação</FormLabel>
                                  <FormDescription>
                                    Como os alunos serão avaliados neste módulo
                                  </FormDescription>
                                  <FormControl>
                                    <Textarea placeholder="Questionário, projeto, apresentação..." {...field} />
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
                                  <FormLabel>Nível da Taxonomia de Bloom</FormLabel>
                                  <FormDescription>
                                    Selecione o nível cognitivo principal trabalhado neste módulo
                                  </FormDescription>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione um nível" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {bloomLevels.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                          {level.label} - {level.description}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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
                                    <Textarea placeholder="Análise crítica, resolução de problemas..." {...field} />
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
                                    <Textarea placeholder="Trabalho em equipe, comunicação..." {...field} />
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
                                    <Textarea placeholder="Programação, design, análise de dados..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                      <div className="space-y-3">
                        {/* Botões de geração com IA */}
                        <div className="flex gap-2 justify-start">
                          <Button
                            type="button"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            onClick={() => {
                              toast({
                                title: "Geração de Detalhes com IA",
                                description: "Esta funcionalidade de preenchimento automático será disponibilizada em breve."
                              });
                            }}
                          >
                            <span className="material-icons mr-2">auto_awesome</span>
                            Preencher Detalhes com IA
                          </Button>
                          
                          <Button
                            type="button"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            onClick={() => {
                              toast({
                                title: "Geração de Competências",
                                description: "Esta funcionalidade será disponibilizada em breve."
                              });
                            }}
                          >
                            <span className="material-icons mr-2">psychology</span>
                            Gerar Competências
                          </Button>
                        </div>
                        
                        {/* Botões de controle do formulário */}
                        <div className="flex justify-end gap-2">
                          {activeModuleIndex !== null && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                form.reset();
                                setActiveModuleIndex(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          )}
                          
                          <Button type="submit">
                            {activeModuleIndex !== null ? "Atualizar Módulo" : "Adicionar Módulo"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Módulos do Curso ({modules.length})</h3>
                  
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="modules">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {modules.map((module, index) => (
                            <Draggable key={module.id} draggableId={module.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="border rounded-md p-4 bg-white"
                                >
                                  <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1" className="border-none">
                                      <AccordionTrigger className="py-2 hover:no-underline">
                                        <div className="flex items-center">
                                          <span className="material-icons text-gray-500 mr-2">
                                            drag_indicator
                                          </span>
                                          <div>
                                            <h4 className="text-base font-medium text-left">
                                              Módulo {module.order}: {module.title}
                                            </h4>
                                            <p className="text-sm text-gray-500 text-left">
                                              {module.estimatedHours}h • {module.description?.substring(0, 60)}
                                              {module.description?.length > 60 ? "..." : ""}
                                            </p>
                                          </div>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <h5 className="font-medium">Objetivo:</h5>
                                              <p className="text-sm">{module.objective}</p>
                                            </div>
                                            <div>
                                              <h5 className="font-medium">Tópicos:</h5>
                                              <p className="text-sm">{module.topics}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="border-t pt-4">
                                            <h5 className="font-medium mb-2">Aulas Previstas:</h5>
                                            
                                            <div className="bg-gray-50 p-3 rounded-md mb-4">
                                              <p className="text-sm text-gray-700">
                                                Este módulo terá <span className="font-medium">{lessonsPerModule}</span> aulas.
                                                Utilize o botão "Configurar Aulas" para criar o conteúdo de cada aula automaticamente.
                                              </p>
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                              <div className="space-x-1">
                                                <Button variant="outline" size="sm" className="text-xs h-8">
                                                  <span className="material-icons text-xs mr-1">add</span>
                                                  Adicionar Aula
                                                </Button>
                                                <div className="space-x-1">
                                                  <Button 
                                                    variant="default" 
                                                    size="sm" 
                                                    className="text-xs h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                                    onClick={() => {
                                                      // Abrir o modal de configuração de aulas
                                                      setLessonConfigModalOpen(true);
                                                      setSelectedModule(module);
                                                    }}
                                                  >
                                                    <span className="material-icons text-xs mr-1">auto_awesome</span>
                                                    Configurar Aulas
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="flex justify-end space-x-2 pt-2 border-t">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleEditModule(index)}
                                            >
                                              <span className="material-icons text-xs mr-1">edit</span>
                                              Editar
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => handleRemoveModule(index)}
                                            >
                                              <span className="material-icons text-xs mr-1">delete</span>
                                              Remover
                                            </Button>
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                  
                  {modules.length === 0 && (
                    <div className="border rounded-md p-6 text-center bg-gray-50">
                      <p className="text-gray-500 mb-4">Nenhum módulo adicionado ainda</p>
                      <p className="text-sm text-gray-400">
                        Use o formulário acima para adicionar seus módulos
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleContinue} disabled={modules.length === 0 || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Processando...
                      </>
                    ) : (
                      "Continuar para Fase 3"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="competency-mapping" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de Competências</CardTitle>
                <CardDescription>
                  Defina quais módulos desenvolvem cada competência. Isto auxiliará no planejamento pedagógico.
                </CardDescription>
                <div className="mt-4">
                  <Button 
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => {
                      setIsGeneratingCompetencies(true);
                      
                      // Chamar a API para mapeamento de competências
                      const generateMapping = async () => {
                        try {
                          // Obter os dados do curso e fase da Fase 1
                          const courseData = {
                            id: course?.id,
                            title: course?.title,
                            theme: course?.theme,
                            estimatedHours: course?.estimatedHours,
                            format: course?.format,
                            platform: course?.platform,
                            deliveryFormat: course?.deliveryFormat,
                            ...course?.phaseData?.phase1
                          };
                          
                          // Fazer a chamada para a API
                          const response = await fetch('/api/generate/competency-mapping', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              courseId: course?.id,
                              modules: modules,
                              courseDetails: courseData
                            })
                          });
                          
                          if (!response.ok) {
                            throw new Error(`Erro na geração do mapeamento: ${response.status}`);
                          }
                          
                          const data = await response.json();
                          
                          // Verificar se temos o mapeamento de competências
                          if (data.success && data.competenciesMap) {
                            // Formatar e adicionar os prefixos às competências, caso não tenham
                            const formattedMap: Record<string, string[]> = {};
                            
                            // Processar o mapa retornado pela API, garantindo que as competências 
                            // tenham os prefixos corretos (cognitiva:, comportamental:, tecnica:)
                            Object.entries(data.competenciesMap).forEach(([key, moduleIds]) => {
                              // Verificar se a chave já tem um dos prefixos
                              const hasPrefix = key.startsWith('cognitiva:') || 
                                               key.startsWith('comportamental:') || 
                                               key.startsWith('tecnica:');
                              
                              if (hasPrefix) {
                                formattedMap[key] = moduleIds as string[];
                              } else {
                                // Tentar determinar o tipo de competência pelo conteúdo
                                // e adicionar o prefixo apropriado
                                if (course?.phaseData?.phase1?.cognitiveSkills?.includes(key)) {
                                  formattedMap[`cognitiva:${key}`] = moduleIds as string[];
                                } else if (course?.phaseData?.phase1?.behavioralSkills?.includes(key)) {
                                  formattedMap[`comportamental:${key}`] = moduleIds as string[];
                                } else if (course?.phaseData?.phase1?.technicalSkills?.includes(key)) {
                                  formattedMap[`tecnica:${key}`] = moduleIds as string[];
                                } else {
                                  // Se não for possível determinar, usar como está
                                  formattedMap[key] = moduleIds as string[];
                                }
                              }
                            });
                            
                            // Atualizar estado
                            setCompetenciesMap(formattedMap);
                            
                            // Salvar no contexto do curso
                            updatePhaseData(2, {
                              ...course?.phaseData?.phase2,
                              competenciesMap: formattedMap,
                              moduleCount,
                              lessonsPerModule
                            });
                            
                            toast({
                              title: "Mapeamento gerado com sucesso",
                              description: "As competências foram distribuídas entre os módulos de acordo com análise pedagógica.",
                            });
                          } else {
                            throw new Error('Formato de resposta inválido ou erro na geração');
                          }
                        } catch (error) {
                          console.error("Erro ao mapear competências:", error);
                          toast({
                            title: "Erro ao mapear competências",
                            description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
                            variant: "destructive"
                          });
                        } finally {
                          setIsGeneratingCompetencies(false);
                        }
                      };
                      
                      // Executar o mapeamento
                      generateMapping();
                    }}
                    disabled={isGeneratingCompetencies || modules.length === 0}
                  >
                    {isGeneratingCompetencies ? (
                      <>
                        <span className="animate-spin mr-2">
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </span>
                        Gerando Mapeamento...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2">auto_awesome</span>
                        Mapear com IA
                      </>
                    )}
                  </Button>
                </div>
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
                        <div className="text-sm text-gray-600">
                          Módulos que trabalham esta competência:
                          {moduleIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {moduleIds.map(moduleId => {
                                const module = modules.find(m => m.id === moduleId);
                                return module ? (
                                  <span key={moduleId} className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                    Módulo {module.order}: {module.title}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 ml-1">Nenhum módulo selecionado</span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                  {Object.entries(competenciesMap).filter(([key]) => key.startsWith('cognitiva:')).length === 0 && (
                    <div className="text-gray-500 mb-4">
                      Nenhuma competência cognitiva mapeada. Use o botão "Mapear com IA" para gerar automaticamente.
                    </div>
                  )}
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
                        <div className="text-sm text-gray-600">
                          Módulos que trabalham esta competência:
                          {moduleIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {moduleIds.map(moduleId => {
                                const module = modules.find(m => m.id === moduleId);
                                return module ? (
                                  <span key={moduleId} className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                    Módulo {module.order}: {module.title}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 ml-1">Nenhum módulo selecionado</span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                  {Object.entries(competenciesMap).filter(([key]) => key.startsWith('comportamental:')).length === 0 && (
                    <div className="text-gray-500 mb-4">
                      Nenhuma competência comportamental mapeada. Use o botão "Mapear com IA" para gerar automaticamente.
                    </div>
                  )}
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
                        <div className="text-sm text-gray-600">
                          Módulos que trabalham esta competência:
                          {moduleIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {moduleIds.map(moduleId => {
                                const module = modules.find(m => m.id === moduleId);
                                return module ? (
                                  <span key={moduleId} className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                    Módulo {module.order}: {module.title}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 ml-1">Nenhum módulo selecionado</span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                  {Object.entries(competenciesMap).filter(([key]) => key.startsWith('tecnica:')).length === 0 && (
                    <div className="text-gray-500 mb-4">
                      Nenhuma competência técnica mapeada. Use o botão "Mapear com IA" para gerar automaticamente.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="detailed-planning" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Planejamento Detalhado</CardTitle>
                <CardDescription>
                  Visualize a distribuição completa de competências e aulas ao longo do curso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>
                    Planejamento de Módulos e Competências
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Módulo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Competências Desenvolvidas</TableHead>
                      <TableHead className="text-right">Aulas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.sort((a, b) => a.order - b.order).map((module) => (
                      <TableRow key={module.id}>
                        <TableCell className="font-medium">Módulo {module.order}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{module.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {module.estimatedHours}h • {module.bloomLevel && bloomLevels.find(b => b.value === module.bloomLevel)?.label}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(competenciesMap)
                              .filter(([_, moduleIds]) => moduleIds.includes(module.id))
                              .map(([key]) => {
                                let type = "";
                                let color = "";
                                let cleanKey = key;
                                
                                if (key.startsWith('cognitiva:')) {
                                  type = "C";
                                  color = "bg-blue-50 text-blue-700";
                                  cleanKey = key.replace('cognitiva:', '');
                                } else if (key.startsWith('comportamental:')) {
                                  type = "B";
                                  color = "bg-green-50 text-green-700";
                                  cleanKey = key.replace('comportamental:', '');
                                } else if (key.startsWith('tecnica:')) {
                                  type = "T";
                                  color = "bg-purple-50 text-purple-700";
                                  cleanKey = key.replace('tecnica:', '');
                                }
                                
                                return (
                                  <span key={key} className={`inline-block px-2 py-0.5 rounded text-xs ${color}`}>
                                    {type && `${type}: `}{cleanKey}
                                  </span>
                                );
                              })}
                              
                            {Object.entries(competenciesMap)
                              .filter(([_, moduleIds]) => moduleIds.includes(module.id))
                              .length === 0 && (
                              <span className="text-xs text-gray-400">
                                Nenhuma competência mapeada
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {lessonsPerModule}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal de Configuração de Aulas */}
      <Dialog open={lessonConfigModalOpen} onOpenChange={setLessonConfigModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configurar Aulas do Módulo</DialogTitle>
            <DialogDescription>
              {selectedModule ? `Módulo: ${selectedModule.title}` : 'Selecione um módulo'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Configurações do Módulo</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Esse módulo terá {lessonsPerModule} aulas geradas automaticamente com base na estratégia didática definida.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <p className="text-sm font-medium">Objetivos:</p>
                  <p className="text-xs text-muted-foreground">{selectedModule?.objective || "Não definido"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tópicos:</p>
                  <p className="text-xs text-muted-foreground">{selectedModule?.topics || "Não definido"}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">Geração de Conteúdo com IA</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                O sistema vai gerar automaticamente o conteúdo para as {lessonsPerModule} aulas deste módulo, 
                distribuindo os tópicos e competências definidos no módulo.
              </p>
              
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <span className="material-icons text-blue-600 mr-2">auto_awesome</span>
                  <span className="text-sm">Títulos e descrições personalizadas para cada aula</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-blue-600 mr-2">auto_awesome</span>
                  <span className="text-sm">Conteúdo pedagógico alinhado ao objetivo do módulo</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons text-blue-600 mr-2">auto_awesome</span>
                  <span className="text-sm">Atividades e recursos educacionais para cada aula</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={generateLessonContent}
              disabled={isGeneratingLessonContent}
            >
              {isGeneratingLessonContent ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Gerando Aulas...
                </>
              ) : (
                <>
                  <span className="material-icons mr-2">auto_awesome</span>
                  Gerar Aulas com IA
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}