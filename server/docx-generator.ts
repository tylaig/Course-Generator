import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import * as fs from 'fs';

export interface CourseDataDocx {
  title: string;
  theme: string;
  deliveryFormat: string;
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

export async function generateCourseDocx(courseData: CourseDataDocx): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Título do curso
  children.push(
    new Paragraph({
      text: courseData.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(
    new Paragraph({
      text: `Tema: ${courseData.theme}`,
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(new Paragraph({ text: "" })); // Linha em branco

  // Informações do curso
  children.push(
    new Paragraph({
      text: "Informações do Curso",
      heading: HeadingLevel.HEADING_1,
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Formato de Entrega: ",
          bold: true,
        }),
        new TextRun({
          text: courseData.deliveryFormat,
        }),
      ],
    })
  );

  children.push(new Paragraph({ text: "" })); // Linha em branco

  // Módulos
  if (courseData.modules && courseData.modules.length > 0) {
    children.push(
      new Paragraph({
        text: "Módulos do Curso",
        heading: HeadingLevel.HEADING_1,
      })
    );

    courseData.modules.forEach((module, moduleIndex) => {
      children.push(
        new Paragraph({
          text: `Módulo ${moduleIndex + 1}: ${module.title}`,
          heading: HeadingLevel.HEADING_2,
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Descrição: ",
              bold: true,
            }),
            new TextRun({
              text: module.description,
            }),
          ],
        })
      );

      // Aulas do módulo
      if (module.content && module.content.lessons) {
        module.content.lessons.forEach((lesson, lessonIndex) => {
          children.push(
            new Paragraph({
              text: `Aula ${lessonIndex + 1}: ${lesson.title}`,
              heading: HeadingLevel.HEADING_3,
            })
          );

          if (lesson.detailedContent) {
            // Objetivos
            if (lesson.detailedContent.objectives && lesson.detailedContent.objectives.length > 0) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Objetivos:",
                      bold: true,
                    }),
                  ],
                })
              );

              lesson.detailedContent.objectives.forEach(objective => {
                children.push(
                  new Paragraph({
                    text: `• ${objective}`,
                  })
                );
              });

              children.push(new Paragraph({ text: "" }));
            }

            // Conteúdo
            if (lesson.detailedContent.content) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Conteúdo:",
                      bold: true,
                    }),
                  ],
                })
              );

              children.push(
                new Paragraph({
                  text: lesson.detailedContent.content,
                })
              );

              children.push(new Paragraph({ text: "" }));
            }

            // Exercícios práticos
            if (lesson.detailedContent.practicalExercises && lesson.detailedContent.practicalExercises.length > 0) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Exercícios Práticos:",
                      bold: true,
                    }),
                  ],
                })
              );

              lesson.detailedContent.practicalExercises.forEach((exercise, exerciseIndex) => {
                children.push(
                  new Paragraph({
                    text: `Exercício ${exerciseIndex + 1}: ${exercise.title}`,
                    heading: HeadingLevel.HEADING_4,
                  })
                );

                children.push(
                  new Paragraph({
                    text: exercise.description,
                  })
                );

                // Questões do exercício
                if (exercise.questions && exercise.questions.length > 0) {
                  exercise.questions.forEach((question, questionIndex) => {
                    children.push(
                      new Paragraph({
                        text: `${questionIndex + 1}. ${question.question}`,
                      })
                    );

                    // Opções
                    if (question.options && question.options.length > 0) {
                      question.options.forEach((option, optionIndex) => {
                        children.push(
                          new Paragraph({
                            text: `${String.fromCharCode(97 + optionIndex)}) ${option}`,
                          })
                        );
                      });
                    }

                    // Resposta correta e explicação
                    children.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Resposta: ",
                            bold: true,
                          }),
                          new TextRun({
                            text: String.fromCharCode(97 + question.correct_answer),
                          }),
                        ],
                      })
                    );

                    if (question.explanation) {
                      children.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Explicação: ",
                              bold: true,
                            }),
                            new TextRun({
                              text: question.explanation,
                            }),
                          ],
                        })
                      );
                    }

                    children.push(new Paragraph({ text: "" }));
                  });
                }
              });
            }

            // Questões de avaliação
            if (lesson.detailedContent.assessmentQuestions && lesson.detailedContent.assessmentQuestions.length > 0) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Questões de Avaliação:",
                      bold: true,
                    }),
                  ],
                })
              );

              lesson.detailedContent.assessmentQuestions.forEach((question, questionIndex) => {
                children.push(
                  new Paragraph({
                    text: `${questionIndex + 1}. ${question.question}`,
                  })
                );

                // Opções
                if (question.options && question.options.length > 0) {
                  question.options.forEach((option, optionIndex) => {
                    children.push(
                      new Paragraph({
                        text: `${String.fromCharCode(97 + optionIndex)}) ${option}`,
                      })
                    );
                  });
                }

                // Resposta correta e explicação
                children.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Resposta: ",
                        bold: true,
                      }),
                      new TextRun({
                        text: String.fromCharCode(97 + question.correct_answer),
                      }),
                    ],
                  })
                );

                if (question.explanation) {
                  children.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Explicação: ",
                          bold: true,
                        }),
                        new TextRun({
                          text: question.explanation,
                        }),
                      ],
                    })
                  );
                }

                children.push(new Paragraph({ text: "" }));
              });
            }
          }
        });
      }
    });
  }

  // Criar o documento
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  // Converter para buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export async function generateActivitySummaryDocx(courseData: CourseDataDocx): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Título
  children.push(
    new Paragraph({
      text: `${courseData.title} - Resumo de Atividades`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(new Paragraph({ text: "" }));

  // Resumo de atividades por módulo
  if (courseData.modules && courseData.modules.length > 0) {
    courseData.modules.forEach((module, moduleIndex) => {
      children.push(
        new Paragraph({
          text: `Módulo ${moduleIndex + 1}: ${module.title}`,
          heading: HeadingLevel.HEADING_2,
        })
      );

      if (module.content && module.content.lessons) {
        module.content.lessons.forEach((lesson, lessonIndex) => {
          if (lesson.detailedContent && 
              (lesson.detailedContent.practicalExercises || lesson.detailedContent.assessmentQuestions)) {
            
            children.push(
              new Paragraph({
                text: `Aula ${lessonIndex + 1}: ${lesson.title}`,
                heading: HeadingLevel.HEADING_3,
              })
            );

            // Contar exercícios e questões
            const exerciseCount = lesson.detailedContent.practicalExercises?.length || 0;
            const assessmentCount = lesson.detailedContent.assessmentQuestions?.length || 0;

            children.push(
              new Paragraph({
                text: `• Exercícios práticos: ${exerciseCount}`,
              })
            );

            children.push(
              new Paragraph({
                text: `• Questões de avaliação: ${assessmentCount}`,
              })
            );

            children.push(new Paragraph({ text: "" }));
          }
        });
      }
    });
  }

  // Criar o documento
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  // Converter para buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}