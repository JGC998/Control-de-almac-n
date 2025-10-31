import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper function to dynamically import transformers.js
async function getPipeline() {
  const { pipeline } = await import('@xenova/transformers');
  return pipeline;
}

class GeneratorSingleton {
  static task = 'text2text-generation';
  static model = 'Xenova/LaMini-T5-61M';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      const pipeline = await getPipeline();
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

async function getJsonDataContext() {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const files = await fs.readdir(dataDir);
  const dataMap = new Map();

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(dataDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      dataMap.set(file, fileContent);
    }
  }

  return dataMap;
}

function findMostRelevantContext(question, dataMap) {
  const questionWords = new Set(question.toLowerCase().split(/\s+/));
  let bestFile = null;
  let maxScore = -1;

  for (const [filename, content] of dataMap.entries()) {
    let score = 0;
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    for (const word of questionWords) {
      if (filename.toLowerCase().includes(word)) {
        score += 5;
      }
      if (contentWords.has(word)) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestFile = content;
    }
  }

  return bestFile || null;
}

function jsonToText(jsonString, indent = 0) {
  try {
    const data = JSON.parse(jsonString);
    let text = '';

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        text += `Registro ${index + 1}:\n`;
        text += jsonToText(JSON.stringify(item), indent + 1);
      });
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const indentation = '  '.repeat(indent);
        if (typeof value === 'object' && value !== null) {
          text += `${indentation}${key}:\n`;
          text += jsonToText(JSON.stringify(value), indent + 1);
        } else {
          text += `${indentation}${key}: ${value}\n`;
        }
      }
    } else {
        return `  `.repeat(indent) + jsonString + '\n';
    }
    return text;
  } catch (error) {
    // If parsing fails, return the original string
    return jsonString;
  }
}


export async function POST(req) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1].content;

  const dataMap = await getJsonDataContext();
  const rawContext = findMostRelevantContext(question, dataMap);

  if (!rawContext) {
    return NextResponse.json({ response: 'No he encontrado información relevante para tu pregunta.' });
  }

  const textContext = jsonToText(rawContext);

  const prompt = `Usa el siguiente contexto para responder la pregunta. No incluyas el contexto en tu respuesta.

Contexto:
${textContext}

Pregunta: ${question}
Respuesta:`

  const generator = await GeneratorSingleton.getInstance();

  const result = await generator(prompt, {
    max_new_tokens: 200,
  });

  const response = result[0]?.generated_text || 'No he podido generar una respuesta.';

  return NextResponse.json({ response });
}