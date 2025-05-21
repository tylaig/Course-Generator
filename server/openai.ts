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

    const response = await openai.chat.completions.create({
      model: aiConfig.model || MODELS.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are the Criador de Conteúdo Didático, an expert in creating high-quality educational content tailored to specific learning needs.

YOUR TASK:
Create comprehensive educational content for the module based on the course specifications provided. Your content should be pedagogically sound, engaging, and aligned with the specified learning objectives and target audience.

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
  evaluationType: string
) {
  try {
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
          content: `You are the Avaliador Pedagógico, an expert in educational assessment design with deep understanding of pedagogical principles, learning theories, and effective evaluation methodologies.

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

// Segunda implementação removida para evitar duplicação

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
  generateCompetencyMapping
};
