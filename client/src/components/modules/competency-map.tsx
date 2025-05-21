import React, { useState, useEffect } from "react";
import { CourseModule } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CompetencyMapProps {
  modules: CourseModule[];
  competenciesMap: any;
  onSave: (map: any) => void;
}

export function CompetencyMap({ modules, competenciesMap, onSave }: CompetencyMapProps) {
  const { toast } = useToast();
  const [localMap, setLocalMap] = useState<any>(competenciesMap || {});
  const [isGenerating, setIsGenerating] = useState(false);

  // Inicializar o mapa com categorias padrão se não existirem
  useEffect(() => {
    const categories = ["cognitive", "behavioral", "technical"];
    const defaultMap = { ...localMap };

    categories.forEach(category => {
      if (!defaultMap[category]) {
        defaultMap[category] = {};
      }
    });

    setLocalMap(defaultMap);
  }, []);

  // Atualizar o mapa quando os módulos mudarem
  useEffect(() => {
    const updatedMap = { ...localMap };
    
    modules.forEach(module => {
      // Garantir que cada módulo tenha uma entrada no mapa
      if (!updatedMap.cognitive[module.id]) {
        updatedMap.cognitive[module.id] = module.cognitiveSkills || "";
      }
      
      if (!updatedMap.behavioral[module.id]) {
        updatedMap.behavioral[module.id] = module.behavioralSkills || "";
      }
      
      if (!updatedMap.technical[module.id]) {
        updatedMap.technical[module.id] = module.technicalSkills || "";
      }
    });
    
    setLocalMap(updatedMap);
  }, [modules]);

  // Função para atualizar o valor de uma competência
  const handleCompetencyChange = (category: string, moduleId: string, value: string) => {
    setLocalMap(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [moduleId]: value
      }
    }));
  };

  // Função para gerar mapa de competências com IA
  const generateCompetencyMap = async () => {
    if (modules.length === 0) {
      toast({
        title: "Nenhum módulo disponível",
        description: "Adicione alguns módulos antes de gerar o mapa de competências.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    // Simulação de geração com IA
    setTimeout(() => {
      const newMap = {
        cognitive: {},
        behavioral: {},
        technical: {}
      };
      
      modules.forEach(module => {
        // Gerar competências cognitivas simuladas
        newMap.cognitive[module.id] = generateSimulatedCompetencies("cognitive", module);
        
        // Gerar competências comportamentais simuladas
        newMap.behavioral[module.id] = generateSimulatedCompetencies("behavioral", module);
        
        // Gerar competências técnicas simuladas
        newMap.technical[module.id] = generateSimulatedCompetencies("technical", module);
      });
      
      setLocalMap(newMap);
      onSave(newMap);
      
      setIsGenerating(false);
      
      toast({
        title: "Mapa de competências gerado",
        description: "O mapeamento de competências foi gerado com sucesso para todos os módulos."
      });
    }, 2000);
  };

  // Função auxiliar para gerar competências simuladas
  const generateSimulatedCompetencies = (type: string, module: CourseModule): string => {
    const competenciesByType = {
      cognitive: [
        "Análise crítica",
        "Resolução de problemas",
        "Tomada de decisão",
        "Raciocínio lógico",
        "Pensamento sistêmico",
        "Interpretação de dados",
        "Síntese de informações",
        "Avaliação de alternativas",
        "Pensamento criativo",
        "Memória de trabalho"
      ],
      behavioral: [
        "Comunicação eficaz",
        "Trabalho em equipe",
        "Liderança colaborativa",
        "Gestão do tempo",
        "Adaptabilidade",
        "Empatia",
        "Resiliência",
        "Negociação",
        "Inteligência emocional",
        "Proatividade"
      ],
      technical: [
        "Fluência tecnológica",
        "Análise de dados",
        "Programação básica",
        "Pesquisa avançada",
        "Documentação técnica",
        "Gerenciamento de projetos",
        "Prototipagem",
        "Testes e validação",
        "Manuseio de ferramentas",
        "Aplicação de métodos"
      ]
    };
    
    // Selecionar 2-4 competências aleatórias baseadas no título e tópicos do módulo
    const availableCompetencies = competenciesByType[type as keyof typeof competenciesByType];
    const numCompetencies = 2 + Math.floor(Math.random() * 3); // 2 a 4 competências
    
    // Usar o ID do módulo para ter uma seleção consistente mas pseudo-aleatória
    const idSum = module.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    const selectedCompetencies = [];
    for (let i = 0; i < numCompetencies; i++) {
      const index = (idSum + i) % availableCompetencies.length;
      selectedCompetencies.push(availableCompetencies[index]);
    }
    
    return selectedCompetencies.join(", ");
  };

  // Função para salvar o mapa de competências
  const handleSave = () => {
    onSave(localMap);
    
    toast({
      title: "Mapa salvo",
      description: "O mapeamento de competências foi salvo com sucesso."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Mapeamento de Competências</h2>
          <p className="text-sm text-gray-500">
            Mapeie as competências desenvolvidas em cada módulo do curso
          </p>
        </div>
        <Button
          onClick={generateCompetencyMap}
          disabled={isGenerating || modules.length === 0}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isGenerating ? "Gerando..." : "Gerar com IA"}
        </Button>
      </div>
      
      {modules.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-gray-500">
              Adicione módulos ao curso para começar a mapear competências
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Competências Cognitivas</CardTitle>
                <CardDescription>
                  Habilidades mentais como análise, síntese, avaliação e criação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map(module => (
                  <div key={`cognitive-${module.id}`} className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">{module.order}</Badge>
                      <Label>{module.title}</Label>
                    </div>
                    <Textarea
                      value={localMap?.cognitive?.[module.id] || ""}
                      onChange={(e) => handleCompetencyChange("cognitive", module.id, e.target.value)}
                      placeholder="Listar competências cognitivas para este módulo..."
                      className="min-h-[80px]"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Competências Comportamentais</CardTitle>
                <CardDescription>
                  Habilidades interpessoais e atitudes no ambiente profissional
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map(module => (
                  <div key={`behavioral-${module.id}`} className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">{module.order}</Badge>
                      <Label>{module.title}</Label>
                    </div>
                    <Textarea
                      value={localMap?.behavioral?.[module.id] || ""}
                      onChange={(e) => handleCompetencyChange("behavioral", module.id, e.target.value)}
                      placeholder="Listar competências comportamentais para este módulo..."
                      className="min-h-[80px]"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Competências Técnicas</CardTitle>
                <CardDescription>
                  Habilidades práticas e conhecimentos específicos da área
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map(module => (
                  <div key={`technical-${module.id}`} className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">{module.order}</Badge>
                      <Label>{module.title}</Label>
                    </div>
                    <Textarea
                      value={localMap?.technical?.[module.id] || ""}
                      onChange={(e) => handleCompetencyChange("technical", module.id, e.target.value)}
                      placeholder="Listar competências técnicas para este módulo..."
                      className="min-h-[80px]"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSave}>Salvar Mapeamento</Button>
          </div>
        </>
      )}
    </div>
  );
}