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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModuleCard } from "@/components/modules/module-card";
import { CompetencyMap } from "@/components/modules/competency-map";
import { useToast } from "@/hooks/use-toast";
import { useCourse } from "@/context/CourseContext";
import { apiRequest } from "@/lib/queryClient";
import { CourseModule, Phase } from "@/types";

// Schema para o formulário de módulo
const moduleSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  estimatedHours: z.coerce.number().min(1, "A carga horária deve ser de pelo menos 1 hora"),
  objective: z.string().optional(),
  topics: z.string().optional(),
  activities: z.string().optional(),
  contentTypes: z.array(z.string()).optional(),
  evaluationType: z.string().optional(),
  cognitiveSkills: z.string().optional(),
  behavioralSkills: z.string().optional(),
  technicalSkills: z.string().optional(),
  bloomLevel: z.string().default("understanding")
});

// Lista de níveis da taxonomia de Bloom
const bloomLevels = [
  { value: "remembering", label: "Lembrar", description: "Reconhecer e recordar informações" },
  { value: "understanding", label: "Entender", description: "Compreender e interpretar informações" },
  { value: "applying", label: "Aplicar", description: "Usar o conhecimento em situações novas" },
  { value: "analyzing", label: "Analisar", description: "Dividir informações em partes para explorar relações" },
  { value: "evaluating", label: "Avaliar", description: "Fazer julgamentos baseados em critérios" },
  { value: "creating", label: "Criar", description: "Produzir trabalho original ou propor alternativas" }
];

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function Phase2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    course,
    updatePhaseData,
    updateModules,
    updateProgress,
    moveToNextPhase
  } = useCourse();

  const [activeTab, setActiveTab] = useState("modules");
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [isGeneratingModules, setIsGeneratingModules] = useState(false);
  const [isGeneratingLessonContent, setIsGeneratingLessonContent] = useState(false);
  const [lessonConfigModalOpen, setLessonConfigModalOpen] = useState(false);
  const [competenciesMap, setCompetenciesMap] = useState<any>({});
  const [moduleCount, setModuleCount] = useState(5);
  const [lessonsPerModule, setLessonsPerModule] = useState(5);

  // Formulário para adicionar ou editar módulos
  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
      estimatedHours: 2,
      objective: "",
      topics: "",
      activities: "",
      contentTypes: [],
      evaluationType: "",
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
  
  // Função para configurar aulas do módulo
  const handleConfigureLessons = async () => {
    if (!selectedModule || !course) return;
    
    setIsGeneratingLessonContent(true);
    
    try {
      // Exibir mensagem informativa
      toast({
        title: "Gerando conteúdo",
        description: "O conteúdo das aulas está sendo gerado com assistência de IA. Isso pode levar alguns segundos."
      });
      
      // Simular sucesso para a demonstração 
      setTimeout(() => {
        // Criar estrutura de aulas
        const lessons = Array.from({ length: lessonsPerModule }).map((_, index) => ({
          id: `${selectedModule.id}-lesson-${index + 1}`,
          title: `Aula ${index + 1}: ${selectedModule.title.split(' ').slice(0, 2).join(' ')}...`,
          description: `Conteúdo relacionado a "${selectedModule.topics?.split(',')[index % 3] || 'tópico ' + (index+1)}"`,
          order: index + 1,
          status: "generated"
        }));
        
        // Criar um módulo atualizado com as aulas
        const updatedModule = {
          ...selectedModule,
          status: "in_progress",
          content: {
            text: selectedModule.topics || "Conteúdo principal do módulo",
            activities: selectedModule.activities?.split(",") || []
          }
        };
        
        // Atualizar o módulo na lista de módulos
        const updatedModules = modules.map(mod => 
          mod.id === selectedModule.id ? updatedModule : mod
        );
        
        setModules(updatedModules);
        updateModules(updatedModules);
        
        // Fechar o modal de configuração
        setLessonConfigModalOpen(false);
        setIsGeneratingLessonContent(false);
        
        toast({
          title: "Aulas configuradas com sucesso",
          description: `As ${lessonsPerModule} aulas do módulo "${selectedModule.title}" foram configuradas.`
        });
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao configurar aulas:", error);
      toast({
        title: "Erro na configuração de aulas",
        description: "Não foi possível configurar as aulas deste módulo. Tente novamente mais tarde.",
        variant: "destructive"
      });
      setIsGeneratingLessonContent(false);
    }
  };

  // Função para lidar com adição de módulos
  const handleAddModule = (data: ModuleFormData) => {
    const newModule: CourseModule = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      order: modules.length + 1,
      estimatedHours: data.estimatedHours,
      status: "not_started",
      objective: data.objective,
      topics: data.topics,
      activities: data.activities,
      contentTypes: data.contentTypes || [],
      evaluationType: data.evaluationType,
      cognitiveSkills: data.cognitiveSkills,
      behavioralSkills: data.behavioralSkills,
      technicalSkills: data.technicalSkills,
      bloomLevel: data.bloomLevel
    };
    
    const updatedModules = [...modules, newModule];
    setModules(updatedModules);
    updateModules(updatedModules);
    
    form.reset();
    setShowModuleForm(false);
    
    updateProgress(2, 30);
    
    toast({
      title: "Módulo adicionado",
      description: `O módulo "${data.title}" foi adicionado com sucesso.`,
    });
  };
  
  // Função para lidar com edição de módulos
  const handleUpdateModule = (data: ModuleFormData) => {
    if (activeModuleIndex === null) return;
    
    const updatedModule = {
      ...modules[activeModuleIndex],
      title: data.title,
      description: data.description,
      estimatedHours: data.estimatedHours,
      objective: data.objective,
      topics: data.topics,
      activities: data.activities,
      contentTypes: data.contentTypes || [],
      evaluationType: data.evaluationType,
      cognitiveSkills: data.cognitiveSkills,
      behavioralSkills: data.behavioralSkills,
      technicalSkills: data.technicalSkills,
      bloomLevel: data.bloomLevel
    };
    
    const updatedModules = [...modules];
    updatedModules[activeModuleIndex] = updatedModule;
    
    setModules(updatedModules);
    updateModules(updatedModules);
    
    form.reset();
    setActiveModuleIndex(null);
    
    setShowModuleForm(false);
    
    toast({
      title: "Módulo atualizado",
      description: `O módulo "${data.title}" foi atualizado com sucesso.`,
    });
  };
  
  // Função para lidar com exclusão de módulos
  const handleDeleteModule = (index: number) => {
    const updatedModules = modules.filter((_, i) => i !== index);
    
    // Reordenar os módulos restantes
    const reorderedModules = updatedModules.map((module, i) => ({
      ...module,
      order: i + 1
    }));
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
    
    form.reset();
    
    // Atualizar o progresso com base no número de módulos restantes
    updateProgress(2, reorderedModules.length > 0 ? 30 : 10);
    
    toast({
      title: "Módulo removido",
      description: "O módulo foi removido com sucesso.",
    });
  };
  
  // Função para editar um módulo existente
  const handleEditModule = (index: number) => {
    const module = modules[index];
    
    form.reset({
      title: module.title,
      description: module.description,
      estimatedHours: module.estimatedHours,
      objective: module.objective,
      topics: module.topics,
      activities: module.activities,
      contentTypes: module.contentTypes,
      evaluationType: module.evaluationType,
      cognitiveSkills: module.cognitiveSkills,
      behavioralSkills: module.behavioralSkills,
      technicalSkills: module.technicalSkills,
      bloomLevel: module.bloomLevel || "understanding"
    });
    
    setActiveModuleIndex(index);
    setShowModuleForm(true);
  };
  
  // Função para reordenar os módulos (arrastar e soltar)
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Atualizar a ordem dos módulos
    const reorderedModules = items.map((module, index) => ({
      ...module,
      order: index + 1
    }));
    
    setModules(reorderedModules);
    updateModules(reorderedModules);
  };
  
  // Função para gerar estrutura de módulos com IA
  const generateModulesWithAI = async () => {
    if (!course) return;
    
    setIsGeneratingModules(true);
    
    try {
      toast({
        title: "Gerando estrutura",
        description: "A estrutura de módulos está sendo gerada com assistência de IA. Isso pode levar alguns segundos."
      });
      
      // Preparar os dados do curso
      const courseDetails = {
        title: course.title,
        theme: course.theme,
        estimatedHours: course.estimatedHours || 40,
        format: course.format,
        platform: course.platform,
        deliveryFormat: course.deliveryFormat,
        moduleCount: moduleCount,
        lessonsPerModule: lessonsPerModule,
        ...course.phaseData?.phase1
      };
      
      // Gerar mapeamento de competências
      const competencyResponse = await fetch('/api/generate/competencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseDetails,
          moduleCount: moduleCount,
          lessonsPerModule: lessonsPerModule
        })
      });
      
      if (!competencyResponse.ok) {
        throw new Error('Falha ao gerar mapeamento de competências');
      }
      
      const competencyData = await competencyResponse.json();
      
      // Gerar estrutura de módulos
      const moduleResponse = await fetch('/api/generate/structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseDetails,
          phaseData: course.phaseData?.phase1
        })
      });
      
      if (!moduleResponse.ok) {
        throw new Error('Falha ao gerar estrutura de módulos');
      }
      
      const moduleData = await moduleResponse.json();
      
      if (moduleData.modules && Array.isArray(moduleData.modules)) {
        // Transformar os módulos gerados pela IA em formato adequado
        const generatedModules = moduleData.modules.map((moduleInfo: any, index: number) => ({
          id: uuidv4(),
          title: moduleInfo.title,
          description: moduleInfo.description,
          order: index + 1,
          estimatedHours: Math.floor(course.estimatedHours / moduleCount) || 8,
          status: "not_started",
          objective: moduleInfo.objective || "",
          topics: moduleInfo.topics?.join(", ") || "",
          contentTypes: [],
          evaluationType: moduleInfo.evaluationType || "",
          cognitiveSkills: competencyData?.competenciesMap?.cognitive?.[index] || "",
          behavioralSkills: competencyData?.competenciesMap?.behavioral?.[index] || "",
          technicalSkills: competencyData?.competenciesMap?.technical?.[index] || "",
          bloomLevel: moduleInfo.bloomLevel || "understanding"
        }));
        
        setModules(generatedModules);
        
        toast({
          title: "Estrutura gerada com sucesso",
          description: `Foram gerados ${generatedModules.length} módulos para o curso "${course.title}" com ${lessonsPerModule} aulas por módulo.`,
        });
        
        // Atualizar os módulos no contexto
        updateModules(generatedModules);
        updateProgress(2, 80);
      }
    } catch (error) {
      console.error("Erro ao gerar módulos:", error);
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar a estrutura de módulos. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingModules(false);
    }
  };
  
  // Função para finalizar a fase 2
  const handleFinishPhase = async () => {
    setIsSubmitting(true);
    
    try {
      // Salvar os dados da fase 2
      updatePhaseData(2, {
        competenciesMap,
        moduleCount,
        lessonsPerModule
      });
      
      // Atualizar os módulos e progresso
      updateModules(modules);
      updateProgress(2, 100);
      moveToNextPhase();
      navigate("/phase3");
      
      toast({
        title: "Fase concluída",
        description: "A estrutura do curso foi definida com sucesso! Vamos para a próxima fase.",
      });
    } catch (error) {
      console.error("Erro ao finalizar fase:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao finalizar esta fase. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Fase 2: Estruturador de Módulos</h1>
          <Progress value={modules.length > 0 ? 50 : 10} className="w-[200px]" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Curso</CardTitle>
              <CardDescription>Informações básicas do curso que você está estruturando</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">Título</p>
                  <p>{course?.title}</p>
                </div>
                <div>
                  <p className="font-semibold">Tema</p>
                  <p>{course?.theme}</p>
                </div>
                <div>
                  <p className="font-semibold">Formato</p>
                  <p>{course?.format}</p>
                </div>
                <div>
                  <p className="font-semibold">Carga Horária</p>
                  <p>{course?.estimatedHours} horas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Estrutura</CardTitle>
              <CardDescription>Defina as configurações gerais dos módulos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moduleCount">Número de Módulos</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="moduleCount"
                        type="number"
                        min={1}
                        max={50}
                        value={moduleCount}
                        onChange={(e) => setModuleCount(parseInt(e.target.value) || 1)}
                      />
                      <span className="text-sm text-gray-500">máx. 50</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lessonsPerModule">Aulas por Módulo</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="lessonsPerModule"
                        type="number"
                        min={1}
                        max={15}
                        value={lessonsPerModule}
                        onChange={(e) => setLessonsPerModule(parseInt(e.target.value) || 1)}
                      />
                      <span className="text-sm text-gray-500">máx. 15</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={generateModulesWithAI}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  disabled={isGeneratingModules}
                >
                  {isGeneratingModules ? "Gerando..." : "Gerar Estrutura com IA"}
                </Button>
                
                <p className="text-sm text-gray-500 text-center">
                  A IA criará uma estrutura otimizada com base nas informações fornecidas na Fase 1.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="modules" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="competencies">Mapeamento de Competências</TabsTrigger>
            <TabsTrigger value="overview">Visão Geral do Curso</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Lista de Módulos</h2>
              <Button onClick={() => setShowModuleForm(true)}>Adicionar Módulo</Button>
            </div>
            
            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="rounded-full bg-gray-100 p-3 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-8 w-8 text-gray-500"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium">Nenhum módulo criado</h3>
                  <p className="text-sm text-gray-500 mt-2 mb-4">
                    Comece adicionando módulos manualmente ou gere uma estrutura completa com assistência de IA.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowModuleForm(true)}
                    >
                      Adicionar Manualmente
                    </Button>
                    <Button 
                      onClick={generateModulesWithAI}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600"
                      disabled={isGeneratingModules}
                    >
                      {isGeneratingModules ? "Gerando..." : "Gerar com IA"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="modules">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {modules.map((module, index) => (
                        <Draggable key={module.id} draggableId={module.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <ModuleCard
                                module={module}
                                onEdit={() => handleEditModule(index)}
                                onDelete={() => handleDeleteModule(index)}
                                onConfigureLessons={() => {
                                  setSelectedModule(module);
                                  setLessonConfigModalOpen(true);
                                }}
                              />
                            </div>
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
          
          <TabsContent value="competencies">
            <CompetencyMap
              modules={modules}
              competenciesMap={competenciesMap}
              onSave={setCompetenciesMap}
            />
          </TabsContent>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral do Curso</CardTitle>
                <CardDescription>Análise da estrutura curricular</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold">Estatísticas do Curso</h3>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">Total de Módulos</p>
                        <p className="text-2xl font-bold">{modules.length}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">Carga Horária</p>
                        <p className="text-2xl font-bold">
                          {modules.reduce((total, module) => total + module.estimatedHours, 0)} horas
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">Total de Aulas</p>
                        <p className="text-2xl font-bold">{modules.length * lessonsPerModule}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Distribuição de Carga Horária</h3>
                    <div className="h-40 mt-2">
                      {/* Aqui pode ser adicionado um gráfico de barras ou pizza */}
                      <div className="flex items-end h-full">
                        {modules.map((module, index) => (
                          <div 
                            key={module.id}
                            className="flex-1 mx-1"
                            title={module.title}
                          >
                            <div 
                              className="bg-blue-500 rounded-t"
                              style={{ 
                                height: `${(module.estimatedHours / (course?.estimatedHours || 40)) * 100}%`,
                                backgroundColor: `hsl(${210 + index * 30}, 80%, 60%)`
                              }}
                            ></div>
                            <p className="text-xs text-center mt-1 truncate">{module.order}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Taxonomia de Bloom</h3>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {bloomLevels.map((level) => {
                        const count = modules.filter(m => m.bloomLevel === level.value).length;
                        const percentage = modules.length > 0 ? (count / modules.length) * 100 : 0;
                        
                        return (
                          <div key={level.value} className="rounded-lg border p-3">
                            <div className="flex justify-between items-center">
                              <p className="font-medium">{level.label}</p>
                              <Badge variant={count > 0 ? "default" : "outline"}>
                                {count} {count === 1 ? "módulo" : "módulos"}
                              </Badge>
                            </div>
                            <Progress value={percentage} className="h-2 mt-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleGoBack}>
            Voltar para Fase 1
          </Button>
          <Button 
            onClick={handleFinishPhase}
            disabled={modules.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Processando..." : "Avançar para Fase 3"}
          </Button>
        </div>
      </div>
      
      {/* Modal para adicionar/editar módulo */}
      <Dialog open={showModuleForm} onOpenChange={setShowModuleForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModuleIndex !== null ? "Editar Módulo" : "Adicionar Módulo"}</DialogTitle>
            <DialogDescription>
              {activeModuleIndex !== null 
                ? "Atualize as informações do módulo existente" 
                : "Preencha as informações para criar um novo módulo"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(activeModuleIndex !== null ? handleUpdateModule : handleAddModule)}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título do módulo" {...field} />
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva brevemente o conteúdo deste módulo" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="section-1">
                  <AccordionTrigger className="text-base font-semibold">
                    Detalhamento do Módulo
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="objective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo do Módulo</FormLabel>
                          <FormDescription>
                            Defina claramente o que os alunos devem ser capazes de fazer ao final deste módulo
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="Ao final deste módulo, os alunos serão capazes de..." 
                              {...field} 
                            />
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
                            Liste os principais tópicos que serão abordados neste módulo (separados por vírgula)
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="Introdução, Conceitos básicos, Aplicações práticas..." 
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
                            <Textarea placeholder="Uso de ferramentas, aplicação de métodos..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  form.reset();
                  setActiveModuleIndex(null);
                  setShowModuleForm(false);
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {activeModuleIndex !== null ? "Atualizar Módulo" : "Adicionar Módulo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal para configuração de aulas */}
      <Dialog open={lessonConfigModalOpen} onOpenChange={setLessonConfigModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Aulas do Módulo</DialogTitle>
            <DialogDescription>
              {selectedModule?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numLessons">Número de Aulas</Label>
              <Input
                id="numLessons"
                type="number"
                min={1}
                max={15}
                value={lessonsPerModule}
                onChange={(e) => setLessonsPerModule(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-gray-500">
                Defina a quantidade de aulas que este módulo terá.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Tópicos do Módulo</p>
              <p className="text-sm">
                {selectedModule?.topics || "Nenhum tópico definido para este módulo"}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Objetivo de Aprendizagem</p>
              <p className="text-sm">
                {selectedModule?.objective || "Nenhum objetivo definido para este módulo"}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfigureLessons}
              disabled={isGeneratingLessonContent}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {isGeneratingLessonContent ? "Configurando..." : "Configurar Aulas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}