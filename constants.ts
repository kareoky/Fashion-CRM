
import { MessageTemplate, ContactCategory, ContactStatus } from './types';

export const CATEGORIES: ContactCategory[] = ['Brand', 'Factory', 'Export', 'Workshop', 'Other'];

export const STATUSES: ContactStatus[] = ['New', 'Contacted', 'Interested', 'Meeting', 'Deal Closed', 'Cold'];

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'kareem-primary',
    label: 'رسالة التعارف الأساسية (كاريوكي)',
    text: "مساء الخير،\nأنا كريم أو كاريوكي، مصور أزياء وملابس وإعلانات. كان ليا الشرف أزور الجناح بتاعكم في معرض Cairo Fashion & Tex واخدت كارت التواصل الخاص بحضرتكم.\n\nحبيت أبقى على تواصل، ويسعدني أشارككم البورتفوليو الخاص بي. ولو في أي وقت حابين تطوروا شكل التصوير أو المحتوى البصري للبراند، أكون سعيد بالتعاون معكم."
  },
  {
    id: 'portfolio-link',
    label: 'إرسال البورتفوليو فقط',
    text: "أهلاً أ/ {{personName}}، ده لينك البورتفوليو الخاص بيا (كريم كاريوكي) اللي اتكلمنا عليه في المعرض:\n[ضع لينك البورتفوليو هنا]\n\nيسعدني جداً التعاون معاكم."
  }
];
