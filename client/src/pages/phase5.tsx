import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import PhaseNav from "@/components/layout/PhaseNav";
import ContentPreview from "@/components/shared/ContentPreview";
import { useCourse } from "@/context/CourseContext";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { CourseModule } from "@/types";

// Este componente mostra uma visualização do conteúdo do módulo
function ModuleContentPreview({ module, onClose }: { module: CourseModule | null, onClose: () => void }) {
  if (!module || !module.content) return null;
  
  return (
    <Dialog open={Boolean(module)} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{module.title}</DialogTitle>
          <DialogDescription>
            {module.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {module.content.text && (
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: module.content.text.replace(/\n/g, '<br>') }} />
            </div>
          )}
          
          {module.content.videoScript && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Roteiro de Vídeo</h3>
              <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                <pre className="whitespace-pre-wrap text-sm">{module.content.videoScript}</pre>
              </div>
            </div>
          )}
          
          {module.content.activities && module.content.activities.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Atividades</h3>
              <div className="space-y-4">
                {module.content.activities.map((activity, index) => (
                  <div key={index} className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="mt-1 text-sm">{activity.description}</p>
                    
                    {activity.questions && activity.questions.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-2">Questões</h5>
                        <div className="space-y-2">
                          {activity.questions.map((question, qIndex) => (
                            <div key={qIndex} className="ml-3">
                              <p className="text-sm font-medium">{qIndex + 1}. {question.question}</p>
                              {question.options && (
                                <div className="ml-4 mt-1 text-xs space-y-1">
                                  {question.options.map((option, oIndex) => (
                                    <div key={oIndex}>
                                      <span>{String.fromCharCode(65 + oIndex)}.</span> {option}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Este componente mostra uma avaliação de módulo
function EvaluationPreview({ evaluation, onClose }: { evaluation: any, onClose: () => void }) {
  return (
    <Dialog open={Boolean(evaluation)} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evaluation?.title || "Avaliação"}</DialogTitle>
          <DialogDescription>
            {evaluation?.description || "Detalhes da avaliação do módulo"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {evaluation?.type === "quiz" && evaluation?.questions && (
            <div className="space-y-6">
              {evaluation.questions.map((question: any, index: number) => (
                <div key={index} className="border rounded-md p-4 bg-neutral-50">
                  <h3 className="font-medium mb-2">{index + 1}. {question.question}</h3>
                  
                  {question.options && (
                    <div className="space-y-2 ml-4 mt-3">
                      {question.options.map((option: string, optionIndex: number) => (
                        <div key={optionIndex} className={`flex items-start ${
                          question.answer === optionIndex ? 'text-green-700 font-medium' : ''
                        }`}>
                          <span className="inline-block w-5">{String.fromCharCode(65 + optionIndex)}.</span>
                          <span>{option}</span>
                          {question.answer === optionIndex && (
                            <span className="material-icons text-green-500 text-sm ml-2">check_circle</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.explanation && (
                    <div className="mt-3 text-sm bg-neutral-100 p-3 rounded border-l-4 border-blue-400">
                      <strong>Explicação:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {evaluation?.type !== "quiz" && (
            <div className="border rounded-md p-4">
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(evaluation, null, 2)}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Phase5() {
  const [_, navigate] = useLocation();
  const { course, updatePhaseData, updateModuleStatus, setCourse } = useCourse();
  const [reviewNotes, setReviewNotes] = useState<string>(
    course?.phaseData?.phase5?.reviewNotes || ""
  );
  const { toast } = useToast();
  
  // Estados para visualização de conteúdo
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [contentPreviewOpen, setContentPreviewOpen] = useState(false);
  
  // Estados para visualização de avaliação
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [evaluationPreviewOpen, setEvaluationPreviewOpen] = useState(false);
  
  // Estados para geração de imagens
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [moduleIdForImage, setModuleIdForImage] = useState<string>("");
  
  // Função para gerar imagem para um módulo
  const generateModuleImage = async (moduleId: string) => {
    try {
      setIsGeneratingImage(true);
      setModuleIdForImage(moduleId);
      
      const moduleToUpdate = course?.modules.find(m => m.id === moduleId);
      
      if (!moduleToUpdate) {
        throw new Error("Módulo não encontrado");
      }
      
      const response = await apiRequest("POST", "/api/generate/module-image", {
        courseId: course?.id,
        moduleId: moduleId,
        moduleInfo: {
          title: moduleToUpdate.title,
          description: moduleToUpdate.description,
          order: moduleToUpdate.order,
          estimatedHours: moduleToUpdate.estimatedHours
        },
        courseDetails: {
          title: course?.title,
          theme: course?.theme,
          format: course?.format,
          platform: course?.platform,
          deliveryFormat: course?.deliveryFormat
        }
      });
      
      const data = await response.json();
      
      if (data && data.imageUrl) {
        // Atualiza o módulo com a URL da imagem
        const updatedModule = { ...moduleToUpdate, imageUrl: data.imageUrl };
        updateModuleStatus(moduleId, moduleToUpdate.status);
        
        // Atualize o curso no contexto
        setCourse(prev => {
          if (!prev) return null;
          return {
            ...prev,
            modules: prev.modules.map(mod => 
              mod.id === moduleId ? { ...mod, imageUrl: data.imageUrl } : mod
            )
          };
        });
        
        toast({
          title: "Imagem gerada com sucesso",
          description: "A imagem para o módulo foi gerada e adicionada.",
        });
      } else {
        throw new Error("Não foi possível gerar a imagem");
      }
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      toast({
        title: "Erro ao gerar imagem",
        description: "Não foi possível gerar a imagem para o módulo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
      setModuleIdForImage("");
    }
  };

  const reviewCourse = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate/review", {
        courseId: course?.id,
        reviewNotes
      });
      return response.json();
    },
    onSuccess: (data) => {
      updatePhaseData(5, {
        ...course?.phaseData?.phase5,
        aiReview: data,
        reviewNotes,
        completed: true
      });
      
      toast({
        title: "Course Review Complete",
        description: "Your course has been reviewed successfully.",
      });
    }
  });

  // Função para gerar e baixar o CSV diretamente
  const generateAndExportCSV = () => {
    if (!course) return;
    
    // CSV header
    let csv = "Data Type,ID,Title,Description,Content\n";
    
    // Informações básicas do curso
    csv += `Course,${course.id || ""},${course.title || ""},"${course.theme || ""} (${course.format || ""})","${JSON.stringify({
      estimatedHours: course.estimatedHours,
      platform: course.platform,
      deliveryFormat: course.deliveryFormat,
      currentPhase: course.currentPhase,
      progress: course.progress || {}
    }).replace(/"/g, '""')}"\n`;
    
    // Dados das fases (se existirem)
    if (course.phaseData) {
      Object.entries(course.phaseData).forEach(([phase, phaseData]) => {
        if (phaseData) {
          csv += `PhaseData,${phase},"Phase ${phase.replace('phase', '')} Data","","${JSON.stringify(phaseData).replace(/"/g, '""')}"\n`;
        }
      });
    }
    
    // Módulos
    if (course.modules && Array.isArray(course.modules)) {
      course.modules.forEach((module) => {
        // Informações básicas do módulo
        csv += `Module,${module.id || ""},${module.title || ""},"${module.description || ""}","${JSON.stringify({
          order: module.order,
          estimatedHours: module.estimatedHours,
          status: module.status,
          imageUrl: module.imageUrl || ""
        }).replace(/"/g, '""')}"\n`;
        
        // Conteúdo do módulo (se existir)
        if (module.content) {
          // Conteúdo textual
          if (module.content.text) {
            const textContent = module.content.text.replace(/"/g, '""').substring(0, 1000) + (module.content.text.length > 1000 ? "..." : "");
            csv += `Content,${module.id}_text,"Text Content for ${module.title}","","${textContent}"\n`;
          }
          
          // Script de vídeo
          if (module.content.videoScript) {
            const videoScript = module.content.videoScript.replace(/"/g, '""').substring(0, 1000) + (module.content.videoScript.length > 1000 ? "..." : "");
            csv += `Content,${module.id}_video,"Video Script for ${module.title}","","${videoScript}"\n`;
          }
          
          // Atividades
          if (module.content.activities && module.content.activities.length > 0) {
            module.content.activities.forEach((activity, activityIndex) => {
              csv += `Activity,${module.id}_activity_${activityIndex},${activity.title || ""},"${activity.description || ""}","${JSON.stringify(activity).replace(/"/g, '""')}"\n`;
            });
          }
        }
      });
    }
    
    // Download do arquivo CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curso_${course.id}_completo.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Função para gerar e baixar o JSON diretamente
  const generateAndExportJSON = () => {
    if (!course) return;
    
    const jsonContent = JSON.stringify(course, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curso_${course.id}_completo.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const exportCourse = useMutation({
    mutationFn: async (format: 'json' | 'csv' = 'json') => {
      try {
        if (format === 'csv') {
          generateAndExportCSV();
        } else {
          generateAndExportJSON();
        }
        
        return { success: true };
      } catch (error) {
        console.error("Erro ao exportar curso:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Exportação Concluída",
        description: "Seu curso foi exportado com sucesso.",
        variant: "success"
      });
    },
    onError: () => {
      toast({
        title: "Falha na Exportação",
        description: "Não foi possível exportar seu curso. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const handleSaveReviewNotes = () => {
    updatePhaseData(5, {
      ...course?.phaseData?.phase5,
      reviewNotes
    });
    
    toast({
      title: "Review Notes Saved",
      description: "Your review notes have been saved.",
    });
  };

  // Estado para controlar a exibição de modais e feedback
  const [googleDriveAuthUrl, setGoogleDriveAuthUrl] = useState<string | null>(null);
  const [googleDriveFileUrl, setGoogleDriveFileUrl] = useState<string | null>(null);
  const [showDriveAuthModal, setShowDriveAuthModal] = useState(false);
  const [showDriveSuccessModal, setShowDriveSuccessModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  // Mutação para gerar PDF localmente
  const generatePdf = useMutation({
    mutationFn: async () => {
      if (!course) throw new Error("Nenhum curso selecionado");
      
      const response = await apiRequest(
        "GET", 
        `/api/course/${course.id}/generate-pdf`, 
        {}
      );
      
      return response.json();
    },
    onMutate: () => {
      setIsGeneratingPdf(true);
    },
    onSuccess: async (data) => {
      if (data.downloadUrl) {
        // Abrir o download em uma nova aba
        window.open(data.downloadUrl, '_blank');
      }
      
      toast({
        title: "PDF Gerado com Sucesso",
        description: "Seu curso foi exportado para PDF."
      });
    },
    onError: (error) => {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Falha ao Gerar PDF",
        description: "Não foi possível criar o PDF do curso.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsGeneratingPdf(false);
    }
  });

  // Mutação para obter URL de autorização do Google Drive
  const getGoogleAuthUrl = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/auth/google", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        setGoogleDriveAuthUrl(data.authUrl);
        setShowDriveAuthModal(true);
      }
    },
    onError: (error) => {
      console.error("Erro ao obter URL de autorização:", error);
      toast({
        title: "Falha na Configuração",
        description: "Não foi possível conectar ao Google Drive.",
        variant: "destructive"
      });
    }
  });

  // Mutação para fazer upload do PDF para o Google Drive
  const uploadToDrive = useMutation({
    mutationFn: async () => {
      if (!course) throw new Error("Nenhum curso selecionado");
      
      const response = await apiRequest(
        "POST", 
        `/api/course/${course.id}/upload-to-drive`, 
        {}
      );
      
      return response.json();
    },
    onMutate: () => {
      setIsUploadingToDrive(true);
    },
    onSuccess: (data) => {
      if (data.needsAuth && data.authUrl) {
        // Precisamos de autorização
        setGoogleDriveAuthUrl(data.authUrl);
        setShowDriveAuthModal(true);
      } else if (data.success && data.viewLink) {
        // Upload bem-sucedido
        setGoogleDriveFileUrl(data.viewLink);
        setShowDriveSuccessModal(true);
        
        toast({
          title: "Upload Concluído",
          description: "Seu curso foi salvo no Google Drive com sucesso."
        });
      }
    },
    onError: (error) => {
      console.error("Erro ao fazer upload para o Drive:", error);
      toast({
        title: "Falha no Upload",
        description: "Não foi possível enviar o curso para o Google Drive.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploadingToDrive(false);
    }
  });

  // Função para iniciar o fluxo de autorização do Google
  const handleGoogleAuth = () => {
    if (googleDriveAuthUrl) {
      // Abre a janela de autorização do Google
      window.open(googleDriveAuthUrl, '_blank');
      setShowDriveAuthModal(false);
      
      toast({
        title: "Autorização Necessária",
        description: "Complete a autorização no Google para continuar.",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={5}
          title="Fase 5: Revisão e Finalização" 
          description="Revise, refine e finalize o conteúdo do seu curso"
        />

        <div className="mb-8">
          <h3 className="text-lg font-heading font-medium text-neutral-800 mb-4">Visão Geral do Curso</h3>
          
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>{course?.title || "Untitled Course"}</CardTitle>
              <CardDescription>
                {course?.theme || "No theme specified"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Total Modules</h4>
                  <p className="text-2xl font-semibold text-primary">{course?.modules.length || 0}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Estimated Hours</h4>
                  <p className="text-2xl font-semibold text-primary">{course?.estimatedHours || 0}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Format</h4>
                  <p className="text-lg font-medium">{course?.format || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700">Platform</h4>
                  <p className="text-lg font-medium">{course?.platform || "Not specified"}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Module Completion Status</h4>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ 
                      width: `${course ? 
                        (course.modules.filter(m => m.status === "generated" || m.status === "approved").length / 
                        Math.max(course.modules.length, 1)) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>0%</span>
                  <span>
                    {course ? 
                      Math.round((course.modules.filter(m => m.status === "generated" || m.status === "approved").length / 
                      Math.max(course.modules.length, 1)) * 100) : 0}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="modules">
            <TabsList className="mb-4">
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="reviewer">Review Assistant</TabsTrigger>
            </TabsList>
            
            <TabsContent value="modules">
              <div className="space-y-4">
                {course?.modules.map(module => (
                  <Card key={module.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">{module.title}</CardTitle>
                        <span className={`text-xs px-2 py-1 rounded ${
                          module.status === "approved" 
                            ? "bg-green-100 text-green-800" 
                            : module.status === "generated" 
                            ? "bg-blue-100 text-blue-800"
                            : "bg-neutral-100"
                        }`}>
                          {module.status === "approved" ? "Approved" : 
                           module.status === "generated" ? "Generated" : 
                           module.status === "in_progress" ? "In Progress" : "Not Started"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-neutral-600">{module.description}</p>
                      
                      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                        <div className="flex items-center">
                          <span className="material-icons text-xs mr-1">schedule</span>
                          <span>{module.estimatedHours} hours</span>
                        </div>
                        {module.content && (
                          <>
                            <span>•</span>
                            <div className="flex items-center">
                              <span className="material-icons text-xs mr-1">description</span>
                              <span>Content available</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!module.content}
                          className="text-xs"
                          onClick={() => {
                            if (module.content) {
                              setSelectedModule(module);
                              setContentPreviewOpen(true);
                            }
                          }}
                        >
                          <span className="material-icons text-xs mr-1">visibility</span>
                          View Content
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!course?.phaseData?.phase4?.evaluations?.[module.id]}
                          className="text-xs"
                          onClick={() => {
                            if (course?.phaseData?.phase4?.evaluations?.[module.id]) {
                              setSelectedEvaluation(course.phaseData.phase4.evaluations[module.id]);
                              setEvaluationPreviewOpen(true);
                            }
                          }}
                        >
                          <span className="material-icons text-xs mr-1">quiz</span>
                          View Evaluation
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                          onClick={() => generateModuleImage(module.id)}
                          disabled={isGeneratingImage}
                        >
                          <span className="material-icons text-xs mr-1">image</span>
                          {isGeneratingImage && moduleIdForImage === module.id ? "Generating..." : "Generate Image"}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
                
                {(!course?.modules || course.modules.length === 0) && (
                  <div className="text-center p-6 border border-dashed border-neutral-300 rounded-md">
                    <p className="text-neutral-600">No modules available. Return to Phase 2 to create modules.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="evaluation">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evaluation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {course?.phaseData?.phase4?.evaluations ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Module Evaluations</h4>
                          <p className="text-2xl font-semibold text-primary">
                            {Object.keys(course.phaseData.phase4.evaluations).length} / {course.modules.length}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Final Evaluation</h4>
                          <p className="text-lg font-medium">
                            {course.phaseData.phase4.courseEvaluation ? "Created" : "Not created"}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline"
                        onClick={() => navigate("/phase4")}
                      >
                        View & Edit Evaluations
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="material-icons text-4xl text-neutral-300 mb-2">assessment</span>
                      <p className="text-neutral-600">No evaluations have been created yet.</p>
                      <Button 
                        className="mt-4"
                        onClick={() => navigate("/phase4")}
                      >
                        Go to Evaluation Phase
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviewer">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Notes</CardTitle>
                    <CardDescription>
                      Add your notes for the AI reviewer to consider
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Add any notes or specific aspects you want the AI to focus on during review..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="min-h-32"
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={handleSaveReviewNotes}
                    >
                      Save Notes
                    </Button>
                    <Button 
                      onClick={() => reviewCourse.mutate()}
                      disabled={reviewCourse.isPending}
                    >
                      <span className="material-icons text-sm mr-1">rate_review</span>
                      {reviewCourse.isPending ? "Reviewing..." : "Generate AI Review"}
                    </Button>
                  </CardFooter>
                </Card>
                
                {course?.phaseData?.phase5?.aiReview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Review Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none text-sm">
                        <div dangerouslySetInnerHTML={{ 
                          __html: typeof course.phaseData.phase5.aiReview === "string" 
                            ? course.phaseData.phase5.aiReview.replace(/\n/g, '<br />') 
                            : JSON.stringify(course.phaseData.phase5.aiReview, null, 2)
                        }} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            <span className="material-icons text-sm mr-1">home</span>
            Return to Home
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => exportCourse.mutate('json')}
              disabled={exportCourse.isPending}
            >
              <span className="material-icons text-sm mr-1">code</span>
              {exportCourse.isPending ? "Exporting..." : "Export as JSON"}
            </Button>
            <Button 
              onClick={() => exportCourse.mutate('csv')}
              disabled={exportCourse.isPending}
            >
              <span className="material-icons text-sm mr-1">file_download</span>
              {exportCourse.isPending ? "Exporting..." : "Export as CSV"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Renderizar os componentes de visualização */}
      <ModuleContentPreview 
        module={selectedModule} 
        onClose={() => setContentPreviewOpen(false)} 
      />
      
      <EvaluationPreview 
        evaluation={selectedEvaluation} 
        onClose={() => setEvaluationPreviewOpen(false)} 
      />
    </div>
  );
}
