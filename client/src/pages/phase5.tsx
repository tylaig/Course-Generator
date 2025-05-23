import { useState, useEffect } from "react";
import { useCourse } from "@/context/CourseContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle, Book, ClipboardList } from "lucide-react";
import PhaseNav from "@/components/layout/PhaseNav";
import WorkflowProgress from "@/components/shared/WorkflowProgress";
import { useToast } from "@/hooks/use-toast";

export default function Phase5() {
  const { course, moveToNextPhase } = useCourse();
  const { toast } = useToast();
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadResult, setDriveUploadResult] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/google-drive/auth-status');
      const data = await response.json();
      setIsAuthorized(data.authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthorized(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleNextPhase = () => {
    moveToNextPhase();
  };

  const authorizeGoogleDrive = async () => {
    setIsAuthorizing(true);
    try {
      const response = await fetch('/api/google-drive/auth-url');
      const data = await response.json();
      
      if (data.authUrl) {
        // Open Google authorization in a new window
        const authWindow = window.open(data.authUrl, 'googleAuth', 'width=500,height=600');
        
        // Listen for the authorization code from the popup
        const handleAuthMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.code) {
            window.removeEventListener('message', handleAuthMessage);
            authWindow?.close();
            
            // Process the authorization code
            const callbackResponse = await fetch('/api/google-drive/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: event.data.code })
            });
            
            if (callbackResponse.ok) {
              setIsAuthorized(true);
              toast({
                title: "Google Drive autorizado!",
                description: "Agora você pode organizar seus arquivos no Google Drive.",
              });
            } else {
              throw new Error('Falha na autorização');
            }
          }
        };
        
        window.addEventListener('message', handleAuthMessage);
        
        // Check if window was closed without authorization
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleAuthMessage);
            setIsAuthorizing(false);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error authorizing Google Drive:', error);
      toast({
        title: "Erro na autorização",
        description: "Não foi possível autorizar o Google Drive. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/google-drive/logout', { method: 'POST' });
      setIsAuthorized(false);
      setDriveUploadResult(null);
      toast({
        title: "Desconectado com sucesso",
        description: "Você foi desconectado do Google Drive.",
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível desconectar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!course) return;
    
    setIsUploadingToDrive(true);
    setDriveUploadResult(null);
    
    try {
      const response = await fetch('/api/google-drive/upload-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          courseId: course.id,
          course: {
            title: course.title,
            theme: course.theme,
            modules: course.modules
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDriveUploadResult(result);
        
        toast({
          title: "Upload concluído com sucesso!",
          description: `Estrutura do curso criada no Google Drive com ${result.modules.length} módulos organizados.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      toast({
        title: "Erro no upload para Google Drive",
        description: "Não foi possível criar a estrutura no Google Drive. Verifique as credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Calculate statistics
  const totalModules = course?.modules?.length || 0;
  const totalLessons = course?.modules?.reduce((sum, module) => 
    sum + (module.content?.lessons?.length || 0), 0) || 0;
  const totalQuestions = course?.modules?.reduce((sum, module) => 
    sum + (module.content?.lessons?.reduce((lessonSum: number, lesson: any) => 
      lessonSum + (lesson.detailedContent?.assessmentQuestions?.length || 0) +
      (lesson.detailedContent?.practicalExercises?.reduce((exerciseSum: number, exercise: any) => 
        exerciseSum + (exercise.questions?.length || 0), 0) || 0), 0) || 0), 0) || 0;

  const lessonsWithContent = course?.modules?.reduce((sum, module) => 
    sum + (module.content?.lessons?.filter((lesson: any) => lesson.detailedContent)?.length || 0), 0) || 0;
  
  const completionPercentage = totalLessons > 0 ? Math.round((lessonsWithContent / totalLessons) * 100) : 0;

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-gray-500">Nenhum curso encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <WorkflowProgress />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 mb-8">
        <PhaseNav 
          currentPhase={5}
          title="Fase 5: Revisão e Exportação" 
          description="Revise o curso completo e exporte para PDF"
          onNext={handleNextPhase}
        />
        
        {/* Course Summary */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Book className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Módulos</p>
                    <p className="text-2xl font-bold text-blue-600">{totalModules}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Aulas</p>
                    <p className="text-2xl font-bold text-green-600">{totalLessons}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Questões</p>
                    <p className="text-2xl font-bold text-purple-600">{totalQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Progresso</p>
                    <p className="text-2xl font-bold text-orange-600">{completionPercentage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Book className="h-5 w-5" />
              <span>Detalhes do Curso</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Título</p>
                <p className="text-lg">{course.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tema</p>
                <p className="text-lg">{course.theme}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Carga Horária</p>
                <p className="text-lg">{course.estimatedHours} horas</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Formato</p>
                <p className="text-lg">{course.format}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Drive Integration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.24 8.64L12 2.88L17.76 8.64L22.08 12L12 22.08L1.92 12L6.24 8.64Z"/>
              </svg>
              <span>Integração com Google Drive</span>
            </CardTitle>
            <CardDescription>
              Crie automaticamente uma estrutura organizada no Google Drive com pastas para cada módulo e PDFs individuais para aulas e atividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkingAuth ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-gray-600 rounded-full"></span>
                    <span className="text-gray-700">Verificando autorização...</span>
                  </div>
                </div>
              ) : !isAuthorized ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">🔐 Autorização necessária</h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    Para organizar seus arquivos no Google Drive, primeiro precisamos autorizar o acesso.
                  </p>
                  <Button 
                    onClick={authorizeGoogleDrive}
                    disabled={isAuthorizing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isAuthorizing ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                        Autorizando...
                      </span>
                    ) : (
                      <>
                        🔓 Autorizar Google Drive
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-900 mb-1">✅ Google Drive autorizado</h4>
                        <p className="text-sm text-green-800">
                          Pronto para organizar seus arquivos no Google Drive!
                        </p>
                      </div>
                      <Button
                        onClick={logout}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Estrutura que será criada:</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>📁 {course.title}</div>
                      {course.modules.map((module, idx) => (
                        <div key={module.id} className="ml-4">
                          <div>📁 {module.title} (Módulo)</div>
                          {module.content?.lessons?.map((lesson: any, lessonIdx: number) => (
                            <div key={lessonIdx} className="ml-8">
                              <div>📁 {lesson.title} (Aula)</div>
                              <div className="ml-4 text-xs">
                                <div>📄 Aula.pdf</div>
                                <div>📄 Atividade.pdf</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">📁 {course.modules.length} Módulos</Badge>
                    <Badge variant="outline">📁 {totalLessons} Aulas</Badge>
                    <Badge variant="outline">📄 {totalLessons * 2} PDFs</Badge>
                    <Badge variant="outline">☁️ Organização Automática</Badge>
                  </div>
                  
                  <Button 
                    onClick={uploadToGoogleDrive}
                    disabled={isUploadingToDrive}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isUploadingToDrive ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></span>
                        Criando estrutura no Google Drive...
                      </span>
                    ) : (
                      <>
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6.24 8.64L12 2.88L17.76 8.64L22.08 12L12 22.08L1.92 12L6.24 8.64Z"/>
                        </svg>
                        Organizar no Google Drive
                      </>
                    )}
                  </Button>
                </>
              )}
              
              {/* ZIP Download Option */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📦 Download as ZIP</h4>
                <p className="text-sm text-blue-800 mb-4">
                  Download your complete course as a structured ZIP file with PDF documents organized by modules.
                </p>
                
                <div className="bg-white p-3 rounded border border-blue-200 mb-4">
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>📁 {course.title}/</div>
                    <div className="ml-4">📁 Module_1/ → Lesson PDFs + Tasks PDF</div>
                    <div className="ml-4">📁 Module_2/ → Lesson PDFs + Tasks PDF</div>
                    <div className="ml-4">📄 Course_Summary.pdf</div>
                  </div>
                </div>
                
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/courses/${course.id}/download-zip`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(course)
                      });

                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${course.title.replace(/[^a-zA-Z0-9]/g, '_')}_Course.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "Download Successful!",
                          description: "Your course ZIP file has been generated and downloaded.",
                        });
                      } else {
                        throw new Error('Failed to generate ZIP');
                      }
                    } catch (error) {
                      console.error('Error downloading ZIP:', error);
                      toast({
                        title: "Download Failed",
                        description: "Unable to generate the ZIP file. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Course ZIP
                </Button>
              </div>
              
              {driveUploadResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">✅ Upload concluído com sucesso!</h4>
                  <div className="text-sm text-green-800">
                    <p>Pasta principal: <strong>{course.title}</strong></p>
                    <p>{driveUploadResult.modules.length} módulos organizados</p>
                    <p>Total de arquivos criados: {driveUploadResult.modules.reduce((sum: number, m: any) => sum + m.lessons.length * 2, 0)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral dos Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {course.modules.map((module, index) => {
                const moduleQuestions = module.content?.lessons?.reduce((sum: number, lesson: any) => 
                  sum + (lesson.detailedContent?.assessmentQuestions?.length || 0) +
                  (lesson.detailedContent?.practicalExercises?.reduce((exerciseSum: number, exercise: any) => 
                    exerciseSum + (exercise.questions?.length || 0), 0) || 0), 0) || 0;
                
                const moduleLessons = module.content?.lessons?.length || 0;
                const lessonsWithContent = module.content?.lessons?.filter((lesson: any) => lesson.detailedContent)?.length || 0;
                
                return (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{index + 1}. {module.title}</h4>
                      <Badge 
                        variant={lessonsWithContent === moduleLessons ? "default" : "outline"}
                        className={lessonsWithContent === moduleLessons ? "bg-green-100 text-green-800" : ""}
                      >
                        {lessonsWithContent}/{moduleLessons} aulas
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {moduleLessons} aulas
                      </span>
                      <span className="flex items-center">
                        <ClipboardList className="h-4 w-4 mr-1" />
                        {moduleQuestions} questões
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {Math.round((lessonsWithContent / moduleLessons) * 100)}% completo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <Button 
            onClick={handleNextPhase}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Finalizar Curso
          </Button>
        </div>
      </div>
    </div>
  );
}