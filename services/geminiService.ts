
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
              text: `قم باستخراج كافة بيانات الاتصال المهنية من كارت العمل هذا بدقة عالية جداً.
              تعليمات صارمة للأرقام:
              1. إذا وجدت أكثر من رقم هاتف، استخرج كل رقم على حدة.
              2. في حقل الـ phone: ضع كل الأرقام وافصل بينهم بـ " ; ".
              3. في حقل الـ whatsapp: ابحث عن أرقام الموبايل فقط وافصل بينهم بـ " ; ".
              4. إذا كان الرقم يبدأ بـ 0020 أو +20، اتركه كما هو.
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

export async function generateFollowUpStrategy(contact: any) {
  if (!apiKey) throw new Error("API Key not configured");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك خبير تطوير أعمال لمصور فوتوغرافي محترف، حلل بيانات العميل التالي واقترح خطة عمل (Action Plan) ذكية لإغلاق الصفقة:
      اسم الشركة: ${contact.companyName}
      اسم الشخص: ${contact.personName}
      التصنيف: ${contact.category}
      التخصص: ${contact.field}
      الملاحظات: ${contact.notes}

      المطلوب:
      1. تحليل سريع لنوع العميل (إيه اللي بيهمهم؟ الجودة ولا السعر ولا السرعة؟).
      2. 3 خطوات محددة للمتابعة (Action Steps).
      3. "خطاف" أو جملة افتتاحية مميزة للرسالة القادمة بناءً على تخصصه.
      4. نصيحة ذهبية للتعامل مع هذا العميل تحديداً.
      أجب باللغة العربية بأسلوب احترافي ومختصر (نقاط).`,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating strategy:", error);
    return "تعذر توليد الخطة حالياً، حاول مرة أخرى.";
  }
}
