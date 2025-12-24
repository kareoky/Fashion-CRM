
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractBusinessCardData(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              text: `Extract all relevant professional contact information from this business card. 
              Be accurate. If a field is missing, return an empty string.
              Also, suggest a category based on the content (Brand, Factory, Export, Workshop, or Other).
              Return the data strictly in JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            personName: { type: Type.STRING },
            phone: { type: Type.STRING },
            whatsapp: { type: Type.STRING },
            email: { type: Type.STRING },
            instagram: { type: Type.STRING },
            address: { type: Type.STRING },
            category: { type: Type.STRING, description: "One of: Brand, Factory, Export, Workshop, Other" },
            field: { type: Type.STRING, description: "e.g., Men, Women, Kids, Textile" }
          },
          required: ["companyName", "personName"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Error extracting data:", error);
    throw error;
  }
}
