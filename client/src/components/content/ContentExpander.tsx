import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useCourse } from "@/context/CourseContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Expand, Lightbulb, BookOpen, Zap, Target, Brain } from "lucide-react";

interface ContentExpanderProps {
  originalContent: string;
  contentType: string;
  onContentExpanded?: (expandedContent: any) => void;
}

export default function ContentExpander({ 
  originalContent, 
  contentType, 
  onContentExpanded 
}: ContentExpanderProps) {
  const { course } = useCourse();
  const { toast } = useToast();
  
  const [isExpanding, setIsExpanding] = useState(false);
  const [expansionType, setExpansionType] = useState<string>("");
  const [expandedResult, setExpandedResult] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Tipos de expansão disponíveis
  const expansionOptions = [
    {
      value: "detailed",
      label: "Mais Detalhado",
      description: "Adicionar mais detalhes e exemplos práticos",
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      value: "examples",
      label: "Mais Exemplos",
      description: "Incluir exemplos adicionais e casos de uso",
      icon: <Lightbulb className="h-4 w-4" />
    },
    {
      value: "simplified",
      label: "Simplificar",
      description: "Tornar mais acessível e fácil de entender",
      icon: <Zap className="h-4 w-4" />
    },
    {
      value: "advanced",
      label: "Aprofundar",
      description: "Expandir com conceitos avançados",
      icon: <Brain className="h-4 w-4" />
    },
    {
      value: "practical",
      label: "Mais Prático",
      description: "Focar em aplicações práticas e hands-on",
      icon: <Target className="h-4 w-4" />
    },
    {
      value: "theoretical",
      label: "Base Teórica",
      description: "Expandir com fundamentação teórica",
      icon: <BookOpen className="h-4 w-4" />
    }
  ];

  const handleExpand = async () => {
    if (!expansionType || !course) {
      toast({
        title: "Erro",
        description: "Selecione um tipo de expansão",
        variant: "destructive"
      });
      return;
    }

    setIsExpanding(true);
    
    try {
      const expandedContent = await apiRequest("POST", "/api/content/expand", {
        originalContent,
        contentType,
        expansionType,
        courseDetails: {
          title: course.title,
          theme: course.theme,
          educationalLevel: course.phaseData?.phase1?.educationalLevel || "Intermediate",
          publicTarget: course.phaseData?.phase1?.publicTarget || "Adult learners"
        },
        aiConfig: course.aiConfig
      });

      setExpandedResult(expandedContent);
      
      if (onContentExpanded) {
        onContentExpanded(expandedContent);
      }

      toast({
        title: "Conteúdo Expandido!",
        description: `Adicionadas ${expandedContent.metadata?.sectionsAdded || 0} novas seções`,
      });

    } catch (error) {
      console.error("Erro ao expandir conteúdo:", error);
      toast({
        title: "Erro na Expansão",
        description: "Não foi possível expandir o conteúdo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsExpanding(false);
    }
  };

  const selectedOption = expansionOptions.find(opt => opt.value === expansionType);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Expand className="h-4 w-4" />
          Expandir Conteúdo
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Expand className="h-5 w-5" />
            Expandir Conteúdo
          </DialogTitle>
          <DialogDescription>
            Selecione como você gostaria de expandir este conteúdo usando IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview do conteúdo original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conteúdo Original</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={originalContent.substring(0, 300) + (originalContent.length > 300 ? '...' : '')}
                readOnly
                className="min-h-[100px] resize-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary">{contentType}</Badge>
                <span className="text-sm text-muted-foreground">
                  {originalContent.length} caracteres
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Seleção do tipo de expansão */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tipo de Expansão</label>
            <Select value={expansionType} onValueChange={setExpansionType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione como expandir o conteúdo" />
              </SelectTrigger>
              <SelectContent>
                {expansionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedOption && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {selectedOption.icon}
                    <span className="font-medium">{selectedOption.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedOption.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Botão de expansão */}
          <div className="flex gap-3">
            <Button 
              onClick={handleExpand} 
              disabled={!expansionType || isExpanding}
              className="flex-1"
            >
              {isExpanding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Expandindo...
                </>
              ) : (
                <>
                  <Expand className="h-4 w-4 mr-2" />
                  Expandir Conteúdo
                </>
              )}
            </Button>
          </div>

          {/* Resultado da expansão */}
          {expandedResult && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    ✓ Expandido
                  </Badge>
                  Conteúdo Expandido
                </CardTitle>
                <CardDescription className="text-green-700">
                  {expandedResult.metadata?.sectionsAdded} novas seções adicionadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={expandedResult.expandedContent}
                  readOnly
                  className="min-h-[200px] bg-white"
                />
                
                {expandedResult.addedSections && expandedResult.addedSections.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Seções Adicionadas:</h4>
                    <div className="space-y-2">
                      {expandedResult.addedSections.map((section: any, index: number) => (
                        <Card key={index} className="bg-white">
                          <CardContent className="pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{section.type}</Badge>
                              <span className="font-medium text-sm">{section.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {section.content.substring(0, 150)}...
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {expandedResult.suggestions && expandedResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Sugestões para Melhorias:</h4>
                    <ul className="space-y-1">
                      {expandedResult.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}