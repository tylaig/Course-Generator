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
  
  // Estados para configurações
  const [moduleCount, setModuleCount] = useState(6);
  const [lessonsPerModule, setLessonsPerModule] = useState([5]); // Array para o Slider
  const [configurationsSaved, setConfigurationsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Estados para módulos e competências
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

  // Estados derivados
  const showModules = configurationsSaved;
  const showCompetencyMapping = modules.length > 0;

  // Caregar dados existentes
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
      setShowModules(true);
    }
  }, [course]);

  // Função para salvar configurações
  const saveConfigurations = async () => {
    console.log("Salvando configurações:", { moduleCount, lessonsPerModule: lessonsPerModule[0] });
    
    if (course) {
      try {
        setIsSaving(true);
        
        // Salvar no PostgreSQL via API
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
          // Atualizar contexto local
          updatePhaseData(2, {
            moduleCount,
            lessonsPerModule: lessonsPerModule[0],
            configurationsSaved: true,
            modules: modules
          });
          
          setConfigurationsSaved(true);
          setShowModules(true);
          
          toast({
            title: "Salvo!",
            description: `${moduleCount} módulos com ${lessonsPerModule[0]} aulas cada.`,
            variant: "default",
          });
          
          console.log("Configurações salvas com sucesso no PostgreSQL!");
        } else {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
      } catch (error) {
        console.error("Erro ao salvar no banco:", error);
        toast({
          title: "Erro ao Salvar",
          description: "Falha ao salvar no banco de dados. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      console.error("Curso não encontrado!");
      toast({
        title: "Erro",
        description: "Curso não encontrado. Por favor, volte à Phase 1.",
        variant: "destructive",
      });
    }
  };

  // Mutação para gerar estrutura com IA
  const generateStructure = useMutation({
    mutationFn: async () => {
      // Obter dados da estratégia da Phase 1
      const phase1Data = course?.phaseData?.phase1;
      if (!phase1Data) {
        throw new Error("Dados da Phase 1 não encontrados. Complete a Phase 1 primeiro.");
      }

      console.log("Enviando para API:", {
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
      console.log("Dados recebidos da API:", data);
      if (data.modules && Array.isArray(data.modules)) {
        // Converter os módulos gerados para o formato esperado
        const newModules = data.modules.map((module: any, index: number) => ({
          id: `module-${Date.now()}-${index}`,
          title: module.title,
          description: module.description,
          order: index + 1,
          estimatedHours: module.estimatedHours || 3,
          status: "not_started" as const,
          content: module,
          imageUrl: null
        }));
        
        setModules(newModules);
        updateModules(newModules);
        updateProgress(2, 50);
        setShowCompetencyMapping(true);
        
        toast({
          title: "Estrutura Gerada!",
          description: `${data.modules.length} módulos foram criados com sucesso.`,
          variant: "default",
        });
      } else {
        throw new Error("Formato de resposta inválido");
      }
    },
    onError: (error) => {
      console.error("Erro ao gerar estrutura:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar estrutura. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Reordenar módulos
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
          title="Fase 2: Estrutura" 
          description="Configure e organize a estrutura do curso"
          onNext={handleSubmit}
        />
        
        <Tabs defaultValue="configurations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configurations">Configurações</TabsTrigger>
            <TabsTrigger value="modules" disabled={!configurationsSaved}>Módulos</TabsTrigger>
            <TabsTrigger value="competencies" disabled={modules.length === 0}>Mapeamento</TabsTrigger>
          </TabsList>
          
          {/* ABA 1: CONFIGURAÇÕES */}
          <TabsContent value="configurations" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Configurações da Estrutura</h2>
              <p className="text-muted-foreground">Defina a estrutura básica do seu curso</p>
            </div>

            {/* Resumo do Curso */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Curso</CardTitle>
                <CardDescription>Informações básicas definidas na Phase 1</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Título</p>
                    <p className="text-lg font-semibold">{course?.title || "Não definido"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tema</p>
                    <p className="text-lg font-semibold">{course?.theme || "Não definido"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Carga Horária</p>
                    <p className="text-lg font-semibold">{course?.estimatedHours || 0} horas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Estrutura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Número de Módulos</CardTitle>
                  <CardDescription>Quantos módulos o curso terá</CardDescription>
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
                      <p className="text-sm text-muted-foreground">módulos</p>
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
                    Mínimo: 1 | Máximo: 20
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aulas por Módulo</CardTitle>
                  <CardDescription>Quantas aulas cada módulo terá</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-primary">{lessonsPerModule[0]}</span>
                      <p className="text-sm text-muted-foreground">aulas por módulo</p>
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

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Calculadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{moduleCount}</p>
                    <p className="text-sm text-muted-foreground">Módulos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{moduleCount * lessonsPerModule[0]}</p>
                    <p className="text-sm text-muted-foreground">Aulas Totais</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{Math.round((course?.estimatedHours || 0) / moduleCount)}</p>
                    <p className="text-sm text-muted-foreground">Horas/Módulo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{Math.round((course?.estimatedHours || 0) / (moduleCount * lessonsPerModule[0]))}</p>
                    <p className="text-sm text-muted-foreground">Horas/Aula</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão Salvar Configurações */}
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  console.log("Botão clicado!");
                  saveConfigurations();
                }}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-8 py-2"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Salvando...
                  </span>
                ) : configurationsSaved ? "✓ Salvar" : "Salvar"}
              </Button>
            </div>
          </TabsContent>

          {/* ABA 2: MÓDULOS */}
          <TabsContent value="modules" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Módulos do Curso</h2>
                <p className="text-muted-foreground">Gere e organize os módulos do curso</p>
              </div>
              
              <Button
                onClick={() => {
                  console.log("Gerando estrutura com:", { moduleCount, lessonsPerModule: lessonsPerModule[0] });
                  generateStructure.mutate();
                }}
                disabled={generateStructure.isPending || !configurationsSaved}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
              >
                {generateStructure.isPending ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Gerando {moduleCount} módulos com {lessonsPerModule[0]} aulas cada...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="material-icons text-sm mr-2">auto_awesome</span>
                    Gerar Estrutura com IA ({moduleCount} módulos, {lessonsPerModule[0]} aulas cada)
                  </span>
                )}
              </Button>
            </div>

            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="text-lg font-semibold mb-2">Nenhum Módulo Criado</h3>
                    <p className="text-muted-foreground mb-4">
                      Clique no botão "Gerar Estrutura com IA" para criar os módulos do curso
                    </p>
                    {!configurationsSaved && (
                      <Badge variant="outline" className="text-orange-600">
                        Salve as configurações primeiro
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
                                      {(module.content as any)?.lessons?.length || 0} aulas
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
                              
                              {/* Exibir aulas em formato estilo Hotmart - só quando expandido */}
                              {expandedModules.has(module.id) && module.content && (module.content as any)?.lessons && (module.content as any)?.lessons.length > 0 && (
                                <CardContent className="pt-0">
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide border-b pb-2">
                                      📚 Aulas do Módulo
                                    </h4>
                                    <div className="grid gap-2">
                                      {((module.content as any)?.lessons || []).map((lesson: any, i: number) => (
                                        <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-semibold mr-3">
                                            {i + 1}
                                          </div>
                                          <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm leading-tight">
                                              {lesson.title || `Aula ${i + 1}`}
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
                                                📹 {lesson.type === 'video' ? 'Vídeo aula' : lesson.type}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Resumo do módulo */}
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-blue-800">
                                          Total: {((module.content as any)?.lessons || []).length} aulas
                                        </span>
                                        <span className="text-blue-600">
                                          ⏱️ {module.estimatedHours} horas de conteúdo
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

          {/* ABA 3: MAPEAMENTO DE COMPETÊNCIAS */}
          <TabsContent value="competencies" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Mapeamento de Competências</h2>
              <p className="text-muted-foreground">Associe competências aos módulos do curso</p>
            </div>

            {modules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-lg font-semibold mb-2">Gere a Estrutura Primeiro</h3>
                    <p className="text-muted-foreground">
                      Você precisa gerar os módulos antes de fazer o mapeamento de competências
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Competências Definidas na Phase 1</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {course?.phaseData?.phase1?.cognitiveSkills && (
                      <div>
                        <h4 className="font-medium text-blue-600">Competências Cognitivas</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.phaseData.phase1.cognitiveSkills}
                        </p>
                      </div>
                    )}
                    {course?.phaseData?.phase1?.behavioralSkills && (
                      <div>
                        <h4 className="font-medium text-green-600">Competências Comportamentais</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.phaseData.phase1.behavioralSkills}
                        </p>
                      </div>
                    )}
                    {course?.phaseData?.phase1?.technicalSkills && (
                      <div>
                        <h4 className="font-medium text-purple-600">Competências Técnicas</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.phaseData.phase1.technicalSkills}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Módulos</CardTitle>
                    <CardDescription>
                      Cada competência será desenvolvida ao longo dos módulos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🔗</div>
                      <h3 className="text-lg font-semibold mb-2">Mapeamento Automático</h3>
                      <p className="text-muted-foreground">
                        O mapeamento de competências será feito automaticamente baseado no conteúdo dos módulos
                      </p>
                    </div>
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