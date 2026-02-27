import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  /**
   * Enhances a short notification text to make it more professional and engaging.
   */
  async enhanceNotification(text: string): Promise<string> {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Actúa como una secretaria escolar profesional y amable. Reescribe el siguiente anuncio para que sea claro, cordial y breve (máximo 2 oraciones). Mantén la información original intacta: "${text}"`,
        config: {
          temperature: 0.7,
        }
      });
      
      return response.text?.trim() || text;
    } catch (error) {
      console.error("Error calling Gemini:", error);
      return text; // Fallback to original
    }
  },

  /**
   * Analyzes nutritional data and provides personalized advice.
   */
  async getGenericTextResponse(prompt: string): Promise<string> {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });
      return response.text?.trim() || "No se pudo generar una respuesta.";
    } catch (error) {
      console.error("Error calling Gemini for generic text response:", error);
      return "Error al generar la respuesta de IA. Inténtalo de nuevo.";
    }
  },

  /**
   * Analyzes nutritional data and provides personalized advice.
   */
  async getNutritionalAdvice(stats: Record<string, unknown>): Promise<{ title: string; text: string; score: number }> {
    try {
      const prompt = `
        Analiza los siguientes datos de almuerzos escolares de un estudiante de los últimos 7 días:
        ${JSON.stringify(stats)}
        
        Provee un consejo nutricional breve, un título motivador y una puntuación de salud del 1 al 100.
        Responde estrictamente en formato JSON.
      `;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              text: { type: Type.STRING },
              score: { type: Type.INTEGER }
            },
            required: ["title", "text", "score"]
          }
        }
      });

      const jsonStr = response.text;
      if (jsonStr) {
        return JSON.parse(jsonStr);
      }
      throw new Error("Empty response");
    } catch (error) {
      console.error("Error analyzing nutrition:", error);
      return {
        title: "Análisis no disponible",
        text: "No pudimos conectar con el experto virtual en este momento.",
        score: 0
      };
    }
  }
};
