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
    console.log("🤖 [AI] Resposta COMPLETA:", aiContent);
    
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
  console.log("🔄 [PROCESS] Conteúdo recebido:", aiContent.substring(0, 500) + "...");
  
  const modules = [];
  
  // Melhorar o parsing da resposta da OpenAI
  const lines = aiContent.split('\n').filter(line => line.trim());
  let currentModuleIndex = 0;
  let currentModule: any = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detectar início de módulo (ainda mais flexível)
    if (trimmedLine.match(/^(###\s*)?(Módulo|Module)\s*\d+:/i) || 
        trimmedLine.match(/^\d+\.\s*(Módulo|Module)/i) ||
        trimmedLine.match(/^(Módulo|Module)\s*\d+\s*-/i) ||
        trimmedLine.match(/^###.*?(Módulo|Module)/i)) {
      
      // Salvar módulo anterior se existir
      if (currentModule) {
        modules.push(currentModule);
        console.log(`✅ [PROCESS] Módulo ${currentModule.order} processado: ${currentModule.title}`);
      }
      
      currentModuleIndex++;
      
      // Extrair título do módulo (limpar formatação melhorada)
      let moduleTitle = trimmedLine
        .replace(/^###\s*/i, '')
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .replace(/^(Módulo|Module)\s*\d+:\s*/i, '')
        .replace(/^\d+\.\s*(Módulo|Module)\s*\d+:\s*/i, '')
        .replace(/^(Módulo|Module)\s*\d+\s*-\s*/i, '')
        .trim();
      
      if (!moduleTitle) {
        moduleTitle = `${courseDetails.theme} - Módulo ${currentModuleIndex}`;
      }
      
      currentModule = {
        id: `module_${currentModuleIndex}`,
        title: moduleTitle,
        description: `Módulo abrangente sobre ${courseDetails.theme}, desenvolvido especificamente para ${courseDetails.publicTarget} no nível ${courseDetails.educationalLevel}`,
        order: currentModuleIndex,
        estimatedHours: Math.ceil(courseDetails.estimatedHours / moduleCount),
        status: "not_started",
        content: {
          lessons: []
        }
      };
      
      console.log(`🆕 [PROCESS] Novo módulo iniciado: ${moduleTitle}`);
    }
    // Detectar aulas (ainda mais flexível)
    else if ((trimmedLine.match(/^-\s*/) || 
              trimmedLine.match(/^\*\s*/) ||
              trimmedLine.match(/^\d+\.\d+/) || 
              trimmedLine.match(/^Aula\s*\d+/i) ||
              trimmedLine.match(/^\s*-\s*\*\*Aula/i) ||
              trimmedLine.includes('Aula')) && 
             currentModule) {
      
      const lessonOrder = currentModule.content.lessons.length + 1;
      
      // Extrair título da aula (limpar formatação melhorada)
      let lessonTitle = trimmedLine
        .replace(/^-\s*/, '')
        .replace(/^\*\s*/, '')
        .replace(/^\s*-\s*\*\*/, '')
        .replace(/\*\*:?$/, '')
        .replace(/^\d+\.\d+\s*/, '')
        .replace(/^Aula\s*\d+:\s*/i, '')
        .replace(/^\*\*Aula\s*\d+:\s*/i, '')
        .trim();
      
      if (!lessonTitle) {
        lessonTitle = `Aula ${lessonOrder}: Desenvolvimento Prático`;
      }
      
      currentModule.content.lessons.push({
        id: `lesson_${currentModuleIndex}_${lessonOrder}`,
        title: lessonTitle,
        description: `Aula especializada em ${courseDetails.theme}, adequada para ${courseDetails.publicTarget}`,
        order: lessonOrder,
        duration: "45min",
        content: generateLessonContent(lessonTitle, courseDetails),
        objectives: [
          `Compreender conceitos específicos de ${courseDetails.theme}`, 
          "Aplicar conhecimentos na prática",
          "Desenvolver competências relevantes"
        ],
        type: "video",
        materials: ["Vídeo aula principal", "Material de apoio", "Exercícios práticos", "Quiz de fixação"]
      });
      
      console.log(`📝 [PROCESS] Aula adicionada: ${lessonTitle}`);
    }
  }
  
  // Adicionar último módulo se existir
  if (currentModule) {
    modules.push(currentModule);
    console.log(`✅ [PROCESS] Último módulo processado: ${currentModule.title}`);
  }
  
  console.log(`📊 [PROCESS] Total de módulos processados: ${modules.length}/${moduleCount}`);
  
  // Garantir que temos o número correto de módulos
  while (modules.length < moduleCount) {
    const moduleIndex = modules.length + 1;
    const defaultModule = generateDefaultModule(moduleIndex, courseDetails, lessonsPerModule);
    modules.push(defaultModule);
    console.log(`➕ [PROCESS] Módulo padrão adicionado: ${defaultModule.title}`);
  }
  
  // Garantir que cada módulo tem o número correto de aulas
  modules.forEach((module, idx) => {
    console.log(`🔍 [PROCESS] Verificando módulo ${idx + 1}: ${module.content.lessons.length}/${lessonsPerModule} aulas`);
    
    while (module.content.lessons.length < lessonsPerModule) {
      const lessonIndex = module.content.lessons.length + 1;
      const defaultLesson = {
        id: `lesson_${module.order}_${lessonIndex}`,
        title: `Aula ${lessonIndex}: Aprofundamento em ${courseDetails.theme}`,
        description: `Aula complementar sobre ${courseDetails.theme} para ${courseDetails.publicTarget}`,
        order: lessonIndex,
        duration: "45min",
        content: generateLessonContent(`Aula ${lessonIndex}`, courseDetails),
        objectives: ["Consolidar aprendizado", "Aplicar conceitos práticos"],
        type: "video",
        materials: ["Vídeo aula", "Exercícios complementares"]
      };
      
      module.content.lessons.push(defaultLesson);
      console.log(`➕ [PROCESS] Aula padrão adicionada ao módulo ${module.order}: ${defaultLesson.title}`);
    }
  });
  
  console.log("✅ [PROCESS] Processamento completo!");
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

export async function generateCompetencyMapping(modules: any[], courseDetails: CourseDetails) {
  console.log("🎯 [COMPETENCY] Iniciando mapeamento de competências com OpenAI");
  
  try {
    // Verificar se temos chave da OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️ [COMPETENCY] Chave OpenAI não configurada, usando fallback");
      return generateFallbackCompetencyMapping(modules, courseDetails);
    }

    // Usar OpenAI para mapear competências aos módulos
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em design educacional que mapeia competências para módulos de curso.
          
Crie um mapeamento detalhado que distribui as competências ao longo dos módulos de forma pedagógica e progressiva.`
        },
        {
          role: "user",
          content: `Mapeie as competências para os módulos do curso "${courseDetails.title}" sobre ${courseDetails.theme}.

COMPETÊNCIAS A DESENVOLVER:
- Cognitivas: ${courseDetails.cognitiveSkills}
- Comportamentais: ${courseDetails.behavioralSkills}  
- Técnicas: ${courseDetails.technicalSkills}

MÓDULOS DO CURSO:
${modules.map((mod, idx) => `${idx + 1}. ${mod.title} - ${mod.description}`).join('\n')}

REQUISITOS:
- Distribua as competências de forma progressiva ao longo dos módulos
- Alguns módulos podem desenvolver múltiplas competências
- Adequado para ${courseDetails.publicTarget} no nível ${courseDetails.educationalLevel}
- Explique como cada competência será desenvolvida em cada módulo

Estruture sua resposta como JSON:
{
  "competencyMapping": {
    "module_1": {
      "cognitive": ["competência específica 1", "competência específica 2"],
      "behavioral": ["competência específica 1"],
      "technical": ["competência específica 1"]
    },
    "module_2": {
      ...
    }
  },
  "progressionPlan": {
    "cognitive": "Explicação da progressão das competências cognitivas",
    "behavioral": "Explicação da progressão das competências comportamentais", 
    "technical": "Explicação da progressão das competências técnicas"
  }
}`
        }
      ],
      temperature: 0.7,
    });

    const aiContent = response.choices[0].message.content || '';
    console.log("🤖 [COMPETENCY] Resposta da OpenAI:", aiContent.substring(0, 200) + "...");
    
    // Processar resposta JSON
    try {
      const mappingData = JSON.parse(aiContent);
      console.log("✅ [COMPETENCY] Mapeamento processado com sucesso");
      return {
        success: true,
        mapping: mappingData.competencyMapping || {},
        progressionPlan: mappingData.progressionPlan || {},
        generatedWithAI: true
      };
    } catch (parseError) {
      console.error("❌ [COMPETENCY] Erro ao parsear JSON da OpenAI:", parseError);
      return generateFallbackCompetencyMapping(modules, courseDetails);
    }
    
  } catch (error) {
    console.error("❌ [COMPETENCY] Erro na OpenAI:", error);
    return generateFallbackCompetencyMapping(modules, courseDetails);
  }
}

function generateFallbackCompetencyMapping(modules: any[], courseDetails: CourseDetails) {
  console.log("🔄 [COMPETENCY] Usando mapeamento de fallback");
  
  const mapping: any = {};
  const totalModules = modules.length;
  
  // Distribuir competências de forma básica
  modules.forEach((module, index) => {
    const moduleKey = `module_${index + 1}`;
    mapping[moduleKey] = {
      cognitive: [],
      behavioral: [],
      technical: []
    };
    
    // Distribuir competências cognitivas
    if (courseDetails.cognitiveSkills && index < Math.ceil(totalModules * 0.7)) {
      mapping[moduleKey].cognitive.push(`Desenvolvimento cognitivo relacionado a ${module.title}`);
    }
    
    // Distribuir competências comportamentais  
    if (courseDetails.behavioralSkills && index >= Math.floor(totalModules * 0.3)) {
      mapping[moduleKey].behavioral.push(`Desenvolvimento comportamental em ${module.title}`);
    }
    
    // Distribuir competências técnicas
    if (courseDetails.technicalSkills && index >= Math.floor(totalModules * 0.5)) {
      mapping[moduleKey].technical.push(`Competência técnica aplicada em ${module.title}`);
    }
  });
  
  return {
    success: true,
    mapping,
    progressionPlan: {
      cognitive: "Desenvolvimento progressivo das competências cognitivas ao longo do curso",
      behavioral: "Evolução gradual das competências comportamentais",
      technical: "Aplicação prática das competências técnicas"
    },
    generatedWithAI: false
  };
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