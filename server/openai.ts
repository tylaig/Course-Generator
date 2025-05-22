import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODELS = {
  GPT4O: "gpt-4o",
  GPT4: "gpt-4",
  GPT35TURBO: "gpt-3.5-turbo"
};

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Common types
export type CourseDetails = {
  title: string;
  theme: string;
  estimatedHours: number;
  format: string;
  platform: string;
  deliveryFormat: string;
  moduleCount?: number;
  lessonsPerModule?: number;
  publicTarget?: string;
  educationalLevel?: string;
  familiarityLevel?: string;
  motivation?: string;
  cognitiveSkills?: string;
  behavioralSkills?: string;
  technicalSkills?: string;
};

export type Module = {
  title: string;
  description: string;
  order: number;
  estimatedHours: number;
};

export type AIConfig = {
  model: string;
  optimization: string;
  languageStyle: string;
  difficultyLevel: string;
  contentDensity: number;
  teachingApproach: string;
  contentTypes: string[];
  language: string;
};

// Generate course structure using Phase 1 data and OpenAI
export async function generateStructure(courseDetails: CourseDetails, phaseData: any) {
  console.log("📚 [STRUCTURE] Iniciando geração de estrutura com OpenAI");
  console.log("📚 [STRUCTURE] Dados Phase 1:", phaseData);
  
  const moduleCount = courseDetails.moduleCount || 6;
  const lessonsPerModule = courseDetails.lessonsPerModule || 5;
  
  try {
    console.log("🤖 [AI] Chamando OpenAI para gerar conteúdo real...");
    
    // Verificar se temos chave da OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️ [AI] Chave OpenAI não configurada, usando fallback");
      return generateFallbackStructure(courseDetails, moduleCount, lessonsPerModule);
    }

    // Usar OpenAI para gerar módulos mais detalhados baseados na Phase 1
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em design educacional que cria cursos no estilo Hotmart. 
          
Crie uma estrutura de curso detalhada e pedagógica baseada nos dados da estratégia educacional fornecida.`
        },
        {
          role: "user",
          content: `Crie ${moduleCount} módulos para o curso "${courseDetails.title}" sobre ${courseDetails.theme}.

DADOS DA ESTRATÉGIA EDUCACIONAL (PHASE 1):
${JSON.stringify(phaseData, null, 2)}

ESPECIFICAÇÕES DO CURSO:
- Título: ${courseDetails.title}
- Tema: ${courseDetails.theme}
- Público-alvo: ${courseDetails.publicTarget}
- Nível educacional: ${courseDetails.educationalLevel}
- Familiaridade: ${courseDetails.familiarityLevel}
- Motivação: ${courseDetails.motivation}

COMPETÊNCIAS A DESENVOLVER:
- Cognitivas: ${courseDetails.cognitiveSkills}
- Comportamentais: ${courseDetails.behavioralSkills}
- Técnicas: ${courseDetails.technicalSkills}

REQUISITOS:
- ${moduleCount} módulos progressivos
- ${lessonsPerModule} aulas por módulo
- Estilo Hotmart: títulos atrativos, objetivos claros, progressão lógica
- Adequado para ${courseDetails.publicTarget} no nível ${courseDetails.educationalLevel}

Estruture sua resposta assim:

Módulo 1: [Título do Módulo]
- Aula 1: [Título da Aula]
- Aula 2: [Título da Aula]
- Aula 3: [Título da Aula]
(continue...)

Módulo 2: [Título do Módulo]
- Aula 1: [Título da Aula]
(continue...)

Seja específico, prático e pedagógico.`
        }
      ],
      temperature: 0.7,
    });

    const aiContent = response.choices[0].message.content || '';
    console.log("🤖 [AI] Resposta da OpenAI recebida:", aiContent.substring(0, 200) + "...");
    
    // Processar resposta da OpenAI e estruturar dados
    const modules = await processAIResponse(aiContent, courseDetails, moduleCount, lessonsPerModule);
    
    console.log("✅ [AI] Estrutura com IA gerada:", {
      totalModules: modules.length,
      totalLessons: modules.reduce((acc, mod) => acc + mod.content.lessons.length, 0)
    });
    
    return { 
      modules,
      totalHours: courseDetails.estimatedHours,
      totalModules: modules.length,
      totalLessons: modules.reduce((acc, mod) => acc + mod.content.lessons.length, 0),
      generatedWithAI: true
    };
    
  } catch (error) {
    console.error("❌ [AI] Erro na OpenAI:", error.message);
    console.log("🔄 [AI] Usando estrutura de fallback...");
    return generateFallbackStructure(courseDetails, moduleCount, lessonsPerModule);
  }
}

// Processar resposta da OpenAI e estruturar dados
async function processAIResponse(aiContent: string, courseDetails: CourseDetails, moduleCount: number, lessonsPerModule: number) {
  console.log("🔄 [PROCESS] Processando resposta da OpenAI");
  
  const modules = [];
  
  // Extrair módulos e aulas da resposta (parsing simples)
  const lines = aiContent.split('\n').filter(line => line.trim());
  let currentModuleIndex = 0;
  let currentModule: any = null;
  
  for (const line of lines) {
    // Detectar início de módulo
    if (line.match(/^(Módulo|Module)\s*\d+/i) || line.match(/^\d+\./)) {
      if (currentModule) {
        modules.push(currentModule);
      }
      
      currentModuleIndex++;
      currentModule = {
        id: `module_${currentModuleIndex}`,
        title: line.replace(/^\d+\.\s*/, '').trim(),
        description: `Módulo focado em desenvolver competências em ${courseDetails.theme}`,
        order: currentModuleIndex,
        estimatedHours: Math.ceil(courseDetails.estimatedHours / moduleCount),
        status: "not_started",
        content: {
          lessons: []
        }
      };
    }
    // Detectar aulas dentro do módulo
    else if (line.match(/^-\s*/) || line.match(/^\d+\.\d+/) || line.match(/^Aula\s*\d+/i)) {
      if (currentModule) {
        const lessonOrder = currentModule.content.lessons.length + 1;
        currentModule.content.lessons.push({
          id: `lesson_${currentModuleIndex}_${lessonOrder}`,
          title: line.replace(/^-\s*/, '').replace(/^\d+\.\d+\s*/, '').trim(),
          description: `Aula focada em aspectos práticos de ${courseDetails.theme}`,
          order: lessonOrder,
          duration: "45min",
          content: generateLessonContent(line, courseDetails),
          objectives: [`Compreender conceitos de ${courseDetails.theme}`, "Aplicar conhecimentos práticos"],
          type: "video", // Estilo Hotmart
          materials: ["Video aula", "Material de apoio", "Exercícios"]
        });
      }
    }
  }
  
  // Adicionar último módulo
  if (currentModule) {
    modules.push(currentModule);
  }
  
  // Garantir que temos o número correto de módulos
  while (modules.length < moduleCount) {
    const moduleIndex = modules.length + 1;
    modules.push(generateDefaultModule(moduleIndex, courseDetails, lessonsPerModule));
  }
  
  // Garantir que cada módulo tem o número correto de aulas
  modules.forEach(module => {
    while (module.content.lessons.length < lessonsPerModule) {
      const lessonIndex = module.content.lessons.length + 1;
      module.content.lessons.push({
        id: `lesson_${module.order}_${lessonIndex}`,
        title: `Aula ${lessonIndex}: Desenvolvimento Prático`,
        description: `Aplicação prática dos conceitos de ${courseDetails.theme}`,
        order: lessonIndex,
        duration: "45min",
        content: `Conteúdo estruturado sobre ${courseDetails.theme}`,
        objectives: ["Aplicar conceitos aprendidos", "Desenvolver habilidades práticas"],
        type: "video",
        materials: ["Video aula", "Exercícios práticos"]
      });
    }
  });
  
  return modules;
}

// Gerar conteúdo de aula estruturado
function generateLessonContent(lessonTitle: string, courseDetails: CourseDetails) {
  return `
## ${lessonTitle}

### Objetivos da Aula
- Compreender os conceitos fundamentais
- Aplicar conhecimentos na prática
- Desenvolver competências específicas

### Conteúdo Principal
1. **Introdução** (5 min)
   - Contextualização do tópico
   - Conexão com aulas anteriores

2. **Desenvolvimento** (30 min)
   - Conceitos teóricos
   - Exemplos práticos
   - Demonstrações

3. **Prática** (8 min)
   - Exercícios dirigidos
   - Atividades hands-on

4. **Conclusão** (2 min)
   - Resumo dos pontos principais
   - Próximos passos

### Recursos
- Vídeo aula principal
- Material de apoio em PDF
- Exercícios práticos
- Quiz de fixação
  `;
}

// Gerar módulo padrão como fallback
function generateDefaultModule(moduleIndex: number, courseDetails: CourseDetails, lessonsPerModule: number) {
  const lessons = [];
  
  for (let j = 1; j <= lessonsPerModule; j++) {
    lessons.push({
      id: `lesson_${moduleIndex}_${j}`,
      title: `Aula ${j}: Fundamentos ${moduleIndex}.${j}`,
      description: `Desenvolvimento do tópico ${j} sobre ${courseDetails.theme}`,
      order: j,
      duration: "45min",
      content: generateLessonContent(`Aula ${j}`, courseDetails),
      objectives: [`Dominar conceitos de ${courseDetails.theme}`, "Aplicar conhecimentos práticos"],
      type: "video",
      materials: ["Vídeo aula", "Material complementar", "Exercícios"]
    });
  }
  
  return {
    id: `module_${moduleIndex}`,
    title: `Módulo ${moduleIndex}: ${courseDetails.theme} - Nível ${moduleIndex}`,
    description: `Módulo focado no desenvolvimento de competências em ${courseDetails.theme}`,
    order: moduleIndex,
    estimatedHours: Math.ceil(courseDetails.estimatedHours / (courseDetails.moduleCount || 6)),
    status: "not_started",
    content: {
      lessons: lessons
    }
  };
}

// Estrutura de fallback se OpenAI falhar
function generateFallbackStructure(courseDetails: CourseDetails, moduleCount: number, lessonsPerModule: number) {
  console.log("🔄 [FALLBACK] Gerando estrutura padrão");
  
  const modules = [];
  
  for (let i = 1; i <= moduleCount; i++) {
    modules.push(generateDefaultModule(i, courseDetails, lessonsPerModule));
  }
  
  return { 
    modules,
    totalHours: courseDetails.estimatedHours,
    totalModules: modules.length,
    totalLessons: modules.reduce((acc, mod) => acc + mod.content.lessons.length, 0),
    generatedWithAI: false
  };
}

// Placeholder functions for other features
export async function generateStrategy() {
  return { success: true };
}

export async function generateModuleContent() {
  return { success: true };
}

export async function generateEvaluation() {
  return { success: true };
}

export async function generateCourseEvaluation() {
  return { success: true };
}

export async function generateCourseReview() {
  return { success: true };
}

export async function generateAllContent() {
  return { success: true };
}

export async function generateAllEvaluations() {
  return { success: true };
}

export async function generateCompetencyMapping() {
  return { success: true };
}

export async function generateModuleImage() {
  return { success: true };
}

export async function generateAllModuleImages() {
  return { success: true };
}

export async function expandContent() {
  return { success: true };
}