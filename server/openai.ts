import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODELS = {
  GPT4O: "gpt-4o",
  GPT4: "gpt-4",
  GPT35TURBO: "gpt-3.5-turbo"
};

// Verificar se a chave API da OpenAI está configurada
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY não está configurada, algumas funcionalidades podem não funcionar corretamente.");
}

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
  moduleCount?: number; // Número de módulos solicitado pelo usuário
  lessonsPerModule?: number; // Número de aulas por módulo solicitado pelo usuário
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
  language: string; // "pt-BR" | "en-US"
};

// Language configuration helper
const getLanguageConfig = (language: string) => {
  const configs = {
    "pt-BR": {
      systemRole: "Você é um especialista em criação de conteúdo educacional",
      instructions: "Responda em português brasileiro",
      terminology: {
        course: "curso",
        module: "módulo", 
        lesson: "aula",
        evaluation: "avaliação",
        content: "conteúdo",
        objective: "objetivo",
        description: "descrição",
        exercise: "exercício",
        quiz: "questionário"
      }
    },
    "en-US": {
      systemRole: "You are an expert in educational content creation",
      instructions: "Respond in English",
      terminology: {
        course: "course",
        module: "module",
        lesson: "lesson", 
        evaluation: "evaluation",
        content: "content",
        objective: "objective",
        description: "description",
        exercise: "exercise",
        quiz: "quiz"
      }
    }
  };
  
  return configs[language as keyof typeof configs] || configs["en-US"];
};

// Generate course strategy based on inputs from phase1
export async function generateStrategy(courseDetails: CourseDetails) {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Architect Pedagógico, an educational content strategist specialized in creating learning strategies. 
          Analyze the provided course details and generate a structured course strategy that includes:
          1. A matrix aligning objectives, audience profile, and competencies to be developed
          2. Guidelines for the learning path based on cognitive progression (Bloom's taxonomy)
          3. Recommendations for methodological approaches suitable for the audience
          
          Respond with a detailed JSON object with clear sections following educational standards.
          Include insights on innovating within the course theme and approach.`
        },
        {
          role: "user",
          content: JSON.stringify(courseDetails)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating strategy:", error);
    throw error;
  }
}

// Generate course structure with modules based on strategy
export async function generateStructure(courseDetails: CourseDetails, phaseData: any) {
  try {
    const languageConfig = getLanguageConfig(courseDetails.courseLanguage || "pt-BR");
    
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `Você é o Estruturador Modular Avançado, um arquiteto educacional especializado em criação de estruturas de curso inteligentes e pedagogicamente robustas.

MISSÃO: Criar uma estrutura modular completa e avançada baseada na estratégia do curso e dados fornecidos. Responda sempre em formato JSON válido.

DIRETRIZES AVANÇADAS:
1. Análise Pedagógica Profunda:
   - Aplicar taxonomia de Bloom de forma progressiva
   - Considerar estilos de aprendizagem múltiplos
   - Implementar scaffolding educacional
   - Balancear carga cognitiva por módulo

2. Estruturação Hierárquica Inteligente:
   - Módulos com dependências claras
   - Progressão de complexidade natural
   - Pontos de verificação e consolidação
   - Trilhas alternativas para diferentes perfis

3. Geração de Aulas Detalhadas:
   - Cada módulo deve ter 4-7 aulas estruturadas
   - Aulas com objetivos específicos mensuráveis
   - Conteúdo dividido em seções lógicas
   - Atividades práticas integradas
   - Recursos didáticos diversificados

4. Avaliação Formativa e Somativa:
   - Múltiplos tipos de avaliação por módulo
   - Critérios de sucesso claros
   - Feedback personalizado
   - Autoavaliação e peer assessment

5. Adaptabilidade e Personalização:
   - Conteúdo adaptável ao nível do aluno
   - Recursos de expansão para alunos avançados
   - Suporte para diferentes ritmos de aprendizagem
   - Caminhos de recuperação para dificuldades

IMPORTANTE: Você DEVE gerar EXATAMENTE ${courseDetails.moduleCount || 5} módulos. Cada módulo deve ter entre 4-7 aulas detalhadas.

Responda com um objeto JSON estruturado seguindo o formato obrigatório:
{
  "courseStructure": {
    "totalModules": ${courseDetails.moduleCount || 5},
    "totalLessons": "número total de aulas",
    "learningPath": "descrição da jornada de aprendizagem",
    "pedagogicalApproach": "metodologia principal adotada",
    "difficultyProgression": "como a dificuldade evolui",
    "innovativeElements": ["elemento inovador 1", "elemento inovador 2"]
  },
  "modules": [
    {
      "id": "module_1",
      "title": "Título do Módulo",
      "description": "Descrição pedagógica detalhada (mín. 100 palavras)",
      "order": 1,
      "estimatedHours": "número de horas",
      "difficultyLevel": "beginner|intermediate|advanced",
      "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
      "competencyType": "cognitive|behavioral|technical",
      "prerequisites": ["pré-requisito 1", "pré-requisito 2"],
      "learningObjectives": [
        "Objetivo específico com verbo de ação",
        "Objetivo mensurável e alcançável"
      ],
      "keyCompetencies": ["competência principal 1", "competência principal 2"],
      "lessons": [
        {
          "id": "lesson_1_1",
          "title": "Título da Aula",
          "description": "Descrição detalhada do que será abordado",
          "order": 1,
          "estimatedDuration": "45 minutos",
          "objectives": ["objetivo específico da aula"],
          "contentSections": [
            {
              "type": "introduction",
              "title": "Introdução",
              "content": "Conteúdo introdutório detalhado",
              "duration": "5 minutos",
              "techniques": ["técnica pedagógica utilizada"]
            },
            {
              "type": "main_content",
              "title": "Conteúdo Principal",
              "content": "Desenvolvimento completo do tópico",
              "duration": "25 minutos",
              "techniques": ["exposição", "demonstração", "discussão"]
            },
            {
              "type": "practice",
              "title": "Prática Dirigida",
              "content": "Atividade prática step-by-step",
              "duration": "10 minutos",
              "techniques": ["prática guiada", "exercícios"]
            },
            {
              "type": "conclusion",
              "title": "Síntese e Próximos Passos",
              "content": "Consolidação e preparação para próxima aula",
              "duration": "5 minutos",
              "techniques": ["síntese", "preview"]
            }
          ],
          "activities": [
            {
              "type": "quiz|exercise|project|discussion|simulation",
              "title": "Nome da atividade",
              "description": "Descrição completa da atividade",
              "difficulty": "easy|medium|hard",
              "estimatedTime": "tempo estimado",
              "learningOutcome": "resultado esperado"
            }
          ],
          "resources": [
            {
              "type": "reading|video|interactive|tool|simulation",
              "title": "Nome do recurso",
              "description": "Descrição do recurso",
              "purpose": "propósito pedagógico"
            }
          ],
          "assessmentCriteria": ["critério 1", "critério 2"]
        }
      ],
      "moduleAssessment": {
        "type": "quiz|project|assignment|portfolio|presentation",
        "title": "Nome da avaliação do módulo",
        "description": "Descrição completa da avaliação",
        "weight": "porcentagem na nota final",
        "criteria": ["critério detalhado 1", "critério detalhado 2"],
        "rubric": "descrição da rubrica de avaliação"
      },
      "adaptiveElements": {
        "beginnerSupport": "suporte adicional para iniciantes",
        "advancedChallenges": "desafios extras para avançados",
        "alternativePaths": "caminhos alternativos de aprendizagem"
      },
      "resources": ["recurso adicional 1", "recurso adicional 2"],
      "nextModule": "module_2 ou null se último"
    }
  ],
  "assessmentStrategy": {
    "formativeAssessments": "estratégia de avaliação contínua detalhada",
    "summativeAssessments": "estratégia de avaliação final detalhada",
    "feedbackMechanism": "como o feedback será fornecido",
    "progressTracking": "como o progresso será acompanhado"
  },
  "innovationFeatures": {
    "gamificationElements": ["elemento de gamificação 1", "elemento 2"],
    "adaptiveLearning": "como o sistema se adapta ao aluno",
    "collaborativeFeatures": "recursos de colaboração",
    "realWorldApplication": "conexões com mundo real"
  },
  "qualityAssurance": {
    "pedagogicalValidation": "validação pedagógica aplicada",
    "contentReview": "processo de revisão de conteúdo",
    "accessibilityFeatures": "recursos de acessibilidade"
  }
}

${languageConfig.instructions}`
        },
        {
          role: "user",
          content: `DADOS DO CURSO PARA ESTRUTURAÇÃO:

Informações Básicas:
- Título: ${courseDetails.title}
- Tema: ${courseDetails.theme}
- Horas Estimadas: ${courseDetails.estimatedHours}
- Formato: ${courseDetails.format}
- Plataforma: ${courseDetails.platform}
- Público-alvo: ${courseDetails.publicTarget}
- Nível Educacional: ${courseDetails.educationalLevel}
- Familiaridade: ${courseDetails.familiarityLevel}
- Motivação: ${courseDetails.motivation}

Competências a Desenvolver:
- Cognitivas: ${courseDetails.cognitiveSkills}
- Comportamentais: ${courseDetails.behavioralSkills}
- Técnicas: ${courseDetails.technicalSkills}

Parâmetros Estruturais:
- Número de Módulos: ${courseDetails.moduleCount || 5}
- Aulas por Módulo: ${courseDetails.lessonsPerModule || 5}
- Idioma do Curso: ${courseDetails.courseLanguage || 'Português'}

Estratégia Pedagógica (Fase 1):
${JSON.stringify(phaseData?.phase1?.aiGenerated || {}, null, 2)}

INSTRUÇÕES ESPECÍFICAS:
1. Crie módulos com progressão pedagógica clara
2. Inclua aulas detalhadas com seções estruturadas
3. Adicione elementos inovativos apropriados ao tema
4. Garanta avaliações formativas e somativas
5. Implemente recursos de adaptabilidade
6. Foque na aplicação prática do conhecimento

Responda exclusivamente em formato JSON seguindo a estrutura definida.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const structureData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validar e enriquecer a estrutura gerada
    if (structureData.modules) {
      structureData.modules = structureData.modules.map((module: any, index: number) => ({
        ...module,
        id: module.id || `module_${index + 1}`,
        order: index + 1,
        status: "not_started" as const,
        // Garantir que as aulas tenham IDs únicos
        lessons: module.lessons?.map((lesson: any, lessonIndex: number) => ({
          ...lesson,
          id: lesson.id || `lesson_${index + 1}_${lessonIndex + 1}`,
          moduleId: module.id || `module_${index + 1}`,
          order: lessonIndex + 1
        })) || []
      }));

      // Adicionar estatísticas da estrutura
      structureData.statistics = {
        totalModules: structureData.modules.length,
        totalLessons: structureData.modules.reduce((total: number, module: any) => 
          total + (module.lessons?.length || 0), 0),
        averageLessonsPerModule: Math.round(
          structureData.modules.reduce((total: number, module: any) => 
            total + (module.lessons?.length || 0), 0) / structureData.modules.length
        ),
        totalEstimatedHours: structureData.modules.reduce((total: number, module: any) => 
          total + (module.estimatedHours || 0), 0)
      };
    }

    return structureData;
  } catch (error) {
    console.error("Erro ao gerar estrutura avançada:", error);
    throw error;
  }
}

// Generate content for a specific module
export async function generateModuleContent(
  moduleInfo: Module, 
  courseDetails: CourseDetails,
  aiConfig: AIConfig
) {
  try {
    // Mapping de tipos de conteúdo para instruções detalhadas
    const contentTypePrompts = {
      text: `Create comprehensive learning text with detailed explanations, concrete examples, and contextual applications.
        - Structure with clear headings, subheadings, and bullet points for easy navigation
        - Include 3-5 real-world examples that illustrate key concepts
        - Add "Key Takeaways" sections at the end of each major topic
        - Incorporate explanatory diagrams/tables descriptions where beneficial
        - Define all technical terms in clear, accessible language
        - Use analogies to explain complex concepts when appropriate`,
        
      video: `Write a conversational script for a 5-10 minute educational video that explains the key concepts.
        - Begin with an engaging hook that highlights relevance
        - Structure with clear introduction, main points, and conclusion
        - Include visual cue descriptions [VISUAL: describe what should be shown]
        - Add presenter notes with timing suggestions and emphasis points
        - Incorporate 2-3 examples that can be easily visualized
        - End with a quick summary and practical takeaway`,
        
      quiz: `Create 8-12 varied assessment questions with detailed answers and explanations.
        - Mix of multiple-choice, true/false, and fill-in-the-blank formats
        - Include questions at different cognitive levels (recall, application, analysis)
        - Design distractors (incorrect options) that address common misconceptions
        - Provide thorough explanations for both correct and incorrect answers
        - Add difficulty rating for each question (Basic, Intermediate, Advanced)
        - Include at least 2 scenario-based questions that test application of knowledge`,
        
      exercise: `Design 3-5 practical exercises that apply concepts in realistic scenarios.
        - Create a mix of individual and group exercises when appropriate
        - Include clear step-by-step instructions and estimated completion time
        - Specify learning objectives for each exercise
        - Provide scaffolding for different skill levels (beginner/advanced options)
        - Include evaluation criteria or rubric for self-assessment
        - Add extension challenges for advanced learners`,
        
      case: `Develop a detailed case study that illustrates real-world application of concepts.
        - Create a realistic, relevant scenario with appropriate complexity
        - Structure with background information, key issues/challenges, and questions
        - Include necessary data, stakeholder perspectives, and contextual factors
        - Provide guided analysis questions to help learners apply module concepts
        - Add teaching notes with suggested discussion points and key insights
        - Conclude with reflection questions and possible solution approaches`
    };

    // Build content type instructions based on selected types
    const contentTypeInstructions = aiConfig.contentTypes
      .map(type => contentTypePrompts[type as keyof typeof contentTypePrompts])
      .join("\n\n");
      
    // Determine language style characteristics based on configuration
    const getLanguageStyleAttributes = (style: string) => {
      const styles: Record<string, string> = {
        "Conversational": "friendly, approachable tone with first/second person perspective, analogies, and questions",
        "Academic": "precise terminology, formal structure, third-person perspective, comprehensive citations",
        "Technical": "precise technical vocabulary, structured explanations, process-oriented, detailed specifications",
        "Practical": "solution-focused, actionable steps, real-world applications, concise explanations",
        "Storytelling": "narrative elements, relatable scenarios, character perspectives, emotional engagement"
      };
      
      return styles[style] || "balanced blend of clarity, precision, and accessibility";
    };
    
    // Get teaching approach characteristics
    const getTeachingApproachAttributes = (approach: string) => {
      const approaches: Record<string, string> = {
        "Theoretical": "concept-focused, comprehensive explanations of underlying principles, logical frameworks",
        "Practical": "application-oriented, real-world examples, hands-on activities, immediate relevance",
        "Problem-Based": "scenario-driven exploration, guided inquiry, analytical frameworks, solution development",
        "Balanced": "mix of conceptual foundations with practical applications, theory followed by practice",
        "Socratic": "question-driven exploration, critical thinking prompts, guided discovery"
      };
      
      return approaches[approach] || "balanced combination of concepts and applications";
    };

    // Obter configuração de idioma
    const langConfig = getLanguageConfig(aiConfig.language || "pt-BR");
    
    const response = await openai.chat.completions.create({
      model: aiConfig.model || MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `${langConfig.systemRole} especializado em criar conteúdo educacional de alta qualidade adaptado às necessidades específicas de aprendizagem.

SUA TAREFA:
Criar conteúdo educacional abrangente para o módulo com base nas especificações do curso fornecidas. Seu conteúdo deve ser pedagogicamente sólido, envolvente e alinhado com os objetivos de aprendizagem especificados e o público-alvo.

IMPORTANTE: ${langConfig.instructions} com qualidade profissional e linguagem clara.

CONTENT SPECIFICATIONS:
- Difficulty Level: ${aiConfig.difficultyLevel || "Intermediate"} 
  (Adapt complexity, terminology, and depth accordingly)
- Teaching Approach: ${aiConfig.teachingApproach || "Balanced"} 
  (${getTeachingApproachAttributes(aiConfig.teachingApproach)})
- Content Density: ${aiConfig.contentDensity || 3}/5 
  (Where 1 is concise/essential and 5 is comprehensive/detailed)
- Language Style: ${aiConfig.languageStyle || "Neutral and International"} 
  (${getLanguageStyleAttributes(aiConfig.languageStyle)})
- Target Audience: ${courseDetails.publicTarget || "General adult learners"}
- Educational Level: ${courseDetails.educationalLevel || "Intermediate"}

CONTENT TYPES REQUIRED:
${contentTypeInstructions}

FORMAT REQUIREMENTS:
Provide your response as a structured JSON object with the following components (include only those requested):

{
  "lessons": [
    {
      "title": "Clear, descriptive lesson title",
      "description": "Brief lesson overview (2-3 sentences)",
      "content": {
        "text": "Comprehensive learning content with headings, subheadings, examples...",
        "videoScript": "Detailed video script with visual cues and presenter notes...",
        "activities": [
          {
            "type": "quiz|exercise|case",
            "title": "Descriptive activity title",
            "description": "Clear activity purpose and instructions",
            "questions": [
              {
                "question": "Clear, focused question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": 0,
                "explanation": "Detailed explanation of correct answer and why others are incorrect",
                "difficulty": "Basic|Intermediate|Advanced"
              }
            ],
            "instructions": "Step-by-step guidance for exercises",
            "criteria": "Assessment criteria or rubric points"
          }
        ]
      },
      "visualRecommendations": "Suggestions for diagrams, charts, or illustrations",
      "recommendedFormats": ["text", "video", "interactive"],
      "suggestedTone": "Recommended communication approach for this specific content",
      "adaptationNotes": "Guidance for adapting to different learning contexts",
      "glossary": [
        {"term": "Technical term", "definition": "Clear, concise explanation"}
      ]
    }
  ]
}

QUALITY GUIDELINES:
- Maintain high educational value and accuracy in all content
- Use progressive disclosure of information (simple to complex)
- Include varied examples that represent diverse contexts and applications
- Avoid region-specific examples, unexplained jargon, and culturally specific references
- Ensure content can be understood by learners from diverse backgrounds
- Provide clear transitions between concepts and sections
- Structure content for optimal cognitive processing (chunking, scaffolding)`
        },
        {
          role: "user",
          content: JSON.stringify({
            moduleInfo,
            courseDetails,
            contentTypes: aiConfig.contentTypes,
            aiConfig: {
              languageStyle: aiConfig.languageStyle,
              difficultyLevel: aiConfig.difficultyLevel,
              contentDensity: aiConfig.contentDensity,
              teachingApproach: aiConfig.teachingApproach
            }
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating module content:", error);
    throw error;
  }
}

// Generate evaluations (assessments/quizzes)
export async function generateEvaluation(
  moduleId: string,
  moduleInfo: Module,
  courseDetails: CourseDetails,
  evaluationType: string,
  aiConfig?: AIConfig
) {
  try {
    // Obter configuração de idioma
    const langConfig = getLanguageConfig(aiConfig?.language || "pt-BR");
    // Mapeamento de tipos de avaliação para instruções detalhadas
    const evaluationTypeDetails: Record<string, {description: string, structure: string}> = {
      "quiz": {
        description: "A formative assessment with multiple-choice, true/false, and matching questions to check understanding",
        structure: "10-15 varied questions with detailed explanations for each answer"
      },
      "test": {
        description: "A summative assessment combining multiple question types to evaluate comprehensive understanding",
        structure: "20-30 questions across different formats, varying in difficulty level"
      },
      "project": {
        description: "An applied assessment requiring learners to create something that demonstrates mastery",
        structure: "Project brief, requirements, timeline, resources needed, and detailed evaluation rubric"
      },
      "essay": {
        description: "A written assessment requiring analysis, synthesis, and evaluation of module concepts",
        structure: "Prompt, length requirements, research expectations, and detailed evaluation criteria"
      },
      "presentation": {
        description: "An oral assessment demonstrating communication skills and concept mastery",
        structure: "Topic guidelines, time requirements, visual aid expectations, and presentation rubric"
      },
      "case_analysis": {
        description: "An analytical assessment applying module concepts to a real-world scenario",
        structure: "Case description, analysis questions, expected format, and evaluation criteria"
      },
      "portfolio": {
        description: "A collection of work demonstrating growth and mastery across multiple competencies",
        structure: "Required elements, reflection prompts, organization guidelines, and evaluation rubric"
      }
    };

    // Get details for the specified evaluation type or use default
    const evaluationDetails = evaluationTypeDetails[evaluationType] || {
      description: "A comprehensive assessment appropriate for the module content",
      structure: "Multiple assessment components with clear evaluation criteria"
    };
    
    // Determine appropriate question types based on course details and module content
    const getRecommendedQuestionTypes = () => {
      const questionTypes = [];
      
      // Base recommendations on educational level
      if (courseDetails.educationalLevel === "Beginner") {
        questionTypes.push("multiple-choice", "true-false", "matching", "fill-in-blank");
      } else if (courseDetails.educationalLevel === "Intermediate") {
        questionTypes.push("short-answer", "scenario-based", "application", "case-analysis");
      } else if (courseDetails.educationalLevel === "Advanced") {
        questionTypes.push("essay", "project-design", "research-analysis", "critical-evaluation");
      } else {
        // Default balanced mix
        questionTypes.push("multiple-choice", "scenario-based", "short-answer", "application");
      }
      
      return questionTypes;
    };

    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `${langConfig.systemRole} especializado em design de avaliação educacional com profundo conhecimento de princípios pedagógicos, teorias de aprendizagem e metodologias de avaliação eficazes.

IMPORTANTE: ${langConfig.instructions} mantendo alta qualidade pedagógica.

YOUR TASK:
Design a comprehensive ${evaluationType} assessment for the specified module that accurately measures learning outcomes while providing valuable feedback to both learners and instructors.

ASSESSMENT TYPE: ${evaluationType}
${evaluationDetails.description}
Structure: ${evaluationDetails.structure}

ASSESSMENT DESIGN PRINCIPLES:
1. ALIGNMENT: Ensure tight alignment with module learning objectives and content
2. VALIDITY: Create questions that genuinely measure the intended knowledge/skills
3. RELIABILITY: Design clear questions with unambiguous answers for consistent assessment
4. ACCESSIBILITY: Use clear language and provide accommodations for diverse learners
5. AUTHENTICITY: Connect to real-world applications and practical contexts
6. CONSTRUCTIVE ALIGNMENT: Match assessment difficulty with course level and expected outcomes

EDUCATIONAL CONTEXT:
- Course: ${courseDetails.title}
- Topic: ${moduleInfo.title}
- Educational Level: ${courseDetails.educationalLevel || "Intermediate"}
- Target Audience: ${courseDetails.publicTarget || "Adult learners"}

CONTENT REQUIREMENTS:
For ${evaluationType} assessment, include:
- Clear, unambiguous instructions for learners
- Comprehensive coverage of module learning objectives
- Range of difficulty levels (basic → advanced)
- Varied question types appropriate for content: ${getRecommendedQuestionTypes().join(', ')}
- Detailed answer explanations that reinforce learning
- Fair and transparent grading criteria/rubric
- Accommodations or modifications for diverse learners

FORMAT YOUR RESPONSE AS A STRUCTURED JSON:

{
  "type": "${evaluationType}",
  "title": "Descriptive assessment title",
  "description": "Comprehensive description of assessment purpose and structure",
  "instructions": "Clear directions for learners completing the assessment",
  "totalPoints": 100,
  "estimatedTime": "30-45 minutes",
  "sections": [
    {
      "title": "Section title",
      "description": "Section purpose and focus",
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice|true-false|short-answer|essay|etc",
          "difficulty": "basic|intermediate|advanced",
          "points": 5,
          "question": "Clear, focused question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": 0,
          "explanation": "Detailed explanation of correct answer and why others are incorrect",
          "learningObjective": "Specific objective this question addresses",
          "cognitiveLevel": "knowledge|comprehension|application|analysis|synthesis|evaluation"
        }
      ]
    }
  ],
  "rubric": {
    "passingScore": 70,
    "gradingScale": [
      {"grade": "A", "rangeMin": 90, "rangeMax": 100, "description": "Excellent mastery"},
      {"grade": "B", "rangeMin": 80, "rangeMax": 89, "description": "Good understanding"},
      {"grade": "C", "rangeMin": 70, "rangeMax": 79, "description": "Adequate comprehension"},
      {"grade": "D", "rangeMin": 60, "rangeMax": 69, "description": "Limited understanding"},
      {"grade": "F", "rangeMin": 0, "rangeMax": 59, "description": "Insufficient comprehension"}
    ],
    "criteria": [
      {
        "criterion": "Comprehension of key concepts",
        "weight": 40,
        "levels": [
          {"level": "Excellent", "points": 40, "description": "Demonstrates thorough understanding"},
          {"level": "Proficient", "points": 30, "description": "Shows good grasp of most concepts"},
          {"level": "Basic", "points": 20, "description": "Demonstrates partial understanding"},
          {"level": "Insufficient", "points": 10, "description": "Shows limited comprehension"}
        ]
      }
    ]
  },
  "accommodations": [
    {"type": "Extended time", "description": "Additional 25% time for eligible students"},
    {"type": "Alternative format", "description": "Audio version available upon request"}
  ],
  "feedbackStrategy": "Detailed explanations provided for all questions with links to relevant course materials"
}

QUALITY GUIDELINES:
- Ensure assessment genuinely measures understanding, not just recall
- Include questions at multiple cognitive levels (Bloom's Taxonomy)
- Provide detailed, instructive explanations for all questions
- Design distractors (wrong options) that reveal common misconceptions
- Use clear, precise, bias-free language
- Avoid culturally-specific references or region-dependent knowledge
- Make accommodations for diverse learning needs where appropriate`
        },
        {
          role: "user",
          content: JSON.stringify({
            moduleInfo,
            courseDetails,
            evaluationType,
            moduleId
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating evaluation:", error);
    throw error;
  }
}

// Generate a course-level evaluation
export async function generateCourseEvaluation(
  modules: Module[],
  courseDetails: CourseDetails,
  evaluationType: string
) {
  try {
    // Mapeamento de tipos de avaliação final para instruções detalhadas
    const finalEvaluationTypes: Record<string, {description: string, structure: string}> = {
      "comprehensive_exam": {
        description: "A comprehensive summative assessment covering all course modules with varied question types",
        structure: "Multi-section exam with questions from all modules, varying in difficulty and format"
      },
      "capstone_project": {
        description: "An integrative application project demonstrating mastery across multiple course competencies",
        structure: "Project brief, milestone requirements, deliverables, timeline, and evaluation rubric"
      },
      "portfolio_assessment": {
        description: "A collection of work samples and reflections from throughout the course",
        structure: "Portfolio requirements, reflection prompts, organization guidelines, and evaluation criteria"
      },
      "case_study_analysis": {
        description: "A comprehensive case requiring application of concepts from multiple course modules",
        structure: "Case scenario, analysis questions, required format, and detailed evaluation rubric"
      },
      "simulation_exercise": {
        description: "A realistic simulation requiring application of multiple course competencies",
        structure: "Simulation scenario, participant roles, process guidelines, and evaluation framework"
      }
    };

    // Get details for the specified evaluation type or use default
    const evaluationDetails = finalEvaluationTypes[evaluationType] || {
      description: "A comprehensive course assessment integrating concepts from all modules",
      structure: "Multi-part assessment with clear evaluation criteria tied to course objectives"
    };
    
    // Create module reference list for the prompt
    const moduleList = modules.map(m => 
      `- Module ${m.order}: "${m.title}" - ${m.description.substring(0, 100)}...`
    ).join("\n");

    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Avaliador Pedagógico, a master assessment designer specializing in comprehensive course evaluations that effectively measure integrated learning outcomes.

YOUR TASK:
Design a sophisticated ${evaluationType} final assessment for the entire course that measures learners' comprehensive understanding, ability to integrate concepts across modules, and capacity to apply knowledge in authentic contexts.

ASSESSMENT TYPE: ${evaluationType}
${evaluationDetails.description}
Structure: ${evaluationDetails.structure}

COMPREHENSIVE ASSESSMENT PRINCIPLES:
1. INTEGRATION: Assess ability to connect and synthesize concepts across multiple modules
2. AUTHENTICITY: Create real-world scenarios requiring application of multiple competencies
3. HIGHER-ORDER THINKING: Focus on analysis, synthesis, evaluation, and creation
4. COMPLETENESS: Cover all key learning objectives from the course
5. FAIRNESS: Balance question types, difficulty levels, and module representation
6. VALIDITY: Ensure assessment genuinely measures overall course mastery

COURSE CONTEXT:
- Course Title: ${courseDetails.title}
- Course Theme: ${courseDetails.theme}
- Educational Level: ${courseDetails.educationalLevel || "Intermediate"}
- Target Audience: ${courseDetails.publicTarget || "Adult learners"}

COURSE MODULES:
${moduleList}

CONTENT REQUIREMENTS:
For this ${evaluationType} course assessment, include:
- Clear, comprehensive instructions for the assessment
- Logical organization into sections that align with course structure
- Questions/tasks that require integration of concepts across modules
- Range of difficulty levels with emphasis on application and synthesis
- Fair representation of all course modules
- Detailed grading criteria that reflect course learning objectives
- Accommodations for diverse learning needs

FORMAT YOUR RESPONSE AS A STRUCTURED JSON:

{
  "type": "${evaluationType}",
  "title": "Descriptive assessment title",
  "description": "Comprehensive description of assessment purpose and structure",
  "instructions": "Clear directions for learners completing the assessment",
  "totalPoints": 100,
  "estimatedTime": "2-3 hours",
  "sections": [
    {
      "title": "Section title",
      "description": "Section purpose and focus",
      "relatedModules": ["Module 1", "Module 3"], 
      "weight": 25,
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice|essay|case-analysis|project-component|etc",
          "difficulty": "intermediate|advanced",
          "points": 10,
          "question": "Clear, focused question text",
          "context": "Any scenario or background information needed",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": 0,
          "explanation": "Detailed explanation of correct answer and why others are incorrect",
          "relatedObjectives": ["Specific learning objectives this question addresses"],
          "integratedConcepts": ["Concept from Module 1", "Concept from Module 3"],
          "cognitiveLevel": "analysis|synthesis|evaluation"
        }
      ]
    }
  ],
  "rubric": {
    "passingScore": 70,
    "gradingScale": [
      {"grade": "A", "rangeMin": 90, "rangeMax": 100, "description": "Excellent mastery across all modules"},
      {"grade": "B", "rangeMin": 80, "rangeMax": 89, "description": "Strong understanding with good integration"},
      {"grade": "C", "rangeMin": 70, "rangeMax": 79, "description": "Adequate comprehension of most concepts"},
      {"grade": "D", "rangeMin": 60, "rangeMax": 69, "description": "Limited understanding of core concepts"},
      {"grade": "F", "rangeMin": 0, "rangeMax": 59, "description": "Insufficient comprehension of course material"}
    ],
    "criteria": [
      {
        "criterion": "Content mastery across modules",
        "weight": 30,
        "description": "Accurate understanding of key concepts from all modules",
        "levels": [
          {"level": "Excellent", "points": 30, "description": "Demonstrates thorough understanding across all modules"},
          {"level": "Proficient", "points": 23, "description": "Shows good grasp of concepts from most modules"},
          {"level": "Basic", "points": 15, "description": "Demonstrates partial understanding of key concepts"},
          {"level": "Insufficient", "points": 8, "description": "Shows limited comprehension of course material"}
        ]
      },
      {
        "criterion": "Integration of concepts",
        "weight": 25,
        "description": "Ability to connect and synthesize concepts across modules",
        "levels": [
          {"level": "Excellent", "points": 25, "description": "Sophisticated integration of concepts across modules"},
          {"level": "Proficient", "points": 19, "description": "Effective connections between related concepts"},
          {"level": "Basic", "points": 13, "description": "Some basic connections between concepts"},
          {"level": "Insufficient", "points": 6, "description": "Minimal integration of concepts"}
        ]
      },
      {
        "criterion": "Application to authentic contexts",
        "weight": 25,
        "description": "Ability to apply course concepts to real-world situations",
        "levels": [
          {"level": "Excellent", "points": 25, "description": "Sophisticated application to complex situations"},
          {"level": "Proficient", "points": 19, "description": "Effective application to relevant contexts"},
          {"level": "Basic", "points": 13, "description": "Basic application to simple situations"},
          {"level": "Insufficient", "points": 6, "description": "Minimal application of concepts"}
        ]
      },
      {
        "criterion": "Critical thinking and analysis",
        "weight": 20,
        "description": "Depth of analysis and quality of reasoning",
        "levels": [
          {"level": "Excellent", "points": 20, "description": "Sophisticated analysis and insightful reasoning"},
          {"level": "Proficient", "points": 15, "description": "Clear analysis with logical reasoning"},
          {"level": "Basic", "points": 10, "description": "Basic analysis with some reasoning"},
          {"level": "Insufficient", "points": 5, "description": "Minimal analysis or flawed reasoning"}
        ]
      }
    ]
  },
  "accommodations": [
    {"type": "Extended time", "description": "Additional 30% time for eligible students"},
    {"type": "Alternative format", "description": "Option for oral presentation instead of written components"}
  ],
  "preparationGuidelines": "Specific guidance to help learners prepare for this comprehensive assessment"
}

QUALITY GUIDELINES:
- Ensure assessment requires genuine integration of concepts, not just isolated knowledge
- Include questions/tasks that authentically reflect real-world application
- Focus on higher-order cognitive skills (Bloom's upper levels)
- Provide detailed, instructive explanations and feedback
- Use clear, precise, bias-free language
- Avoid culturally-specific references or region-dependent knowledge
- Balance representation of all course modules`
        },
        {
          role: "user",
          content: JSON.stringify({
            modules,
            courseDetails,
            evaluationType
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating course evaluation:", error);
    throw error;
  }
}

// Generate a pedagogical review of the course
export async function generateCourseReview(
  courseDetails: CourseDetails,
  modules: Module[],
  phaseData: any,
  reviewNotes: string
) {
  try {
    // Criar um sumário dos módulos para análise
    const modulesSummary = modules.map(m => 
      `- Módulo ${m.order}: "${m.title}" (${m.estimatedHours}h) - ${m.description.substring(0, 150)}...`
    ).join("\n");
    
    // Extrair parâmetros chave do curso para análise mais específica
    const getCourseParameters = (courseDetails: CourseDetails) => {
      return {
        title: courseDetails.title || "Curso sem título",
        theme: courseDetails.theme || "Tema não especificado",
        estimatedHours: courseDetails.estimatedHours || 0,
        format: courseDetails.format || "Formato não especificado",
        targetAudience: courseDetails.publicTarget || "Público-alvo não especificado",
        educationalLevel: courseDetails.educationalLevel || "Nível educacional não especificado",
        moduleCount: modules.length,
        totalLessons: modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0),
        skillsFocus: {
          cognitive: courseDetails.cognitiveSkills || "Não especificado",
          behavioral: courseDetails.behavioralSkills || "Não especificado", 
          technical: courseDetails.technicalSkills || "Não especificado"
        }
      };
    };
    
    const courseParams = getCourseParameters(courseDetails);

    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `Você é o Revisor Educacional, um especialista em design instrucional e avaliação pedagógica com vasta experiência na análise e desenvolvimento de cursos educacionais de alta qualidade. 

TAREFA:
Realizar uma análise educacional profunda e crítica do curso apresentado, oferecendo uma avaliação detalhada de sua qualidade pedagógica e eficácia instrucional.

ESTRUTURA DE ANÁLISE:

1. COERÊNCIA CURRICULAR (25%)
   - Alinhamento entre objetivos, conteúdo e avaliações
   - Progressão lógica entre módulos e lições
   - Encadeamento e interdependência de conceitos
   - Consistência da abordagem pedagógica

2. DESIGN INSTRUCIONAL (25%)
   - Adequação das estratégias de ensino ao público-alvo
   - Qualidade e variedade das atividades de aprendizagem
   - Eficácia da sequência de apresentação dos conteúdos
   - Aplicação de princípios de aprendizagem adulta

3. CONTEÚDO E RECURSOS (20%)
   - Precisão e atualidade do conteúdo
   - Profundidade e amplitude apropriadas
   - Clareza da linguagem e acessibilidade
   - Adequação dos recursos visuais e exemplos

4. AVALIAÇÃO E FEEDBACK (15%)
   - Alinhamento das avaliações com os objetivos
   - Variedade e adequação dos métodos de avaliação
   - Oportunidades para feedback formativo
   - Mecanismos para monitorar o progresso do aluno

5. ACESSIBILIDADE E INCLUSÃO (15%)
   - Consideração de diferentes estilos de aprendizagem
   - Acomodações para alunos com necessidades diversas
   - Sensibilidade cultural e contextual
   - Universalidade da aplicação do conteúdo

FORMATO DA SUA ANÁLISE:

I. RESUMO EXECUTIVO
   Avaliação concisa da qualidade geral do curso, destacando pontos fortes e áreas críticas para melhoria.

II. ANÁLISE DETALHADA
   Avaliação específica de cada categoria acima, com exemplos concretos e referências a elementos específicos do curso.

III. PONTOS FORTES
   Identificação clara de 3-5 elementos excepcionais do design do curso que devem ser mantidos ou expandidos.

IV. OPORTUNIDADES DE MELHORIA
   Identificação de 3-5 áreas específicas que requerem refinamento, com sugestões práticas e detalhadas para cada uma.

V. RECOMENDAÇÕES ESTRATÉGICAS
   Sugestões específicas, práticas e priorizadas para melhorar a eficácia educacional geral do curso.

VI. CONCLUSÃO
   Avaliação final da prontidão do curso para implementação e seu potencial impacto educacional.

INFORMAÇÕES DO CURSO:
- Título: ${courseParams.title}
- Tema: ${courseParams.theme}
- Carga horária: ${courseParams.estimatedHours} horas
- Formato: ${courseParams.format}
- Público-alvo: ${courseParams.targetAudience}
- Nível educacional: ${courseParams.educationalLevel}
- Quantidade de módulos: ${courseParams.moduleCount}
- Total de lições/aulas: ${courseParams.totalLessons}

FOCO EM COMPETÊNCIAS:
- Cognitivas: ${courseParams.skillsFocus.cognitive}
- Comportamentais: ${courseParams.skillsFocus.behavioral}
- Técnicas: ${courseParams.skillsFocus.technical}

ESTRUTURA DO CURSO:
${modulesSummary}

NOTAS DO CRIADOR:
${reviewNotes || "Nenhuma nota adicional fornecida pelo criador do curso."}

DIRETRIZES PARA SUA ANÁLISE:
- Seja específico e cite exemplos concretos do conteúdo do curso
- Mantenha uma perspectiva baseada em evidências e princípios atuais de design instrucional
- Equilibre crítica construtiva com reconhecimento de pontos fortes
- Priorize sugestões com maior potencial de impacto na experiência de aprendizagem
- Considere o contexto e limitações do formato do curso
- Ofereça feedback acionável e específico, não generalidades
- Adote um tom profissional mas acessível e construtivo`
        },
        {
          role: "user",
          content: JSON.stringify({
            courseDetails,
            modules,
            phaseData,
            reviewNotes: reviewNotes || "Solicito uma análise completa do curso, destacando pontos fortes e oportunidades de melhoria."
          })
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro ao gerar revisão do curso:", error);
    throw error;
  }
}

// Generate all course content in a batch
export async function generateAllContent(
  modules: Module[],
  courseDetails: CourseDetails,
  aiConfig: AIConfig
) {
  try {
    const results: { [key: string]: any } = {};
    
    for (const module of modules) {
      try {
        results[module.title] = await generateModuleContent(module, courseDetails, aiConfig);
      } catch (error) {
        console.error(`Error generating content for module ${module.title}:`, error);
        results[module.title] = { error: "Failed to generate content" };
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error generating all content:", error);
    throw error;
  }
}

// Generate all evaluations in a batch
export async function generateAllEvaluations(
  modules: Module[],
  courseDetails: CourseDetails,
  evaluationType: string
) {
  try {
    const moduleEvaluations: { [key: string]: any } = {};
    
    for (const module of modules) {
      try {
        moduleEvaluations[module.title] = await generateEvaluation(
          module.title,
          module,
          courseDetails,
          evaluationType
        );
      } catch (error) {
        console.error(`Error generating evaluation for module ${module.title}:`, error);
        moduleEvaluations[module.title] = { error: "Failed to generate evaluation" };
      }
    }
    
    const courseEvaluation = await generateCourseEvaluation(modules, courseDetails, evaluationType);
    
    return {
      moduleEvaluations,
      courseEvaluation
    };
  } catch (error) {
    console.error("Error generating all evaluations:", error);
    throw error;
  }
}

// Gerar mapeamento de competências para os módulos do curso
export async function generateCompetencyMapping(modules: any[], courseDetails: CourseDetails) {
  try {
    console.log("Gerando mapeamento de competências com IA...");
    
    // Extrair as competências do curso dos detalhes
    const cognitiveSkills = courseDetails.cognitiveSkills?.split(',').map(skill => skill.trim()).filter(Boolean) || [];
    const behavioralSkills = courseDetails.behavioralSkills?.split(',').map(skill => skill.trim()).filter(Boolean) || [];
    const technicalSkills = courseDetails.technicalSkills?.split(',').map(skill => skill.trim()).filter(Boolean) || [];
    
    // Preparando o prompt para a IA
    const prompt = `
      Com base nos detalhes do curso e módulos abaixo, crie um mapeamento de competências, indicando quais módulos desenvolvem cada competência. 
      
      Sobre o curso:
      Título: ${courseDetails.title}
      Tema: ${courseDetails.theme}
      Público-alvo: ${courseDetails.publicTarget || 'Não especificado'}
      Nível educacional: ${courseDetails.educationalLevel || 'Não especificado'}
      
      Competências cognitivas a serem desenvolvidas: ${cognitiveSkills.join(', ')}
      Competências comportamentais a serem desenvolvidas: ${behavioralSkills.join(', ')}
      Competências técnicas a serem desenvolvidas: ${technicalSkills.join(', ')}
      
      Módulos do curso:
      ${modules.map((module, index) => `
        Módulo ${module.order}: ${module.title}
        Descrição: ${module.description}
        Objetivo: ${module.objective || 'Não especificado'}
      `).join('\n')}
      
      Gere um JSON com o seguinte formato:
      {
        "competenciesMap": {
          "cognitiva:NOME_DA_COMPETENCIA": ["ID_MODULO1", "ID_MODULO2"],
          "comportamental:NOME_DA_COMPETENCIA": ["ID_MODULO1", "ID_MODULO3"],
          "tecnica:NOME_DA_COMPETENCIA": ["ID_MODULO1"]
        }
      }
      
      Onde cada competência deve ter o prefixo do tipo (cognitiva:, comportamental: ou tecnica:) e a lista deve conter os IDs dos módulos que desenvolvem essa competência.
      Distribua as competências de maneira pedagógica e coerente, e NÃO crie competências adicionais além das listadas acima.
    `;
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um especialista em design instrucional e pedagogia, capaz de mapear competências para módulos de um curso." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    
    const mappingData = JSON.parse(response.choices[0].message.content);
    console.log("Mapeamento de competências gerado:", mappingData);
    
    return mappingData;
  } catch (error) {
    console.error("Erro ao gerar mapeamento de competências:", error);
    throw error;
  }
}

// Generate image for a module
export async function generateModuleImage(moduleInfo: Module, courseDetails: CourseDetails) {
  try {
    // Define estilos visuais com base no tipo de curso
    const getVisualStyle = (theme: string) => {
      const themeStyles: Record<string, string> = {
        "Desenvolvimento Web": "digital, modern, with code elements, UI/UX components, and web design concepts",
        "Programação": "digital, coding symbols, algorithms visualization, data structures, modern programming concepts",
        "Data Science": "data visualization elements, graphs, charts, analytics concepts, modern tech aesthetic",
        "Marketing Digital": "digital marketing visuals, social media elements, analytics, modern business concepts",
        "Negócios": "professional business setting, modern corporate elements, strategic concept visualization",
        "Saúde": "clean medical aesthetic, professional healthcare imagery, anatomical concepts, wellness elements",
        "Educação": "engaging learning environment, knowledge sharing concepts, educational tools visualization",
        "Design": "creative design elements, artistic components, visual communication concepts, color theory"
      };
      
      return themeStyles[theme] || "modern educational illustration with conceptual elements and clear visual metaphors";
    };
    
    // Define paletas de cores com base no nível educacional
    const getColorPalette = (level: string) => {
      const levelPalettes: Record<string, string> = {
        "Beginner": "bright and engaging colors with blue, green, and orange highlights on a light background",
        "Intermediate": "balanced professional palette with teal, navy, amber, and slate on a neutral background",
        "Advanced": "sophisticated color scheme with deep purple, charcoal, teal, and burgundy on a subtle background"
      };
      
      return levelPalettes[level || "Intermediate"] || "balanced professional color palette suitable for educational content";
    };
    
    // Extrair palavras-chave do módulo para informar a imagem
    const extractKeywords = (moduleInfo: Module) => {
      // Combinar título e descrição para extrair palavras-chave
      const content = `${moduleInfo.title} ${moduleInfo.description}`;
      
      // Lista de palavras de parada (comuns e não específicas)
      const stopWords = ["a", "o", "e", "de", "da", "do", "para", "com", "em", "no", "na", "um", "uma", "os", "as"];
      
      // Dividir em palavras, filtrar palavras de parada e curtas, e pegar as 5 mais relevantes
      return content
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word.toLowerCase()))
        .slice(0, 5)
        .join(", ");
    };
    
    // Gerar uma descrição abrangente para a imagem
    const generateImageDescription = (moduleInfo: Module, courseDetails: CourseDetails) => {
      // Extrair elementos
      const keywords = extractKeywords(moduleInfo);
      const visualStyle = getVisualStyle(courseDetails.theme);
      const colorPalette = getColorPalette(courseDetails.educationalLevel || "");
      
      // Construir descrição da imagem
      return `
      Create a high-quality educational illustration for a module titled "${moduleInfo.title}" in a course about "${courseDetails.theme}".
      
      CONCEPT:
      The image should visually represent key concepts: ${keywords}.
      Module focuses on: ${moduleInfo.description}
      
      VISUAL STYLE:
      ${visualStyle}
      Professional and conceptual illustration suitable for ${courseDetails.educationalLevel || "intermediate"} level education
      ${colorPalette}
      
      COMPOSITION:
      - Central visual metaphor that clearly communicates the module topic
      - Clean, uncluttered layout with strong focal point
      - Subtle educational elements that enhance understanding
      - Modern design with balanced composition
      - No text or minimal text elements only if absolutely necessary
      
      IMPORTANT:
      - Must be instantly recognizable as representing "${moduleInfo.title}"
      - Appropriate for professional educational context
      - Culturally neutral and internationally relevant
      - Should work well as a module thumbnail at various sizes
      - Avoid stereotypical or cliché educational imagery
      - No watermarks, borders, or extraneous elements
      `;
    };

    const prompt = generateImageDescription(moduleInfo, courseDetails);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural",
    });

    return { 
      url: response.data[0]?.url,
      prompt: prompt,
      moduleId: moduleInfo.title
    };
  } catch (error) {
    console.error("Error generating module image:", error);
    throw error;
  }
}

// Generate images for all modules
export async function generateAllModuleImages(modules: Module[], courseDetails: CourseDetails) {
  try {
    console.log(`Iniciando geração de imagens para ${modules.length} módulos...`);
    
    // Validar que a API key da OpenAI está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error("Não foi possível gerar imagens: OPENAI_API_KEY não está configurada.");
      throw new Error("OPENAI_API_KEY não está configurada para geração de imagens");
    }
    
    // Ordenar módulos para garantir que sejam processados na ordem correta
    const sortedModules = [...modules].sort((a, b) => a.order - b.order);
    
    // Parâmetros para processamento em lote
    const batchSize = 3; // Quantidade de módulos para processar por vez
    const delayBetweenBatches = 2000; // Delay entre lotes (ms)
    const delayBetweenModules = 500; // Delay entre módulos individuais (ms)
    
    const results: { [key: string]: any } = {};
    
    // Processar módulos em lotes
    for (let i = 0; i < sortedModules.length; i += batchSize) {
      console.log(`Processando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(sortedModules.length/batchSize)}`);
      
      // Pegar o próximo lote de módulos
      const batch = sortedModules.slice(i, i + batchSize);
      
      // Processar cada módulo no lote
      for (const module of batch) {
        try {
          console.log(`Gerando imagem para módulo ${module.order}: ${module.title}`);
          
          results[module.title] = await generateModuleImage(module, courseDetails);
          
          console.log(`✓ Imagem gerada com sucesso para módulo ${module.order}: ${module.title}`);
          
          // Pequeno intervalo entre requisições de API para o mesmo lote
          if (batch.indexOf(module) < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenModules));
          }
        } catch (err) {
          console.error(`Erro ao gerar imagem para módulo ${module.title}:`, err);
          
          // Registrar erro no resultado
          results[module.title] = { 
            error: true, 
            moduleId: module.title,
            errorMessage: err.message || "Erro desconhecido na geração de imagem" 
          };
        }
      }
      
      // Delay entre lotes para evitar limitações de taxa da API
      if (i + batchSize < sortedModules.length) {
        console.log(`Aguardando ${delayBetweenBatches/1000} segundos antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    // Calcular estatísticas
    const successCount = Object.values(results).filter(r => !r.error).length;
    console.log(`Geração de imagens concluída: ${successCount} de ${modules.length} com sucesso`);
    
    return results;
  } catch (error) {
    console.error("Erro ao gerar todas as imagens de módulos:", error);
    throw error;
  }
}

// Expand specific content sections
export async function expandContent(
  originalContent: string,
  contentType: string,
  expansionType: string,
  courseDetails: CourseDetails,
  aiConfig: AIConfig
) {
  try {
    // Obter configuração de idioma
    const langConfig = getLanguageConfig(aiConfig.language || "pt-BR");
    
    // Definir tipos de expansão disponíveis
    const expansionTypes = {
      "detailed": "Expandir com mais detalhes e exemplos práticos",
      "examples": "Adicionar mais exemplos e casos de uso",
      "simplified": "Simplificar e tornar mais acessível",
      "advanced": "Aprofundar com conceitos avançados",
      "practical": "Focar em aplicações práticas e hands-on",
      "theoretical": "Expandir com fundamentação teórica"
    };
    
    const expansionInstruction = expansionTypes[expansionType as keyof typeof expansionTypes] || "Expandir o conteúdo";
    
    const response = await openai.chat.completions.create({
      model: aiConfig.model || MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `${langConfig.systemRole} especializado em expandir e enriquecer conteúdo educacional existente.

SUA TAREFA:
${expansionInstruction} do conteúdo fornecido, mantendo a qualidade pedagógica e alinhamento com os objetivos educacionais.

IMPORTANTE: ${langConfig.instructions} mantendo consistência com o conteúdo original.

TIPO DE CONTEÚDO: ${contentType}
TIPO DE EXPANSÃO: ${expansionType}

DIRETRIZES PARA EXPANSÃO:
1. CONSISTÊNCIA: Manter o tom, estilo e nível de dificuldade do conteúdo original
2. RELEVÂNCIA: Adicionar apenas informações que enriquecem o aprendizado
3. ESTRUTURA: Preservar a organização lógica e fluxo do conteúdo original
4. QUALIDADE: Garantir precisão técnica e pedagógica em todas as adições
5. CONTEXTUALIZAÇÃO: Conectar novo conteúdo ao tema do curso: ${courseDetails.theme}

FORMATO DE RESPOSTA:
Forneça o conteúdo expandido em formato JSON estruturado:

{
  "expandedContent": "Conteúdo expandido mantendo a estrutura original...",
  "addedSections": [
    {
      "title": "Título da nova seção",
      "content": "Conteúdo da nova seção...",
      "type": "detalhamento|exemplo|exercício|conceito"
    }
  ],
  "suggestions": [
    "Sugestão para melhoria adicional...",
    "Outra sugestão para expandir ainda mais..."
  ],
  "metadata": {
    "wordsAdded": 150,
    "sectionsAdded": 2,
    "difficultyLevel": "${aiConfig.difficultyLevel}",
    "expansionFocus": "${expansionType}"
  }
}

QUALIDADE E PADRÕES:
- Use linguagem clara e apropriada ao nível educacional
- Inclua exemplos concretos e relevantes quando apropriado
- Mantenha organização lógica e progressão de conceitos
- Evite redundância com o conteúdo original
- Assegure que as adições agreguem valor educacional real`
        },
        {
          role: "user",
          content: JSON.stringify({
            originalContent,
            contentType,
            expansionType,
            courseDetails: {
              title: courseDetails.title,
              theme: courseDetails.theme,
              educationalLevel: courseDetails.educationalLevel,
              publicTarget: courseDetails.publicTarget
            },
            aiConfig: {
              difficultyLevel: aiConfig.difficultyLevel,
              languageStyle: aiConfig.languageStyle,
              teachingApproach: aiConfig.teachingApproach
            }
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Erro ao expandir conteúdo:", error);
    throw error;
  }
}

export default {
  generateStrategy,
  generateStructure,
  generateModuleContent,
  generateEvaluation,
  generateCourseEvaluation,
  generateCourseReview,
  generateAllContent,
  generateAllEvaluations,
  generateModuleImage,
  generateAllModuleImages,
  generateCompetencyMapping,
  expandContent
};
