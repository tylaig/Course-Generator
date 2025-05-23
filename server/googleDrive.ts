import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

// Configuração do cliente OAuth2 para o Google Drive
const setupGoogleDriveClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Ajustando o URL de redirecionamento para corresponder ao configurado no Google Cloud
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://1197fac5-6589-455f-b82c-a0116cf784c2-00-2e9zkl3fv96gq.janeway.replit.dev/api/auth/google/callback';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Google Drive não configuradas');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  
  // Se tivermos um refresh token, configuramos para uso
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
};

// Função para obter URL de autorização para o Google Drive
export const getAuthUrl = () => {
  try {
    const oauth2Client = setupGoogleDriveClient();
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    return authUrl;
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error);
    throw error;
  }
};

// Função para obter token de acesso após autorização
export const getTokenFromCode = async (code: string) => {
  try {
    const oauth2Client = setupGoogleDriveClient();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    throw error;
  }
};

// Função para gerar PDF a partir de um curso
export const generateCoursePDF = async (course: any) => {
  return new Promise<string>((resolve, reject) => {
    try {
      // Cria um documento PDF
      const doc = new PDFDocument({ 
        margins: { top: 50, bottom: 50, left: 72, right: 72 },
        size: 'A4'
      });
      
      // Nome do arquivo temporário
      const pdfPath = path.join(__dirname, `../temp/curso_${course.id}.pdf`);
      
      // Certifique-se de que o diretório temp existe
      if (!fs.existsSync(path.join(__dirname, '../temp'))) {
        fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
      }
      
      // Cria stream de escrita
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);
      
      // Estilo para títulos
      const titleStyle = { fontSize: 24, font: 'Helvetica-Bold' };
      const subtitleStyle = { fontSize: 18, font: 'Helvetica-Bold' };
      const moduleStyle = { fontSize: 16, font: 'Helvetica-Bold' };
      const contentStyle = { fontSize: 12, font: 'Helvetica' };
      
      // Capa do curso
      doc.fontSize(titleStyle.fontSize)
         .font(titleStyle.font)
         .text(course.title, { align: 'center' })
         .moveDown(2);
      
      doc.fontSize(subtitleStyle.fontSize)
         .font(subtitleStyle.font)
         .text(`Tema: ${course.theme}`, { align: 'center' })
         .moveDown(0.5);
      
      doc.fontSize(contentStyle.fontSize)
         .font(contentStyle.font)
         .text(`Formato: ${course.format}`, { align: 'center' })
         .text(`Plataforma: ${course.platform}`, { align: 'center' })
         .text(`Formato de Entrega: ${course.deliveryFormat}`, { align: 'center' })
         .text(`Carga Horária: ${course.estimatedHours} horas`, { align: 'center' })
         .moveDown(2);
      
      doc.fontSize(contentStyle.fontSize)
         .font(contentStyle.font)
         .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })
         .moveDown(4);
      
      // Sumário
      doc.addPage();
      doc.fontSize(subtitleStyle.fontSize)
         .font(subtitleStyle.font)
         .text('Sumário', { align: 'center' })
         .moveDown(2);
      
      // Lista de módulos para o sumário
      if (course.modules && Array.isArray(course.modules)) {
        course.modules.forEach((module: any, index: number) => {
          doc.fontSize(contentStyle.fontSize)
             .font(contentStyle.font)
             .text(`Módulo ${index + 1}: ${module.title}`, { link: `module-${index + 1}` })
             .moveDown(0.5);
        });
      }
      
      // Conteúdo dos Módulos
      if (course.modules && Array.isArray(course.modules)) {
        course.modules.forEach((module: any, index: number) => {
          doc.addPage()
             .fontSize(moduleStyle.fontSize)
             .font(moduleStyle.font)
             .text(`Módulo ${index + 1}: ${module.title}`, { 
               align: 'left',
               destination: `module-${index + 1}`
             })
             .moveDown(0.5);
          
          doc.fontSize(contentStyle.fontSize)
             .font(contentStyle.font)
             .text(`Descrição: ${module.description}`)
             .text(`Carga Horária: ${module.estimatedHours} horas`)
             .moveDown(2);
          
          // Conteúdo do módulo
          if (module.content) {
            // Conteúdo de texto
            if (module.content.text) {
              doc.fontSize(subtitleStyle.fontSize)
                 .font(subtitleStyle.font)
                 .text('Conteúdo', { align: 'left' })
                 .moveDown(1);
              
              doc.fontSize(contentStyle.fontSize)
                 .font(contentStyle.font)
                 .text(module.content.text.replace(/\\n/g, '\n'))
                 .moveDown(2);
            }
            
            // Script de vídeo
            if (module.content.videoScript) {
              doc.fontSize(subtitleStyle.fontSize)
                 .font(subtitleStyle.font)
                 .text('Script para Vídeo', { align: 'left' })
                 .moveDown(1);
              
              doc.fontSize(contentStyle.fontSize)
                 .font(contentStyle.font)
                 .text(module.content.videoScript.replace(/\\n/g, '\n'))
                 .moveDown(2);
            }
            
            // Atividades
            if (module.content.activities && module.content.activities.length > 0) {
              doc.fontSize(subtitleStyle.fontSize)
                 .font(subtitleStyle.font)
                 .text('Atividades', { align: 'left' })
                 .moveDown(1);
              
              module.content.activities.forEach((activity: any, actIndex: number) => {
                doc.fontSize(contentStyle.fontSize)
                   .font('Helvetica-Bold')
                   .text(`${actIndex + 1}. ${activity.title}`)
                   .font(contentStyle.font)
                   .text(`Descrição: ${activity.description}`)
                   .moveDown(1);
                
                // Questões da atividade
                if (activity.questions && activity.questions.length > 0) {
                  activity.questions.forEach((question: any, qIndex: number) => {
                    doc.fontSize(contentStyle.fontSize)
                       .font('Helvetica-Bold')
                       .text(`Questão ${qIndex + 1}: ${question.question}`)
                       .font(contentStyle.font)
                       .moveDown(0.5);
                    
                    // Opções de resposta
                    if (question.options && question.options.length > 0) {
                      question.options.forEach((option: string, oIndex: number) => {
                        doc.text(`${String.fromCharCode(97 + oIndex)}) ${option}`);
                      });
                      doc.moveDown(0.5);
                    }
                    
                    // Resposta (apenas para o gabarito)
                    if (question.answer) {
                      doc.fontSize(contentStyle.fontSize)
                         .font('Helvetica-Bold')
                         .text('Resposta: ', { continued: true })
                         .font(contentStyle.font)
                         .text(typeof question.answer === 'number' 
                               ? String.fromCharCode(97 + question.answer) 
                               : question.answer);
                    }
                    
                    // Explicação
                    if (question.explanation) {
                      doc.fontSize(contentStyle.fontSize)
                         .font('Helvetica-Bold')
                         .text('Explicação: ', { continued: true })
                         .font(contentStyle.font)
                         .text(question.explanation);
                    }
                    
                    doc.moveDown(1);
                  });
                }
                
                doc.moveDown(1);
              });
            }
          }
        });
      }
      
      // Adiciona informações de avaliação (se disponível)
      if (course.phaseData && course.phaseData.phase4) {
        doc.addPage();
        doc.fontSize(subtitleStyle.fontSize)
           .font(subtitleStyle.font)
           .text('Avaliação do Curso', { align: 'center' })
           .moveDown(2);
        
        doc.fontSize(contentStyle.fontSize)
           .font(contentStyle.font)
           .text(JSON.stringify(course.phaseData.phase4, null, 2));
      }
      
      // Finalize o documento
      doc.end();
      
      // Aguarde a conclusão da escrita antes de resolver a promise
      writeStream.on('finish', () => {
        resolve(pdfPath);
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Função para fazer upload de um arquivo para o Google Drive
export const uploadFileToDrive = async (filePath: string, fileName: string, mimeType: string = 'application/pdf') => {
  try {
    const oauth2Client = setupGoogleDriveClient();
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const fileMetadata = {
      name: fileName,
      mimeType: mimeType
    };
    
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath)
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });
    
    console.log('Arquivo salvo no Google Drive, ID:', response.data.id);
    
    // Limpe o arquivo temporário após o upload
    fs.unlinkSync(filePath);
    
    return {
      fileId: response.data.id,
      viewLink: response.data.webViewLink
    };
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    throw error;
  }
};

export const createCourseStructureOnDrive = async (course: any) => {
  try {
    console.log('Creating course structure on Google Drive...');
    
    // Create main course folder
    const courseFolderId = await createFolder(course.title);
    console.log(`Created course folder: ${course.title} (${courseFolderId})`);
    
    const results = {
      courseFolderId,
      modules: [] as any[]
    };
    
    // Create module folders and lesson content
    for (const module of course.modules) {
      console.log(`Creating module folder: ${module.title}`);
      const moduleFolderId = await createFolder(module.title, courseFolderId);
      
      const moduleResult = {
        id: module.id,
        title: module.title,
        folderId: moduleFolderId,
        lessons: [] as any[]
      };
      
      // Create lesson PDFs for each lesson in the module
      if (module.content?.lessons) {
        for (const lesson of module.content.lessons) {
          console.log(`Creating lesson content for: ${lesson.title}`);
          
          // Generate lesson content PDF
          const lessonPDF = await generateLessonPDF(lesson, module, course);
          const lessonFileName = `${lesson.title}_Conteudo.pdf`;
          const lessonFileId = await uploadPDFBuffer(lessonFileName, moduleFolderId, lessonPDF);
          
          // Generate lesson activities PDF if there are activities
          let activitiesFileId = null;
          if (lesson.detailedContent?.assessmentQuestions?.length > 0 || 
              lesson.detailedContent?.practicalExercises?.length > 0) {
            const activitiesPDF = await generateLessonActivitiesPDF(lesson, module, course);
            const activitiesFileName = `${lesson.title}_Atividades.pdf`;
            activitiesFileId = await uploadPDFBuffer(activitiesFileName, moduleFolderId, activitiesPDF);
          }
          
          moduleResult.lessons.push({
            title: lesson.title,
            contentFileId: lessonFileId,
            activitiesFileId
          });
        }
      }
      
      results.modules.push(moduleResult);
    }
    
    console.log('Course structure created successfully on Google Drive');
    return results;
  } catch (error) {
    console.error('Error creating course structure on Google Drive:', error);
    throw error;
  }
};

export const createFolder = async (name: string, parentFolderId?: string) => {
  try {
    const oauth2Client = setupGoogleDriveClient();
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

export const uploadPDFBuffer = async (fileName: string, parentFolderId: string, pdfBuffer: Buffer) => {
  try {
    const oauth2Client = setupGoogleDriveClient();
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
      name: fileName,
      parents: [parentFolderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: Buffer.from(pdfBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    return response.data.id;
  } catch (error) {
    console.error('Error uploading PDF buffer:', error);
    throw error;
  }
};

export const generateLessonPDF = async (lesson: any, module: any, course: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(lesson.title, { align: 'center' })
         .moveDown();

      doc.fontSize(14)
         .font('Helvetica')
         .text(`Módulo: ${module.title}`, { align: 'center' })
         .text(`Curso: ${course.title}`, { align: 'center' })
         .moveDown(2);

      // Objectives
      if (lesson.detailedContent?.objectives?.length) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Objetivos da Aula:')
           .moveDown(0.5);

        lesson.detailedContent.objectives.forEach((objective: string) => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${objective}`)
             .moveDown(0.2);
        });
        doc.moveDown();
      }

      // Content
      if (lesson.detailedContent?.content) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Conteúdo da Aula:')
           .moveDown(0.5);

        doc.fontSize(11)
           .font('Helvetica')
           .text(lesson.detailedContent.content, { align: 'justify' })
           .moveDown();
      }

      // Materials
      if (lesson.detailedContent?.materials?.length) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Materiais Necessários:')
           .moveDown(0.5);

        lesson.detailedContent.materials.forEach((material: string) => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${material}`)
             .moveDown(0.2);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const generateLessonActivitiesPDF = async (lesson: any, module: any, course: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(`${lesson.title} - Atividades`, { align: 'center' })
         .moveDown();

      doc.fontSize(14)
         .font('Helvetica')
         .text(`Módulo: ${module.title}`, { align: 'center' })
         .text(`Curso: ${course.title}`, { align: 'center' })
         .moveDown(2);

      let questionNumber = 1;

      // Assessment Questions
      if (lesson.detailedContent?.assessmentQuestions?.length) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Questões de Avaliação:')
           .moveDown();

        lesson.detailedContent.assessmentQuestions.forEach((question: any) => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${questionNumber}. ${question.question}`)
             .moveDown(0.3);

          question.options.forEach((option: string, index: number) => {
            const letter = String.fromCharCode(65 + index);
            const isCorrect = index === question.correct_answer;
            
            doc.fontSize(11)
               .font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
               .text(`${letter}) ${option}${isCorrect ? ' ✓' : ''}`)
               .moveDown(0.1);
          });

          if (question.explanation) {
            doc.fontSize(10)
               .font('Helvetica-Oblique')
               .text(`Explicação: ${question.explanation}`)
               .moveDown(0.5);
          }

          questionNumber++;
          doc.moveDown(0.3);
        });
      }

      // Practical Exercises
      if (lesson.detailedContent?.practicalExercises?.length) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Atividades Práticas:')
           .moveDown();

        lesson.detailedContent.practicalExercises.forEach((exercise: any) => {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .text(exercise.title)
             .moveDown(0.2);

          doc.fontSize(11)
             .font('Helvetica')
             .text(exercise.description)
             .moveDown(0.3);

          if (exercise.questions?.length) {
            exercise.questions.forEach((question: any) => {
              doc.fontSize(12)
                 .font('Helvetica-Bold')
                 .text(`${questionNumber}. ${question.question}`)
                 .moveDown(0.3);

              question.options.forEach((option: string, index: number) => {
                const letter = String.fromCharCode(65 + index);
                const isCorrect = index === question.correct_answer;
                
                doc.fontSize(11)
                   .font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
                   .text(`${letter}) ${option}${isCorrect ? ' ✓' : ''}`)
                   .moveDown(0.1);
              });

              if (question.explanation) {
                doc.fontSize(10)
                   .font('Helvetica-Oblique')
                   .text(`Explicação: ${question.explanation}`)
                   .moveDown(0.5);
              }

              questionNumber++;
            });
          }

          doc.moveDown(0.5);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Função que combina geração de PDF e upload para Google Drive
export const generateAndUploadCourse = async (course: any) => {
  return createCourseStructureOnDrive(course);
};