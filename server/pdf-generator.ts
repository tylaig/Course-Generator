import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface CourseData {
  title: string;
  theme: string;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    content: {
      lessons: Array<{
        title: string;
        detailedContent?: {
          objectives?: string[];
          content?: string;
          practicalExercises?: Array<{
            title: string;
            description: string;
            questions?: Array<{
              question: string;
              options: string[];
              correct_answer: number;
              explanation: string;
            }>;
          }>;
          assessmentQuestions?: Array<{
            question: string;
            options: string[];
            correct_answer: number;
            explanation: string;
          }>;
        };
      }>;
    };
  }>;
}

export async function generateCoursePDF(courseData: CourseData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(courseData.title, { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica')
         .text(courseData.theme, { align: 'center' })
         .moveDown(2);

      // Table of Contents
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('Índice', { underline: true })
         .moveDown();

      courseData.modules.forEach((module, moduleIndex) => {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(`${moduleIndex + 1}. ${module.title}`)
           .moveDown(0.5);
        
        module.content.lessons.forEach((lesson, lessonIndex) => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`   ${moduleIndex + 1}.${lessonIndex + 1} ${lesson.title}`)
             .moveDown(0.2);
        });
        doc.moveDown(0.5);
      });

      doc.addPage();

      // Course Content
      courseData.modules.forEach((module, moduleIndex) => {
        // Module Header
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(`Módulo ${moduleIndex + 1}: ${module.title}`)
           .moveDown();

        doc.fontSize(12)
           .font('Helvetica')
           .text(module.description)
           .moveDown(1.5);

        // Lessons
        module.content.lessons.forEach((lesson, lessonIndex) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.fontSize(16)
             .font('Helvetica-Bold')
             .text(`${moduleIndex + 1}.${lessonIndex + 1} ${lesson.title}`)
             .moveDown();

          if (lesson.detailedContent) {
            // Objectives
            if (lesson.detailedContent.objectives?.length) {
              doc.fontSize(14)
                 .font('Helvetica-Bold')
                 .text('Objetivos:')
                 .moveDown(0.3);

              lesson.detailedContent.objectives.forEach((objective) => {
                doc.fontSize(11)
                   .font('Helvetica')
                   .text(`• ${objective}`)
                   .moveDown(0.2);
              });
              doc.moveDown(0.5);
            }

            // Content (summarized)
            if (lesson.detailedContent.content) {
              doc.fontSize(14)
                 .font('Helvetica-Bold')
                 .text('Conteúdo:')
                 .moveDown(0.3);

              // Take first 500 characters as summary
              const contentSummary = lesson.detailedContent.content.substring(0, 500) + 
                                   (lesson.detailedContent.content.length > 500 ? '...' : '');
              
              doc.fontSize(11)
                 .font('Helvetica')
                 .text(contentSummary)
                 .moveDown(0.8);
            }

            // Assessment Questions
            if (lesson.detailedContent.assessmentQuestions?.length) {
              doc.fontSize(14)
                 .font('Helvetica-Bold')
                 .text('Questões de Avaliação:')
                 .moveDown(0.5);

              lesson.detailedContent.assessmentQuestions.forEach((question, qIndex) => {
                if (doc.y > 650) {
                  doc.addPage();
                }

                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text(`Questão ${qIndex + 1}:`)
                   .moveDown(0.2);

                doc.fontSize(11)
                   .font('Helvetica')
                   .text(question.question)
                   .moveDown(0.3);

                question.options.forEach((option, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const isCorrect = optIndex === question.correct_answer;
                  
                  doc.fontSize(10)
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
                doc.moveDown(0.3);
              });
            }

            // Practical Exercises
            if (lesson.detailedContent.practicalExercises?.length) {
              doc.fontSize(14)
                 .font('Helvetica-Bold')
                 .text('Atividades Práticas:')
                 .moveDown(0.5);

              lesson.detailedContent.practicalExercises.forEach((exercise, exIndex) => {
                if (doc.y > 650) {
                  doc.addPage();
                }

                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text(`Atividade ${exIndex + 1}: ${exercise.title}`)
                   .moveDown(0.2);

                doc.fontSize(11)
                   .font('Helvetica')
                   .text(exercise.description)
                   .moveDown(0.3);

                if (exercise.questions?.length) {
                  exercise.questions.forEach((question, qIndex) => {
                    doc.fontSize(11)
                       .font('Helvetica-Bold')
                       .text(`Questão: ${question.question}`)
                       .moveDown(0.2);

                    question.options.forEach((option, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isCorrect = optIndex === question.correct_answer;
                      
                      doc.fontSize(10)
                         .font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
                         .text(`${letter}) ${option}${isCorrect ? ' ✓' : ''}`)
                         .moveDown(0.1);
                    });

                    if (question.explanation) {
                      doc.fontSize(10)
                         .font('Helvetica-Oblique')
                         .text(`Explicação: ${question.explanation}`)
                         .moveDown(0.3);
                    }
                  });
                }
                doc.moveDown(0.5);
              });
            }
          }
          doc.moveDown(1);
        });

        // Add page break between modules (except for the last one)
        if (moduleIndex < courseData.modules.length - 1) {
          doc.addPage();
        }
      });

      // Footer with page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(10)
           .text(`Página ${i + 1} de ${pages.count}`, 
                  doc.page.width - 100, 
                  doc.page.height - 50, 
                  { align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateActivitySummaryPDF(courseData: CourseData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('Resumo de Atividades e Avaliações', { align: 'center' });
      
      doc.fontSize(18)
         .font('Helvetica')
         .text(courseData.title, { align: 'center' })
         .moveDown(2);

      let questionCounter = 1;

      courseData.modules.forEach((module, moduleIndex) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(`Módulo ${moduleIndex + 1}: ${module.title}`)
           .moveDown();

        module.content.lessons.forEach((lesson) => {
          if (lesson.detailedContent) {
            // Assessment Questions
            if (lesson.detailedContent.assessmentQuestions?.length) {
              doc.fontSize(14)
                 .font('Helvetica-Bold')
                 .text(`${lesson.title} - Questões de Avaliação`)
                 .moveDown(0.5);

              lesson.detailedContent.assessmentQuestions.forEach((question) => {
                if (doc.y > 650) {
                  doc.addPage();
                }

                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text(`${questionCounter}. ${question.question}`)
                   .moveDown(0.3);

                question.options.forEach((option, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const isCorrect = optIndex === question.correct_answer;
                  
                  doc.fontSize(11)
                     .font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
                     .text(`${letter}) ${option}${isCorrect ? ' ✓' : ''}`)
                     .moveDown(0.1);
                });

                doc.fontSize(10)
                   .font('Helvetica-Oblique')
                   .text(`Resposta: ${question.explanation}`)
                   .moveDown(0.8);

                questionCounter++;
              });
            }

            // Practical Exercises Questions
            if (lesson.detailedContent.practicalExercises?.length) {
              lesson.detailedContent.practicalExercises.forEach((exercise) => {
                if (exercise.questions?.length) {
                  doc.fontSize(14)
                     .font('Helvetica-Bold')
                     .text(`${lesson.title} - ${exercise.title}`)
                     .moveDown(0.5);

                  exercise.questions.forEach((question) => {
                    if (doc.y > 650) {
                      doc.addPage();
                    }

                    doc.fontSize(12)
                       .font('Helvetica-Bold')
                       .text(`${questionCounter}. ${question.question}`)
                       .moveDown(0.3);

                    question.options.forEach((option, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isCorrect = optIndex === question.correct_answer;
                      
                      doc.fontSize(11)
                         .font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
                         .text(`${letter}) ${option}${isCorrect ? ' ✓' : ''}`)
                         .moveDown(0.1);
                    });

                    doc.fontSize(10)
                       .font('Helvetica-Oblique')
                       .text(`Resposta: ${question.explanation}`)
                       .moveDown(0.8);

                    questionCounter++;
                  });
                }
              });
            }
          }
        });

        if (moduleIndex < courseData.modules.length - 1) {
          doc.moveDown(1.5);
        }
      });

      // Footer with page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(10)
           .text(`Página ${i + 1} de ${pages.count}`, 
                  doc.page.width - 100, 
                  doc.page.height - 50, 
                  { align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}