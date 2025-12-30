
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
              text: `حلل كارت العمل هذا بدقة لاستخراج كافة الروابط والبيانات:
              1. استخرج روابط أو يوزرات: Instagram, Facebook, Telegram, Website.
              2. فك شفرة أي QR Code موجود بالنظر للروابط المكتوبة بجانبه.
              3. استخرج أرقام الهواتف وافصل بينها بـ " ; ".
              4. حدد اسم الشركة والشخص المسؤول.
              5. اقترح تصنيفاً (Brand, Factory, Export, Workshop, Other).
              6. أجب بتنسيق JSON فقط.`,
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
            telegram: { type: Type.STRING },
            website: { type: Type.STRING },
            address: { type: Type.STRING },
            category: { type: Type.STRING },
            field: { type: Type.STRING }
          },
          required: ["companyName", "personName"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error extracting data:", error);
    throw error;
  }
}

export async function generateAIStrategy(contact: any) {
  if (!apiKey) throw new Error("API Key not configured");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك خبير تسويق، حلل بيانات العميل "${contact.companyName}" واقترح أفضل طريقة لبدء تعاون معهم كمصور محترف بناءً على تخصصهم: ${contact.field}. اقترح نص رسالة جذاب.`,
    });
    return response.text;
  } catch (e) {
    return "تعذر تحليل الاستراتيجية.";
  }
}
