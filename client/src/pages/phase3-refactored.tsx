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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Slider 
} from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import AISettings from "@/components/shared/AISettings";
import ModuleCard from "@/components/shared/ModuleCard";
import { useCourse } from "@/context/CourseContext";
import { ContentType, CourseModule } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Phase3() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { 
    course, 
    updateAIConfig, 
    moveToNextPhase,
    updateModules,
    updateModuleContent,
    updateModuleStatus,
    updateProgress,
    generationStatus,
    setGenerationStatus
  } = useCourse();
  
  // AI Config
  const [contentTypes, setContentTypes] = useState<ContentType[]>(
    course?.aiConfig.contentTypes || ["text", "video", "quiz"]
  );
  const [difficultyLevel, setDifficultyLevel] = useState(
    course?.aiConfig.difficultyLevel || "Intermediate"
  );
  const [contentDensity, setContentDensity] = useState(
    course?.aiConfig.contentDensity || 3
  );
  const [teachingApproach, setTeachingApproach] = useState(
    course?.aiConfig.teachingApproach || "Balanced"
  );
  const [languageStyle, setLanguageStyle] = useState(
    course?.aiConfig.languageStyle || "Academic"
  );
  
  // Module selection state
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [currentView, setCurrentView] = useState<'settings' | 'modules' | 'content'>('modules');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  
  // Activity types
  const activityTypes = [
    { id: "quiz", label: "Quiz", description: "Questões de múltipla escolha ou verdadeiro/falso" },
    { id: "case", label: "Estudo de caso", description: "Análise de situações reais ou hipotéticas" },
    { id: "exercise", label: "Desafio prático", description: "Atividades hands-on para aplicação prática" },
    { id: "simulation", label: "Simulação", description: "Cenários interativos para tomada de decisão" },
    { id: "multiple", label: "Múltipla escolha", description: "Questões com várias opções de resposta" }
  ];
  
  // Content tone options
  const tonalityOptions = [
    { id: "motivational", label: "Motivacional", description: "Inspirador e encorajador" },
    { id: "technical", label: "Técnico neutro", description: "Objetivo e factual" },
    { id: "conversational", label: "Conversacional", description: "Informal e dialógico" },
    { id: "inspiring", label: "Inspirador", description: "Estimulante e reflexivo" }
  ];
  
  // Module content tabs
  const contentTabs = [
    { id: "text", label: "Texto Principal" },
    { id: "video", label: "Roteiro de Vídeo" },
    { id: "activities", label: "Atividades" },
    { id: "recommendations", label: "Recomendações" }
  ];
  
  // Apply AI config settings
  const handleApplySettings = () => {
    updateAIConfig({
      contentTypes,
      difficultyLevel,
      contentDensity,
      teachingApproach,
      languageStyle
    });
    
    toast({
      title: "Configurações atualizadas",
      description: "As configurações de IA foram atualizadas com sucesso.",
    });
    
    setCurrentView('modules');
  };
  
  // Content type selection helper
  const handleContentTypeChange = (type: ContentType, checked: boolean) => {
    setContentTypes(prev => {
      if (checked) {
        return [...prev, type];
      } else {
        return prev.filter(t => t !== type);
      }
    });
  };
  
  // Generate content for a single module
  const generateModuleContent = useMutation({
    mutationFn: async (moduleId: string) => {
      setGenerationStatus("generating");
      
      const moduleToGenerate = course?.modules.find(m => m.id === moduleId);
      if (!moduleToGenerate) throw new Error("Module not found");
      
      const response = await apiRequest(
        "POST", 
        "/api/generate/module-content", 
        {
          module: moduleToGenerate,
          courseDetails: {
            title: course?.title,
            theme: course?.theme,
            estimatedHours: course?.estimatedHours,
            format: course?.format,
            platform: course?.platform,
            deliveryFormat: course?.deliveryFormat,
            phaseData: course?.phaseData?.phase1
          },
          aiConfig: {
            model: course?.aiConfig.model,
            optimization: course?.aiConfig.optimization,
            languageStyle: languageStyle,
            difficultyLevel: difficultyLevel,
            contentDensity: contentDensity,
            teachingApproach: teachingApproach,
            contentTypes: contentTypes
          }
        }
      );
      
      return { module: moduleToGenerate, content: await response.json() };
    },
    onSuccess: (data) => {
      const { module, content } = data;
      
      // Update module with generated content
      updateModuleContent(module.id, content);
      
      // Update module status
      updateModuleStatus(module.id, "generated");
      
      // Set this module as selected
      setSelectedModule(
        course?.modules.find(m => m.id === module.id) || null
      );
      
      setGenerationStatus("success");
      
      toast({
        title: "Conteúdo gerado com sucesso",
        description: `O conteúdo para o módulo "${module.title}" foi gerado.`,
      });
      
      // Update progress
      updateProgress(3, calculateModuleProgress());
    },
    onError: (error) => {
      console.error("Error generating content:", error);
      setGenerationStatus("error");
      
      toast({
        title: "Erro ao gerar conteúdo",
        description: "Não foi possível gerar o conteúdo do módulo. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Generate content for all modules sequentially
  const generateAllContent = useMutation({
    mutationFn: async () => {
      setIsGeneratingAll(true);
      setGenerationStatus("generating");
      
      // Get all modules that don't have content yet
      const modulesToGenerate = course?.modules.filter(
        m => m.status === "not_started" || m.status === "in_progress"
      ) || [];
      
      if (modulesToGenerate.length === 0) {
        throw new Error("Todos os módulos já possuem conteúdo");
      }
      
      const results = [];
      
      // Generate content for each module sequentially
      for (let i = 0; i < modulesToGenerate.length; i++) {
        setActiveModuleIndex(i);
        setGenerationProgress(Math.round((i / modulesToGenerate.length) * 100));
        
        const module = modulesToGenerate[i];
        
        try {
          const response = await apiRequest(
            "POST", 
            "/api/generate/module-content", 
            {
              module: module,
              courseDetails: {
                title: course?.title,
                theme: course?.theme,
                estimatedHours: course?.estimatedHours,
                format: course?.format,
                platform: course?.platform,
                deliveryFormat: course?.deliveryFormat,
                phaseData: course?.phaseData?.phase1
              },
              aiConfig: {
                model: course?.aiConfig.model,
                optimization: course?.aiConfig.optimization,
                languageStyle: languageStyle,
                difficultyLevel: difficultyLevel,
                contentDensity: contentDensity,
                teachingApproach: teachingApproach,
                contentTypes: contentTypes
              }
            }
          );
          
          const content = await response.json();
          results.push({ module, content });
          
          // Update module with generated content
          updateModuleContent(module.id, content);
          
          // Update module status
          updateModuleStatus(module.id, "generated");
          
          // Short pause between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error generating content for module ${module.title}:`, error);
          // Continue with next module
        }
      }
      
      return results;
    },
    onSuccess: (data) => {
      setIsGeneratingAll(false);
      setGenerationStatus("success");
      setGenerationProgress(100);
      
      // Select the first generated module
      if (data.length > 0) {
        setSelectedModule(
          course?.modules.find(m => m.id === data[0].module.id) || null
        );
      }
      
      toast({
        title: "Geração de conteúdo concluída",
        description: `Foram gerados conteúdos para ${data.length} módulos com sucesso.`,
      });
      
      // Update progress
      updateProgress(3, calculateModuleProgress());
    },
    onError: (error) => {
      console.error("Error generating all content:", error);
      setIsGeneratingAll(false);
      setGenerationStatus("error");
      
      toast({
        title: "Erro na geração de conteúdo",
        description: error.message || "Ocorreu um erro ao gerar o conteúdo dos módulos.",
        variant: "destructive",
      });
    }
  });
  
  // Calculate progress for phase 3
  const calculateModuleProgress = () => {
    if (!course?.modules.length) return 0;
    
    const generatedModules = course.modules.filter(
      m => m.status === "generated" || m.status === "approved"
    ).length;
    
    return Math.round((generatedModules / course.modules.length) * 100);
  };
  
  // Handle moving to the next phase
  const handleNextPhase = () => {
    // Check if we have at least one module with content
    const hasContent = course?.modules.some(
      m => m.status === "generated" || m.status === "approved"
    );
    
    if (!hasContent) {
      toast({
        title: "Nenhum conteúdo gerado",
        description: "Gere conteúdo para pelo menos um módulo antes de avançar.",
        variant: "destructive",
      });
      return;
    }
    
    // Update progress
    updateProgress(3, calculateModuleProgress());
    moveToNextPhase();
    navigate("/phase4");
  };
  
  // Render helpers for module content
  const renderContentSections = (module: CourseModule) => {
    if (!module.content) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Este módulo ainda não possui conteúdo gerado.</p>
          <Button 
            className="mt-4"
            onClick={() => generateModuleContent.mutate(module.id)}
            disabled={generationStatus === "generating"}
          >
            {generationStatus === "generating" ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                Gerando conteúdo...
              </span>
            ) : (
              "Gerar Conteúdo"
            )}
          </Button>
        </div>
      );
    }
    
    // Extract content sections
    const text = module.content.text || "";
    const videoScript = module.content.videoScript || "";
    const activities = module.content.activities || [];
    
    return (
      <Tabs defaultValue="text" className="w-full mt-4">
        <TabsList className="grid grid-cols-4">
          {contentTabs.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              disabled={tab.id === "activities" && activities.length === 0}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="text" className="p-4 bg-white rounded-md mt-4">
          <h3 className="text-xl font-semibold mb-4">Conteúdo Pedagógico</h3>
          <div className="prose max-w-none">
            {text ? (
              <div dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }} />
            ) : (
              <p className="text-gray-500">Nenhum conteúdo de texto foi gerado para este módulo.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="video" className="p-4 bg-white rounded-md mt-4">
          <h3 className="text-xl font-semibold mb-4">Roteiro para Vídeo ou Narração</h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            {videoScript ? (
              <div dangerouslySetInnerHTML={{ __html: videoScript.replace(/\n/g, '<br />') }} />
            ) : (
              <p className="text-gray-500">Nenhum roteiro de vídeo foi gerado para este módulo.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="activities" className="p-4 bg-white rounded-md mt-4">
          <h3 className="text-xl font-semibold mb-4">Atividades Didáticas</h3>
          {activities.length > 0 ? (
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-medium">
                        {activity.title}
                      </CardTitle>
                      <Badge variant="outline">{activity.type}</Badge>
                    </div>
                    <CardDescription>{activity.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="instructions">
                        <AccordionTrigger>Instruções</AccordionTrigger>
                        <AccordionContent>
                          <div className="p-2 bg-gray-50 rounded">
                            {activity.instructions || "Nenhuma instrução específica."}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      {activity.questions && activity.questions.length > 0 && (
                        <AccordionItem value="questions">
                          <AccordionTrigger>Questões</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {activity.questions.map((question, qIndex) => (
                                <div key={qIndex} className="p-3 bg-gray-50 rounded">
                                  <p className="font-medium mb-2">{question.question}</p>
                                  {question.options && (
                                    <div className="ml-4 space-y-1">
                                      {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="flex items-start">
                                          <div className="w-6 text-center">{String.fromCharCode(65 + oIndex)}.</div>
                                          <div>{option}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {question.answer && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <span className="font-medium text-sm">Resposta:</span> {question.answer}
                                      {question.explanation && (
                                        <div className="mt-1 text-sm text-gray-600">
                                          <span className="font-medium">Explicação:</span> {question.explanation}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      
                      {activity.criteria && (
                        <AccordionItem value="criteria">
                          <AccordionTrigger>Critérios de Avaliação</AccordionTrigger>
                          <AccordionContent>
                            <div className="p-2 bg-gray-50 rounded">
                              {typeof activity.criteria === 'string' 
                                ? activity.criteria 
                                : JSON.stringify(activity.criteria, null, 2)}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma atividade foi gerada para este módulo.</p>
          )}
        </TabsContent>
        
        <TabsContent value="recommendations" className="p-4 bg-white rounded-md mt-4">
          <h3 className="text-xl font-semibold mb-4">Recomendações para Multimídia</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sugestão de Recursos Visuais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {module.content.visualRecommendations ? (
                    <div dangerouslySetInnerHTML={{ 
                      __html: module.content.visualRecommendations.replace(/\n/g, '<br />') 
                    }} />
                  ) : (
                    <p className="text-gray-500">Nenhuma recomendação visual disponível.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adaptações Multimídia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Formatos Recomendados</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.content.recommendedFormats && module.content.recommendedFormats.length > 0 ? (
                        module.content.recommendedFormats.map((format, index) => (
                          <Badge key={index} variant="secondary">{format}</Badge>
                        ))
                      ) : (
                        <p className="text-gray-500">Nenhum formato recomendado.</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Tom Sugerido</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.content.suggestedTone ? (
                        <Badge variant="outline">{module.content.suggestedTone}</Badge>
                      ) : (
                        <p className="text-gray-500">Nenhum tom sugerido.</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Observações para Adaptação</h4>
                    <p className="text-sm">
                      {module.content.adaptationNotes || "Nenhuma observação específica."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {module.content.glossary && module.content.glossary.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Glossário</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Termo</TableHead>
                    <TableHead>Definição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {module.content.glossary.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.term}</TableCell>
                      <TableCell>{item.definition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };
  
  // Handle selecting a module
  const handleSelectModule = (module: CourseModule) => {
    setSelectedModule(module);
    setCurrentView('content');
  };
  
  // Render different views
  const renderView = () => {
    // AI settings view
    if (currentView === 'settings') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Configurações de IA para Geração de Conteúdo</CardTitle>
            <CardDescription>
              Personalize como a IA vai gerar o conteúdo dos módulos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Tipos de Conteúdo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="content-text" 
                    checked={contentTypes.includes("text")}
                    onCheckedChange={(checked) => 
                      handleContentTypeChange("text", checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="content-text"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Texto Principal
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Conteúdo textual explicativo
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="content-video" 
                    checked={contentTypes.includes("video")}
                    onCheckedChange={(checked) => 
                      handleContentTypeChange("video", checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="content-video"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Roteiro de Vídeo
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Script para narração em vídeo
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="content-quiz" 
                    checked={contentTypes.includes("quiz")}
                    onCheckedChange={(checked) => 
                      handleContentTypeChange("quiz", checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="content-quiz"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Quiz
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Perguntas e respostas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="content-exercise" 
                    checked={contentTypes.includes("exercise")}
                    onCheckedChange={(checked) => 
                      handleContentTypeChange("exercise", checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="content-exercise"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Exercícios Práticos
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Atividades de aplicação
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="content-case" 
                    checked={contentTypes.includes("case")}
                    onCheckedChange={(checked) => 
                      handleContentTypeChange("case", checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="content-case"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Estudos de Caso
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Análise de situações reais
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Estilo de Linguagem</h3>
                  <Select
                    value={languageStyle}
                    onValueChange={setLanguageStyle}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o estilo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Acadêmico</SelectItem>
                      <SelectItem value="Conversational">Conversacional</SelectItem>
                      <SelectItem value="Professional">Profissional</SelectItem>
                      <SelectItem value="Simplified">Simplificado</SelectItem>
                      <SelectItem value="Neutral and International">Neutro e Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Nível de Dificuldade</h3>
                  <Select
                    value={difficultyLevel}
                    onValueChange={setDifficultyLevel}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Iniciante</SelectItem>
                      <SelectItem value="Intermediate">Intermediário</SelectItem>
                      <SelectItem value="Advanced">Avançado</SelectItem>
                      <SelectItem value="Expert">Especialista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Abordagem de Ensino</h3>
                  <Select
                    value={teachingApproach}
                    onValueChange={setTeachingApproach}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a abordagem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Balanced">Balanceada</SelectItem>
                      <SelectItem value="Theoretical">Teórica</SelectItem>
                      <SelectItem value="Practical">Prática</SelectItem>
                      <SelectItem value="Project-based">Baseada em Projetos</SelectItem>
                      <SelectItem value="Problem-based">Baseada em Problemas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Densidade de Conteúdo</h3>
                  <div className="space-y-4">
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[contentDensity]}
                      onValueChange={(values) => setContentDensity(values[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Conciso (1)</span>
                      <span>Equilibrado (3)</span>
                      <span>Abrangente (5)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleApplySettings}>
              Aplicar Configurações
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    // Modules overview
    if (currentView === 'modules') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Módulos do Curso</h2>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentView('settings')}
              >
                <span className="material-icons text-sm mr-2">settings</span>
                Configurações de IA
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                    disabled={
                      !course?.modules.length || 
                      isGeneratingAll || 
                      generationStatus === "generating"
                    }
                  >
                    <span className="material-icons text-sm mr-2">auto_awesome</span>
                    Gerar Todo o Conteúdo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar Conteúdo para Todos os Módulos</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa operação irá gerar conteúdo para todos os módulos que ainda não possuem conteúdo.
                      O processo pode levar alguns minutos. Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => generateAllContent.mutate()}>
                      Gerar Todos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          {isGeneratingAll && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-center mb-2">
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-blue-600 rounded-full"></span>
                <h3 className="text-blue-800 font-medium">
                  Gerando conteúdo para o módulo {activeModuleIndex + 1} de {course?.modules.filter(
                    m => m.status === "not_started" || m.status === "in_progress"
                  ).length}
                </h3>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Não feche esta página. A geração pode levar alguns minutos por módulo.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {course?.modules.map((module, index) => (
              <Card 
                key={module.id} 
                className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${
                  module.status === "generated" || module.status === "approved" 
                    ? "border-green-200" 
                    : ""
                }`}
                onClick={() => handleSelectModule(module)}
              >
                {module.imageUrl ? (
                  <div className="h-40 bg-gray-100 relative">
                    <img 
                      src={module.imageUrl} 
                      alt={module.title} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-2 right-2">
                      {module.status === "generated" && (
                        <Badge className="bg-green-500">Conteúdo Gerado</Badge>
                      )}
                      {module.status === "approved" && (
                        <Badge className="bg-blue-500">Aprovado</Badge>
                      )}
                      {module.status === "in_progress" && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>
                      )}
                      {module.status === "not_started" && (
                        <Badge variant="outline" className="bg-gray-100">Não Iniciado</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-icons text-4xl text-gray-300">image</span>
                      <p className="text-sm text-gray-500 mt-1">Sem imagem</p>
                    </div>
                    <div className="absolute top-2 right-2">
                      {module.status === "generated" && (
                        <Badge className="bg-green-500">Conteúdo Gerado</Badge>
                      )}
                      {module.status === "approved" && (
                        <Badge className="bg-blue-500">Aprovado</Badge>
                      )}
                      {module.status === "in_progress" && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>
                      )}
                      {module.status === "not_started" && (
                        <Badge variant="outline" className="bg-gray-100">Não Iniciado</Badge>
                      )}
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Módulo {module.order}: {module.title}
                  </CardTitle>
                  <CardDescription>
                    {module.estimatedHours}h • {
                      module.bloomLevel 
                        ? bloomLevelToString(module.bloomLevel) 
                        : "Não especificado"
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-sm">
                  <p className="line-clamp-2">{module.description}</p>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectModule(module);
                    }}
                  >
                    {module.status === "generated" || module.status === "approved" 
                      ? "Ver Conteúdo" 
                      : "Gerar Conteúdo"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {(!course?.modules || course.modules.length === 0) && (
              <div className="col-span-3 flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <span className="material-icons text-4xl text-gray-300 mb-2">apps</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum Módulo Criado</h3>
                  <p className="text-gray-500 mb-4">Vá para a Fase 2 para criar os módulos do curso</p>
                  <Button onClick={() => navigate("/phase2")}>Criar Módulos</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Module content view
    if (currentView === 'content' && selectedModule) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentView('modules')}
              className="flex items-center"
            >
              <span className="material-icons text-sm mr-1">arrow_back</span>
              Voltar para Módulos
            </Button>
            
            {selectedModule.status !== "generated" && selectedModule.status !== "approved" && (
              <Button
                onClick={() => generateModuleContent.mutate(selectedModule.id)}
                disabled={generationStatus === "generating"}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
              >
                {generationStatus === "generating" ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Gerando conteúdo...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="material-icons text-sm mr-2">auto_awesome</span>
                    Gerar Conteúdo do Módulo
                  </span>
                )}
              </Button>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h1 className="text-2xl font-bold mb-2">
                  Módulo {selectedModule.order}: {selectedModule.title}
                </h1>
                <p className="text-gray-600 mb-4">{selectedModule.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Objetivo Específico</h3>
                    <p>{selectedModule.objective || "Não definido"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Nível Cognitivo</h3>
                    <p>{bloomLevelToString(selectedModule.bloomLevel) || "Não definido"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Carga Horária</h3>
                    <p>{selectedModule.estimatedHours} horas</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Público-alvo</h3>
                    <p>{course?.phaseData?.phase1?.publicTarget || "Não definido"}</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Competências Cognitivas</h3>
                    <p>{selectedModule.cognitiveSkills || "Não definidas"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Competências Comportamentais</h3>
                    <p>{selectedModule.behavioralSkills || "Não definidas"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Competências Técnicas</h3>
                    <p>{selectedModule.technicalSkills || "Não definidas"}</p>
                  </div>
                </div>
              </div>
              
              <div>
                {selectedModule.imageUrl ? (
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={selectedModule.imageUrl} 
                      alt={selectedModule.title} 
                      className="w-full h-auto object-cover" 
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-icons text-4xl text-gray-300">image</span>
                      <p className="text-sm text-gray-500 mt-1">Sem imagem</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status do Módulo</h3>
                  <div className="flex items-center space-x-2">
                    {selectedModule.status === "generated" && (
                      <Badge className="bg-green-500">Conteúdo Gerado</Badge>
                    )}
                    {selectedModule.status === "approved" && (
                      <Badge className="bg-blue-500">Aprovado</Badge>
                    )}
                    {selectedModule.status === "in_progress" && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>
                    )}
                    {selectedModule.status === "not_started" && (
                      <Badge variant="outline" className="bg-gray-100">Não Iniciado</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-6 pt-6">
              <h2 className="text-xl font-semibold mb-4">Conteúdo do Módulo</h2>
              {renderContentSections(selectedModule)}
            </div>
          </div>
        </div>
      );
    }
    
    // Fallback
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Selecione uma opção para continuar</p>
      </div>
    );
  };
  
  // Helper function to convert bloom level to readable string
  const bloomLevelToString = (level?: string) => {
    if (!level) return null;
    
    const bloomLevels: Record<string, string> = {
      "remembering": "Lembrar",
      "understanding": "Compreender",
      "applying": "Aplicar",
      "analyzing": "Analisar",
      "evaluating": "Avaliar",
      "creating": "Criar"
    };
    
    return bloomLevels[level] || level;
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={3}
          title="Fase 3: Conteúdo" 
          description="Gere o conteúdo pedagógico para cada módulo do curso"
          onNext={handleNextPhase}
        />
        
        {renderView()}
      </div>
    </div>
  );
}