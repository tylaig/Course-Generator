import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";

import { useCourse } from "@/context/CourseContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
// Removed imports for components that don't exist

// Validation schema for Phase 1 form
const phase1Schema = z.object({
  title: z.string().min(1, "Title is required"),
  theme: z.string().min(1, "Theme is required"),
  estimatedHours: z.number().min(1, "Duration must be at least 1 hour"),
  format: z.string().min(1, "Format is required"),
  platform: z.string().min(1, "Platform is required"),
  deliveryFormat: z.string().min(1, "Delivery format is required"),
  publicTarget: z.string().min(1, "Target audience is required"),
  educationalLevel: z.string().min(1, "Educational level is required"),
  familiarityLevel: z.string().min(1, "Familiarity level is required"),
  motivation: z.string().min(1, "Motivation is required"),
  cognitiveSkills: z.string().min(1, "Cognitive skills are required"),
  behavioralSkills: z.string().min(1, "Behavioral skills are required"),
  technicalSkills: z.string().min(1, "Technical skills are required"),
  languageLevel: z.string().min(1, "Language level is required"),
  accessibilityNeeds: z.string().min(1, "Accessibility needs are required"),
  courseLanguage: z.string().min(1, "Course language is required"),
});

type Phase1FormData = z.infer<typeof phase1Schema>;

export default function Phase1() {
  const [_, navigate] = useLocation();
  const { course, updatePhaseData, setBasicInfo, moveToNextPhase, updateProgress } = useCourse();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form configuration using react-hook-form with Zod validation
  const form = useForm<Phase1FormData>({
    resolver: zodResolver(phase1Schema),
    defaultValues: {
      title: course?.phaseData?.phase1?.title || "New Educational Course",
      theme: course?.phaseData?.phase1?.theme || "Education and Learning",
      estimatedHours: course?.phaseData?.phase1?.estimatedHours || 20,
      format: course?.phaseData?.phase1?.format || "Online",
      platform: course?.phaseData?.phase1?.platform || "Web",
      deliveryFormat: course?.phaseData?.phase1?.deliveryFormat || "PDF",
      publicTarget: course?.phaseData?.phase1?.publicTarget || "Children (up to 12 years)",
      educationalLevel: course?.phaseData?.phase1?.educationalLevel || "Elementary",
      familiarityLevel: course?.phaseData?.phase1?.familiarityLevel || "None",
      motivation: course?.phaseData?.phase1?.motivation || "Professional",
      cognitiveSkills: course?.phaseData?.phase1?.cognitiveSkills || "",
      behavioralSkills: course?.phaseData?.phase1?.behavioralSkills || "",
      technicalSkills: course?.phaseData?.phase1?.technicalSkills || "",
      languageLevel: course?.phaseData?.phase1?.languageLevel || "Simple",
      accessibilityNeeds: course?.phaseData?.phase1?.accessibilityNeeds || "No specific needs",
      courseLanguage: course?.phaseData?.phase1?.courseLanguage || "English",
    },
  });

  // Navigation between steps
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Form submission handler
  const onSubmit = (data: Phase1FormData) => {
    setIsSubmitting(true);
    
    try {
      // Save form data
      updatePhaseData(1, {
        ...data,
        completed: true
      });
      
      // Update basic course information
      setBasicInfo({
        title: data.title,
        theme: data.theme,
        estimatedHours: data.estimatedHours,
        format: data.format,
        platform: data.platform,
        deliveryFormat: data.deliveryFormat,
      });
      
      // Update phase 1 progress
      updateProgress(1, 100);
      moveToNextPhase();
      navigate("/phase2");
      
    } catch (error) {
      console.error("Form submission error:", error);
      
      toast({
        title: "Error",
        description: "Unable to save data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Phase 1: Strategy</h1>
          <p className="text-muted-foreground">Define the objectives and target audience of the course</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Step {currentStep} of {totalSteps}</h3>
            <div className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% completed
            </div>
          </div>
          <div className="flex space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i + 1 <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Step 1: General Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-2">1. General Information</h3>
                  <p className="text-muted-foreground mb-6">Configure the basic information for your course</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., JavaScript Programming Fundamentals" {...field} />
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
                          <Input placeholder="e.g., Web Development" {...field} />
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
                              <SelectItem value="Web">Web</SelectItem>
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
              </div>
            )}

            {/* Etapa 2: Perfil do Público-Alvo */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-2">2. Perfil do Público-Alvo</h3>
                  <p className="text-muted-foreground mb-6">Defina as características do seu público-alvo</p>
                </div>
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
              </div>
            )}

            {/* Etapa 3: Competências a Serem Desenvolvidas */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-2">3. Competências a Serem Desenvolvidas</h3>
                  <p className="text-muted-foreground mb-6">Especifique as competências que serão desenvolvidas</p>
                </div>
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
              </div>
            )}

            {/* Etapa 4: Diretrizes de Conteúdo e Acessibilidade */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-2">4. Diretrizes de Conteúdo e Acessibilidade</h3>
                  <p className="text-muted-foreground mb-6">Configure diretrizes de linguagem e acessibilidade</p>
                </div>
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
              </div>
            )}
            
            {/* Navegação */}
            <div className="flex justify-between space-x-4 pt-8">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  Cancelar
                </Button>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                  >
                    Anterior
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                        Salvando...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <span className="material-icons text-sm mr-2">arrow_forward</span>
                        Próxima Etapa
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}