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
          
          Format the output as a detailed JSON with clear sections following educational standards.
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
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Estruturador Modular, a course structure designer. 
          Based on the course theme and strategy provided, generate a structured course with:
          
          1. A logical sequence of modules with clear titles and descriptions
          2. Specific learning objectives for each module using Bloom's taxonomy verbs
          3. Progressive complexity across modules
          4. Appropriate time allocation for each module
          
          IMPORTANT: You MUST generate EXACTLY ${courseDetails.moduleCount || 6} modules, no more and no less. This is a strict requirement from the user. Your response MUST contain precisely this number of modules in the "modules" array.
          
          Each module should have approximately ${courseDetails.lessonsPerModule || 3} lessons or topics. Make sure the content is properly distributed to accommodate this structure.
          
          Format your response as a JSON object with the following structure:
          {
            "modules": [
              {
                "title": "Module title",
                "description": "Module description",
                "estimatedHours": number,
                "objectives": ["objective 1", "objective 2"]
              }
            ],
            "sequence_rationale": "Explanation of why this sequence works",
            "progression_strategy": "How complexity increases across modules"
          }
          
          Ensure language is neutral, international, and avoids any region-specific examples.`
        },
        {
          role: "user",
          content: JSON.stringify({
            courseDetails,
            strategyData: phaseData?.phase1?.aiGenerated || {}
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating structure:", error);
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
    const contentTypePrompts = {
      text: "Create comprehensive learning text with examples and explanations. Format with clear headings and sections.",
      video: "Write a conversational script for a 5-10 minute educational video that explains the key concepts.",
      quiz: "Create 5-10 multiple choice questions with answers and explanations to test understanding.",
      exercise: "Design 2-3 practical exercises or activities that apply the concepts learned.",
      case: "Develop a detailed case study that illustrates the practical application of this module's concepts."
    };

    // Build content type instructions based on selected types
    const contentTypeInstructions = aiConfig.contentTypes
      .map(type => contentTypePrompts[type as keyof typeof contentTypePrompts])
      .join("\n");

    const response = await openai.chat.completions.create({
      model: aiConfig.model || MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Criador de Conteúdo Didático, a specialist in creating educational content.
          Based on the module information and course details provided, generate educational content with:
          
          - Clear, accessible language at ${aiConfig.difficultyLevel || "Intermediate"} level
          - ${aiConfig.teachingApproach || "Balanced"} teaching approach
          - Content density level: ${aiConfig.contentDensity || 3}/5 (where 1 is concise, 5 is detailed)
          - Language style: ${aiConfig.languageStyle || "Neutral and International"}
          
          Generate the following content types:
          ${contentTypeInstructions}
          
          Format your response as a JSON object with these sections:
          {
            "text": "Comprehensive learning content...",
            "videoScript": "Video script content...",
            "activities": [
              {
                "type": "quiz|exercise|case",
                "title": "Activity title",
                "description": "Activity description",
                "questions": [
                  {
                    "question": "Question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "answer": 0,
                    "explanation": "Why this is correct"
                  }
                ]
              }
            ]
          }
          
          Avoid region-specific examples, jargon without explanation, and culturally specific references.`
        },
        {
          role: "user",
          content: JSON.stringify({
            moduleInfo,
            courseDetails,
            contentTypes: aiConfig.contentTypes
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
  evaluationType: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Avaliador Pedagógico, an expert in creating educational assessments.
          Based on the module information provided, create an assessment of type ${evaluationType} that:
          
          1. Accurately tests the learning objectives of the module
          2. Uses appropriate assessment methods for the content
          3. Includes clear instructions and grading criteria
          4. Provides helpful feedback for learners
          
          Format your response as a JSON object with:
          {
            "type": "${evaluationType}",
            "title": "Assessment title",
            "description": "Brief description of the assessment",
            "questions": [
              {
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"], 
                "answer": 0,
                "explanation": "Explanation of the correct answer"
              }
            ],
            "criteria": {
              "passing_score": 70,
              "rubric": [
                {"criterion": "Understanding of concepts", "weight": 40},
                {"criterion": "Application of knowledge", "weight": 60}
              ]
            }
          }
          
          Use clear, neutral language and avoid cultural biases or region-specific examples.`
        },
        {
          role: "user",
          content: JSON.stringify({
            moduleInfo,
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
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Avaliador Pedagógico, an expert in creating educational assessments.
          Based on the course information provided, create a comprehensive final course assessment that:
          
          1. Tests knowledge across all modules
          2. Evaluates higher-order thinking skills (analysis, synthesis, evaluation)
          3. Includes a mix of question types appropriate for a final assessment
          4. Provides clear evaluation criteria
          
          Format your response as a JSON object with:
          {
            "type": "${evaluationType || "comprehensive"}",
            "title": "Final Course Assessment",
            "description": "Description of the assessment",
            "questions": [
              {
                "module": "Related module title",
                "question": "Question text",
                "options": ["Option A", "Option B", "Option C", "Option D"], 
                "answer": 0,
                "explanation": "Explanation of the correct answer"
              }
            ],
            "criteria": {
              "passing_score": 70,
              "rubric": [
                {"criterion": "Understanding of concepts", "weight": 30},
                {"criterion": "Application of knowledge", "weight": 40},
                {"criterion": "Critical thinking", "weight": 30}
              ]
            }
          }
          
          Use clear, neutral language and avoid cultural biases or region-specific examples.`
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
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Revisor Educacional, a pedagogical reviewer specialized in educational content quality.
          Review the complete course information provided and:
          
          1. Analyze overall educational coherence and alignment with objectives
          2. Assess content clarity, accessibility, and international applicability
          3. Evaluate progression and structure of learning materials
          4. Check for consistency in language, approach, and difficulty level
          5. Consider the review notes provided by the course creator
          
          Present your review with:
          - General assessment of course quality and educational value
          - Specific strengths of the course design
          - Areas for improvement with specific suggestions
          - Recommendations for enhancing the learning experience
          
          Use professional language and provide actionable feedback.`
        },
        {
          role: "user",
          content: JSON.stringify({
            courseDetails,
            modules,
            phaseData,
            reviewNotes
          })
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating course review:", error);
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
    // Create a prompt that describes an image suitable for the module
    const prompt = `Create an educational illustration for a course module titled "${moduleInfo.title}" 
    for a course about "${courseDetails.theme}". 
    The image should be professional, conceptual, and suitable for educational context.
    Use a clean, modern style with a color scheme appropriate for education.
    Should be abstract enough to represent the concepts but clear enough to understand the topic at a glance.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return { 
      url: response.data[0].url,
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
    const results: { [key: string]: any } = {};
    
    for (const module of modules) {
      try {
        results[module.title] = await generateModuleImage(module, courseDetails);
      } catch (error) {
        console.error(`Error generating image for module ${module.title}:`, error);
        results[module.title] = { error: "Failed to generate image" };
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error generating all module images:", error);
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
  generateAllModuleImages
};
