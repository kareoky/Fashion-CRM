
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();

export async function extractBusinessCardData(base64Image: string) {
  if (!apiKey) throw new Error("API Key not configured");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            {
              text: `استخرج بيانات كارت العمل بدقة:
              - whatsapp: رقم الموبايل الأساسي فقط (11 رقم).
              - phone: أي أرقام أخرى إضافية.
              - روابط السوشيال ميديا: instagram, facebook, website.
              - اترك الحقل فارغاً "" إذا لم تجد المعلومة، لا تكتب null.
              - أجب بـ JSON فقط.`,
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
            facebook: { type: Type.STRING },
            website: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["companyName"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
