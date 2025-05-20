import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function Phase1() {
  const [_, navigate] = useLocation();
  const { course, updatePhaseData, setBasicInfo, moveToNextPhase } = useCourse();
  const [briefingContent, setBriefingContent] = useState("");
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [focusArea, setFocusArea] = useState("balanced");
  const [audienceLevel, setAudienceLevel] = useState("intermediate");

  const defaultValues: Partial<Phase1FormData> = {
    title: course?.title || "",
    theme: course?.theme || "",
    estimatedHours: course?.estimatedHours || 10,
    format: course?.format || "Online",
    platform: course?.platform || "Moodle",
    deliveryFormat: course?.deliveryFormat || "HTML5",
    publicTarget: course?.phaseData?.phase1?.publicTarget || "",
    educationalLevel: course?.phaseData?.phase1?.educationalLevel || "Higher Education",
    familiarityLevel: course?.phaseData?.phase1?.familiarityLevel || "Beginner",
    motivation: course?.phaseData?.phase1?.motivation || "Professional",
    cognitiveSkills: course?.phaseData?.phase1?.cognitiveSkills || "",
    behavioralSkills: course?.phaseData?.phase1?.behavioralSkills || "",
    technicalSkills: course?.phaseData?.phase1?.technicalSkills || "",
  };
  
  const fillSampleData = () => {
    form.setValue("title", "Fundamentos de Programação em JavaScript");
    form.setValue("theme", "Desenvolvimento Web");
    form.setValue("estimatedHours", 20);
    form.setValue("format", "Online");
    form.setValue("platform", "Web");
    form.setValue("deliveryFormat", "HTML5");
    form.setValue("publicTarget", "Estudantes e profissionais iniciantes em programação");
    form.setValue("educationalLevel", "Higher Education");
    form.setValue("familiarityLevel", "Beginner");
    form.setValue("motivation", "Professional");
    form.setValue("cognitiveSkills", "Lógica de programação, resolução de problemas, pensamento crítico");
    form.setValue("behavioralSkills", "Perseverança, colaboração, autogestão de tempo");
    form.setValue("technicalSkills", "Navegação web, básico de HTML/CSS");
  };

  const form = useForm<Phase1FormData>({
    resolver: zodResolver(phase1Schema),
    defaultValues
  });

  const generateStrategy = useMutation({
    mutationFn: async (data: Phase1FormData) => {
      // Incluir as opções avançadas na solicitação
      const requestData = {
        ...data,
        advancedOptions: advancedOptions ? {
          focusArea: focusArea,
          audienceLevel: audienceLevel
        } : undefined
      };
      
      const response = await apiRequest("POST", "/api/generate/strategy", requestData);
      return response.json();
    },
    onSuccess: (data) => {
      // Use the AI generated strategy data if available
      updatePhaseData(1, {
        ...form.getValues(),
        advancedOptions: advancedOptions ? {
          focusArea: focusArea,
          audienceLevel: audienceLevel
        } : undefined,
        aiGenerated: data
      });
    }
  });

  // Função para processar o texto do briefing e extrair informações
  const processBriefing = () => {
    try {
      if (!briefingContent) return;
      
      console.log("Processando briefing educacional...");
      
      // Array de padrões de regex para buscar os diferentes campos em vários formatos possíveis
      const patterns = [
        // Título do curso - múltiplos formatos
        { 
          field: "title", 
          patterns: [
            /Título provisório do curso:\s*\[\s*([^\]]+)\s*\]/i,
            /Título do Curso:[\s\S]*?([^\r\n]+)/i,
            /Curso:[\s\S]*?([^\r\n]+)/i,
            /Nome do curso:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["INSERIR TÍTULO", "TÍTULO DO CURSO"]
        },
        // Tema principal
        { 
          field: "theme", 
          patterns: [
            /Tema principal:\s*\[\s*([^\]]+)\s*\]/i,
            /Tema Central:[\s\S]*?([^\r\n]+)/i,
            /Assunto principal:[\s\S]*?([^\r\n]+)/i,
            /Tema:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["DESCREVER O TEMA CENTRAL DO CONTEÚDO", "TEMA CENTRAL"]
        },
        // Carga horária estimada
        { 
          field: "estimatedHours", 
          patterns: [
            /Carga horária estimada:\s*\[\s*([^\]]+)\s*\]/i,
            /Carga Horária Total:[\s\S]*?(\d+)[\s\S]*?horas?/i,
            /Duração:[\s\S]*?(\d+)[\s\S]*?horas?/i,
            /(\d+)[\s\S]*?horas?/i
          ],
          transform: (value) => {
            const hoursText = value.trim();
            const hoursNumber = parseInt(hoursText.match(/\d+/)?.[0] || "20");
            return hoursNumber > 0 && hoursNumber < 500 ? hoursNumber : 20;
          },
          invalidValues: ["TOTAL DE HORAS"]
        },
        // Formato de entrega
        { 
          field: "format", 
          patterns: [
            /Formato de entrega:[\s\S]*?\[(Online|Presencial|Híbrido)\]/i,
            /Formato:[\s\S]*?(Online|Presencial|Híbrido|EAD|A distância)/i,
            /Modalidade:[\s\S]*?(Online|Presencial|Híbrido|EAD|A distância)/i
          ],
          transform: (value) => {
            const format = value.trim();
            if (format.toLowerCase().includes('distância') || format.toLowerCase() === 'ead') {
              return 'Online';
            }
            return format;
          }
        },
        // Plataforma
        { 
          field: "platform", 
          patterns: [
            /Plataforma ou ambiente de aprendizagem:\s*\[\s*([^\]]+)\s*\]/i,
            /Plataforma:[\s\S]*?\[([^\]]+)\]/i,
            /Plataforma:[\s\S]*?([^\r\n]+)/i,
            /LMS:[\s\S]*?([^\r\n]+)/i,
            /Ambiente:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["Ex:", "NOME DA PLATAFORMA"]
        },
        // Público-alvo
        { 
          field: "publicTarget", 
          patterns: [
            /Faixa etária:\s*\[\s*([^\]]+)\s*\]/i,
            /Público-alvo:[\s\S]*?\[([^\]]+)\]/i,
            /Público-alvo:[\s\S]*?([^\r\n]+)/i,
            /Público:[\s\S]*?([^\r\n]+)/i,
            /Alunos:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["Ex:", "DESCRIÇÃO"]
        },
        // Nível educacional
        { 
          field: "educationalLevel", 
          patterns: [
            /Nível educacional atual:\s*\[\s*([^\]]+)\s*\]/i,
            /Nível educacional:[\s\S]*?([^\r\n]+)/i,
            /Escolaridade:[\s\S]*?([^\r\n]+)/i
          ],
          transform: (value) => {
            const eduLevel = value.trim();
            if (eduLevel.includes("Superior")) {
              return "Higher Education";
            } else if (eduLevel.includes("Fundamental")) {
              return "Primary Education";
            } else if (eduLevel.includes("Médio")) {
              return "Secondary Education";
            }
            return value;
          }
        },
        // Familiaridade
        { 
          field: "familiarityLevel", 
          patterns: [
            /Nível de familiaridade com o tema:\s*\[\s*([^\]]+)\s*\]/i,
            /Familiaridade:[\s\S]*?([^\r\n]+)/i,
            /Conhecimento prévio:[\s\S]*?([^\r\n]+)/i
          ],
          transform: (value) => {
            const familiarity = value.trim();
            if (familiarity.includes("Básico") || familiarity.includes("Nenhum")) {
              return "Beginner";
            } else if (familiarity.includes("Intermediário")) {
              return "Intermediate";
            } else if (familiarity.includes("Avançado")) {
              return "Advanced";
            }
            return value;
          }
        },
        // Competências cognitivas
        { 
          field: "cognitiveSkills", 
          patterns: [
            /Cognitivas \(saberes\)\s*\[\s*([^\]]+)\s*\]/i,
            /Competências Cognitivas:[\s\S]*?\[([^\]]+)\]/i,
            /Cognitivas:[\s\S]*?([^\r\n]+)/i,
            /Habilidades cognitivas:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["Ex:"]
        },
        // Competências comportamentais
        { 
          field: "behavioralSkills", 
          patterns: [
            /Comportamentais \(atitudes\)\s*\[\s*([^\]]+)\s*\]/i,
            /Competências Comportamentais:[\s\S]*?\[([^\]]+)\]/i,
            /Comportamentais:[\s\S]*?([^\r\n]+)/i,
            /Soft skills:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["Ex:"]
        },
        // Competências técnicas
        { 
          field: "technicalSkills", 
          patterns: [
            /Técnicas \(ferramentas\/habilidades\)\s*\[\s*([^\]]+)\s*\]/i,
            /Competências Técnicas:[\s\S]*?\[([^\]]+)\]/i,
            /Técnicas:[\s\S]*?([^\r\n]+)/i,
            /Hard skills:[\s\S]*?([^\r\n]+)/i
          ],
          invalidValues: ["Ex:"]
        }
      ];
      
      // Processa cada campo usando os padrões definidos
      patterns.forEach(({ field, patterns, transform, invalidValues = [] }) => {
        // Tenta cada padrão até encontrar um match
        for (const pattern of patterns) {
          const match = briefingContent.match(pattern);
          if (match && match[1]) {
            let value = match[1].trim();
            
            // Verifica se o valor encontrado não é um placeholder ou valor inválido
            if (invalidValues.some(invalid => value.includes(invalid))) {
              continue;
            }
            
            // Aplica transformação se necessário
            if (transform) {
              value = transform(value);
            }
            
            // Define o valor no formulário
            form.setValue(field, value);
            break;
          }
        }
      });
      
      // Salvar o briefing original também
      form.setValue("briefingDocument", briefingContent);
      
      // Fechar o diálogo
      setBriefingDialogOpen(false);
      
      console.log("Briefing processado com sucesso!");
      
      // Pergunta se o usuário deseja gerar a estratégia automaticamente
      const confirmGenerate = confirm(`Briefing processado com sucesso! Campos preenchidos automaticamente.
      
Deseja gerar a estratégia do curso automaticamente com esses dados?`);
      
      if (confirmGenerate) {
        // Coleta os dados do formulário e inicia a geração de estratégia
        const formData = form.getValues();
        generateStrategy.mutate({
          ...formData,
          advancedOptions: advancedOptions ? {
            focusArea,
            audienceLevel
          } : undefined
        });
      }
      
    } catch (error) {
      console.error("Erro ao processar briefing:", error);
      alert("Não foi possível processar o briefing. Verifique o formato e tente novamente.");
    }
  };

  const onSubmit = async (data: Phase1FormData) => {
    // Update course basic info in context
    setBasicInfo({
      title: data.title,
      theme: data.theme,
      estimatedHours: data.estimatedHours,
      format: data.format,
      platform: data.platform,
      deliveryFormat: data.deliveryFormat
    });

    // Save all form data to phase 1 data including briefing if available
    updatePhaseData(1, {
      ...data,
      briefingDocument: briefingContent || data.briefingDocument
    });

    // Generate AI strategy (optional)
    try {
      await generateStrategy.mutateAsync(data);
    } catch (error) {
      console.error("Failed to generate strategy:", error);
    }

    // Move to next phase
    moveToNextPhase();
    navigate("/phase2");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <div className="flex justify-between items-center mb-4">
          <PhaseNav 
            currentPhase={1}
            title="Phase 1: Strategy Definition" 
            description="Define the core educational strategy and objectives for your course"
            onNext={form.handleSubmit(onSubmit)}
          />
          
          <div className="flex gap-2">
            <Dialog open={briefingDialogOpen} onOpenChange={setBriefingDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  type="button"
                >
                  <span className="material-icons text-sm mr-2">description</span>
                  Importar Briefing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Importar Briefing Educacional</DialogTitle>
                  <DialogDescription>
                    Cole o conteúdo do briefing educacional abaixo e clique em "Processar"
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <Textarea 
                    placeholder="Cole o conteúdo do briefing aqui..." 
                    rows={15}
                    value={briefingContent}
                    onChange={(e) => setBriefingContent(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={processBriefing}>Processar Briefing</Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              onClick={fillSampleData} 
              variant="outline" 
              className="flex items-center" 
              type="button"
            >
              <span className="material-icons text-sm mr-2">bolt</span>
              Preenchimento Rápido
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-heading font-medium text-neutral-800">Course Information</h3>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Advanced Data Science" {...field} />
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
                      <FormLabel>Main Theme</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Data Science Fundamentals" {...field} />
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
                      <FormLabel>Estimated Hours</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Presential">Presential</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Moodle">Moodle</SelectItem>
                            <SelectItem value="Canvas">Canvas</SelectItem>
                            <SelectItem value="Google Classroom">Google Classroom</SelectItem>
                            <SelectItem value="Custom LMS">Custom LMS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliveryFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HTML5">HTML5</SelectItem>
                          <SelectItem value="SCORM">SCORM</SelectItem>
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="Video">Video</SelectItem>
                          <SelectItem value="Podcast">Podcast</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-heading font-medium text-neutral-800">Target Audience & Skills</h3>
                
                <FormField
                  control={form.control}
                  name="publicTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your target audience..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="educationalLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Educational Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Elementary">Elementary</SelectItem>
                            <SelectItem value="Middle School">Middle School</SelectItem>
                            <SelectItem value="High School">High School</SelectItem>
                            <SelectItem value="Higher Education">Higher Education</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="familiarityLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Familiarity Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select familiarity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                            <SelectItem value="Mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="motivation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience Motivation</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select motivation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Academic">Academic</SelectItem>
                          <SelectItem value="Personal">Personal</SelectItem>
                          <SelectItem value="Mandatory">Mandatory</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cognitiveSkills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognitive Skills to Develop</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., critical thinking, data analysis..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="behavioralSkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Behavioral Skills</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., collaboration, empathy..." {...field} />
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
                        <FormLabel>Technical Skills</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., specific tools, techniques..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-neutral-700">Opções Avançadas de Estratégia</h4>
                <button 
                  type="button" 
                  className="text-xs text-primary hover:text-primary-dark flex items-center"
                  onClick={() => setAdvancedOptions(!advancedOptions)}
                >
                  <span className="material-icons text-xs mr-1">
                    {advancedOptions ? "expand_less" : "expand_more"}
                  </span>
                  {advancedOptions ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              
              {advancedOptions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-neutral-50 p-4 rounded-md border border-neutral-200">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Foco do Curso
                    </label>
                    <Select 
                      value={focusArea} 
                      onValueChange={setFocusArea}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o foco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Equilibrado (padrão)</SelectItem>
                        <SelectItem value="theoretical">Teórico/Conceitual</SelectItem>
                        <SelectItem value="practical">Prático/Aplicado</SelectItem>
                        <SelectItem value="problem-solving">Resolução de Problemas</SelectItem>
                        <SelectItem value="industry">Indústria/Profissional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Nível do Público
                    </label>
                    <Select 
                      value={audienceLevel} 
                      onValueChange={setAudienceLevel}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante (básico)</SelectItem>
                        <SelectItem value="intermediate">Intermediário (padrão)</SelectItem>
                        <SelectItem value="advanced">Avançado (especialista)</SelectItem>
                        <SelectItem value="mixed">Misto/Variado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            
              <div className="flex justify-end">
                <Button type="submit" className="w-full sm:w-auto">
                  {generateStrategy.isPending ? "Generating Strategy..." : "Save and Continue"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
