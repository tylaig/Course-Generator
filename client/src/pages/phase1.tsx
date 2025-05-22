import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useCourse } from "@/context/CourseContext";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import { phase1Schema } from "@shared/schema";
import { Phase1FormData } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function Phase1() {
  const [_, navigate] = useLocation();
  const { course, updatePhaseData, setBasicInfo, moveToNextPhase, updateProgress } = useCourse();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuração do formulário usando react-hook-form com validação Zod
  const form = useForm<Phase1FormData>({
    resolver: zodResolver(phase1Schema),
    defaultValues: {
      title: course?.title || "",
      theme: course?.theme || "",
      estimatedHours: course?.estimatedHours || 20,
      format: course?.format || "",
      platform: course?.platform || "",
      deliveryFormat: course?.deliveryFormat || "",
      publicTarget: course?.phaseData?.phase1?.publicTarget || "",
      educationalLevel: course?.phaseData?.phase1?.educationalLevel || "",
      familiarityLevel: course?.phaseData?.phase1?.familiarityLevel || "",
      motivation: course?.phaseData?.phase1?.motivation || "",
      cognitiveSkills: course?.phaseData?.phase1?.cognitiveSkills || "",
      behavioralSkills: course?.phaseData?.phase1?.behavioralSkills || "",
      technicalSkills: course?.phaseData?.phase1?.technicalSkills || "",
      languageLevel: course?.phaseData?.phase1?.languageLevel || "",
      accessibilityNeeds: course?.phaseData?.phase1?.accessibilityNeeds || "",
      courseLanguage: course?.phaseData?.phase1?.courseLanguage || "Português",
    },
  });

  // Mutação para gerar a estrutura de módulos após a estratégia
  const generateStructure = useMutation({
    mutationFn: async (courseData: any) => {
      const response = await apiRequest(
        "POST", 
        "/api/courses/structure", 
        { 
          courseDetails: courseData,
          moduleCount: 6,
          lessonsPerModule: 5
        }
      );
      return response.json();
    },
    onSuccess: (structureData) => {
      console.log("Estrutura gerada:", structureData);
      
      // Atualizar os módulos no contexto
      if (structureData.modules && Array.isArray(structureData.modules)) {
        const formattedModules = structureData.modules.map((module: any, index: number) => ({
          id: `module-${Date.now()}-${index}`,
          title: module.title,
          description: module.description,
          order: index + 1,
          estimatedHours: module.estimatedHours || 3,
          status: "not_started" as const,
          content: null,
          imageUrl: null
        }));
        
        updateModules(formattedModules);
        updateProgress(2, 10); // Progresso inicial da Phase 2
      }
    },
    onError: (error) => {
      console.error("Erro ao gerar estrutura:", error);
      toast({
        title: "Aviso",
        description: "Estratégia gerada com sucesso, mas houve um problema ao gerar a estrutura. Você pode gerar manualmente na Fase 2.",
        variant: "default",
      });
    }
  });

  // Mutação para gerar a estratégia do curso com a API OpenAI
  const generateStrategy = useMutation({
    mutationFn: async (data: Phase1FormData) => {
      const response = await apiRequest(
        "POST", 
        "/api/courses/strategy", 
        { ...data }
      );
      return response.json();
    },
    onSuccess: async (data) => {
      const formValues = form.getValues();
      
      // Atualizar os dados da fase com a estratégia gerada
      updatePhaseData(1, {
        ...formValues,
        strategy: data.strategy,
        strategySummary: data.strategySummary,
        completed: true
      });
      
      // Atualizar informações básicas do curso
      setBasicInfo({
        title: formValues.title,
        theme: formValues.theme,
        estimatedHours: formValues.estimatedHours,
        format: formValues.format,
        platform: formValues.platform,
        deliveryFormat: formValues.deliveryFormat,
      });
      
      updateProgress(1, 100);
      
      // Gerar automaticamente a estrutura de módulos para a Phase 2
      const courseData = {
        ...formValues,
        strategy: data.strategy
      };
      
      // Chamar a geração de estrutura automaticamente
      await generateStructure.mutateAsync(courseData);
      
      moveToNextPhase();
    },
    onError: (error) => {
      console.error("Erro ao gerar estratégia:", error);
      setIsSubmitting(false);
      
      toast({
        title: "Erro ao gerar estratégia",
        description: "Não foi possível gerar a estratégia do curso. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Manipulador de envio do formulário
  const onSubmit = async (data: Phase1FormData) => {
    setIsSubmitting(true);
    
    try {
      // Salvar os dados do formulário
      updatePhaseData(1, {
        ...data,
        completed: true
      });
      
      // Atualizar informações básicas do curso
      setBasicInfo({
        title: data.title,
        theme: data.theme,
        estimatedHours: data.estimatedHours,
        format: data.format,
        platform: data.platform,
        deliveryFormat: data.deliveryFormat,
      });
      
      // Atualizar o progresso da fase 1
      updateProgress(1, 100);
      
      // Gerar a estratégia do curso com OpenAI
      await generateStrategy.mutateAsync(data);
      
      // Avançar para a próxima fase após geração bem-sucedida
      moveToNextPhase();
      navigate("/phase2");
      
    } catch (error) {
      console.error("Erro ao enviar formulário:", error);
      setIsSubmitting(false);
      
      toast({
        title: "Erro ao gerar estratégia",
        description: "Não foi possível gerar a estratégia do curso. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={1}
          title="Fase 1: Estratégia" 
          description="Defina os objetivos e o público-alvo do curso"
          onNext={form.handleSubmit(onSubmit)}
        />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="single" collapsible defaultValue="section-1">
              <AccordionItem value="section-1">
                <AccordionTrigger className="text-lg font-semibold text-primary">
                  1. Informações Gerais
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do curso</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Fundamentos de Programação em JavaScript" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tema principal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Desenvolvimento Web" {...field} />
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
                          <FormLabel>Carga horária estimada (horas)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              max={100} 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formato de entrega</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o formato de entrega" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PDF">PDF</SelectItem>
                                <SelectItem value="DOCX">DOCX (Word)</SelectItem>
                                <SelectItem value="HTML5">HTML5</SelectItem>
                                <SelectItem value="SCORM">SCORM</SelectItem>
                                <SelectItem value="Outros">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plataforma de aprendizagem</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a plataforma" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Moodle">Moodle</SelectItem>
                                <SelectItem value="Canvas">Canvas</SelectItem>
                                <SelectItem value="Blackboard">Blackboard</SelectItem>
                                <SelectItem value="Google Classroom">Google Classroom</SelectItem>
                                <SelectItem value="Web">Web</SelectItem>
                                <SelectItem value="Outras">Outras</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formato do curso</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o formato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Online">Online</SelectItem>
                                <SelectItem value="Presencial">Presencial</SelectItem>
                                <SelectItem value="Híbrido">Híbrido</SelectItem>
                                <SelectItem value="Auto-instrucional">Auto-instrucional</SelectItem>
                                <SelectItem value="Tutorial">Tutorial</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="section-2">
                <AccordionTrigger className="text-lg font-semibold text-primary">
                  2. Perfil do Público-Alvo
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="publicTarget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faixa etária</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a faixa etária" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Crianças (até 12 anos)">Crianças (até 12 anos)</SelectItem>
                                <SelectItem value="Adolescentes (13-17 anos)">Adolescentes (13-17 anos)</SelectItem>
                                <SelectItem value="Jovens adultos (18-25 anos)">Jovens adultos (18-25 anos)</SelectItem>
                                <SelectItem value="Adultos (26-59 anos)">Adultos (26-59 anos)</SelectItem>
                                <SelectItem value="Idosos (60+ anos)">Idosos (60+ anos)</SelectItem>
                                <SelectItem value="Todas as idades">Todas as idades</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="educationalLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível educacional</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o nível educacional" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Fundamental">Fundamental</SelectItem>
                                <SelectItem value="Médio">Médio</SelectItem>
                                <SelectItem value="Técnico">Técnico</SelectItem>
                                <SelectItem value="Superior">Superior</SelectItem>
                                <SelectItem value="Pós-graduação">Pós-graduação</SelectItem>
                                <SelectItem value="Indefinido">Indefinido</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="familiarityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de familiaridade com o tema</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o nível" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Nenhum">Nenhum conhecimento prévio</SelectItem>
                                <SelectItem value="Básico">Conhecimento básico</SelectItem>
                                <SelectItem value="Intermediário">Conhecimento intermediário</SelectItem>
                                <SelectItem value="Avançado">Conhecimento avançado</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="motivation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivação esperada</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a motivação" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Profissional">Profissional</SelectItem>
                                <SelectItem value="Acadêmica">Acadêmica</SelectItem>
                                <SelectItem value="Pessoal">Pessoal</SelectItem>
                                <SelectItem value="Obrigatória">Obrigatória</SelectItem>
                                <SelectItem value="Certificação">Certificação</SelectItem>
                                <SelectItem value="Outra">Outra</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="section-3">
                <AccordionTrigger className="text-lg font-semibold text-primary">
                  3. Competências a Serem Desenvolvidas
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="cognitiveSkills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competências Cognitivas (saberes)</FormLabel>
                          <FormDescription>
                            Ex: pensamento crítico, análise de dados, resolução de problemas
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="Liste as principais competências cognitivas que os aprendizes deverão desenvolver"
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
                      name="behavioralSkills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competências Comportamentais (atitudes)</FormLabel>
                          <FormDescription>
                            Ex: colaboração, empatia, tomada de decisão responsável
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="Liste as principais competências comportamentais que os aprendizes deverão desenvolver"
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
                      name="technicalSkills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competências Técnicas (ferramentas/habilidades)</FormLabel>
                          <FormDescription>
                            Ex: uso de ferramentas específicas, redação técnica, interpretação de relatórios
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="Liste as principais competências técnicas que os aprendizes deverão desenvolver"
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="section-4">
                <AccordionTrigger className="text-lg font-semibold text-primary">
                  4. Diretrizes de Conteúdo e Acessibilidade
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="languageLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de linguagem recomendado</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o nível" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Simples">Simples (A1-A2)</SelectItem>
                                <SelectItem value="Intermediário">Intermediário (B1-B2)</SelectItem>
                                <SelectItem value="Avançado">Avançado (C1-C2)</SelectItem>
                                <SelectItem value="Técnico">Técnico/Especializado</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="accessibilityNeeds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Necessidades de acessibilidade</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione as necessidades" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sem necessidades específicas">Sem necessidades específicas</SelectItem>
                                <SelectItem value="Audiodescrição">Audiodescrição</SelectItem>
                                <SelectItem value="Legendas">Legendas/Transcrições</SelectItem>
                                <SelectItem value="Alto contraste">Alto contraste</SelectItem>
                                <SelectItem value="Compatível com leitores de tela">Compatível com leitores de tela</SelectItem>
                                <SelectItem value="Múltiplas necessidades">Múltiplas necessidades</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="courseLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Idioma principal do curso</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o idioma" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Português">Português</SelectItem>
                                <SelectItem value="Inglês">Inglês</SelectItem>
                                <SelectItem value="Espanhol">Espanhol</SelectItem>
                                <SelectItem value="Francês">Francês</SelectItem>
                                <SelectItem value="Multilíngue">Multilíngue</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Gerando estratégia...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="material-icons text-sm mr-2">auto_awesome</span>
                    Gerar Estratégia com IA
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}