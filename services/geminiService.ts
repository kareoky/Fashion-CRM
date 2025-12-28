
import { GoogleGenAI, Type } from "@google/genai";

// Securely access API key and handle cases where process might be undefined
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();

export async function extractBusinessCardData(base64Image: string) {
  if (!apiKey) {
    console.error("API Key is missing. Please check your environment variables.");
    throw new Error("API Key not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

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
              text: `قم باستخراج كافة بيانات الاتصال المهنية من كارت العمل هذا بدقة عالية جداً.
              تعليمات صارمة للأرقام:
              1. إذا وجدت أكثر من رقم هاتف، استخرج كل رقم على حدة.
              2. في حقل الـ phone: ضع كل الأرقام (موبايل وأرضي) وافصل بينهم بـ " ; " (فاصلة منقوطة ومسافة).
              3. في حقل الـ whatsapp: ابحث عن أرقام الموبايل فقط (التي تبدأ بـ 01 في مصر أو تحتوي على كود دولة). إذا وجدت أكثر من رقم موبايل، افصل بينهم بـ " ; ".
              4. لا تقم أبداً بدمج رقمين في سلسلة واحدة بدون فاصلة منقوطة واضحة.
              5. إذا كان الرقم يبدأ بـ 0020 أو +20، اتركه كما هو ولا تحذف الكود.
              6. اقترح تصنيفاً (Brand, Factory, Export, Workshop, Other).
              7. أجب بتنسيق JSON فقط.`,
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
            phone: { type: Type.STRING, description: "All numbers separated by ' ; '" },
            whatsapp: { type: Type.STRING, description: "Mobile numbers only separated by ' ; '" },
            email: { type: Type.STRING },
            instagram: { type: Type.STRING },
            address: { type: Type.STRING },
            category: { type: Type.STRING },
            field: { type: Type.STRING }
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
