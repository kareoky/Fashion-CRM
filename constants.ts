
import { MessageTemplate, ContactCategory, ContactStatus } from './types';

export const CATEGORIES: ContactCategory[] = ['Brand', 'Factory', 'Export', 'Workshop', 'Other'];

export const STATUSES: ContactStatus[] = ['New', 'Contacted', 'Interested', 'Meeting', 'Deal Closed', 'Cold'];

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'first-contact',
    label: 'First Contact (Arabic)',
    text: "أ/ {{personName}} عامل إيه؟\n\nأنا {{myName}}، مصور أزياء. اتقابلنا في معرض {{event}} وخدت كارت حضرتك.\n\nحبيت أبقى على تواصل ولو في أي وقت حابب تطور شكل التصوير أو السوشيال عندكم أكون مبسوط أساعد."
  },
  {
    id: 'follow-up',
    label: 'Follow Up (Arabic)',
    text: "أ/ {{personName}}، كنت حابب أطمن لو حضرتك شوفت البورتفوليو اللي بعته؟\n\nلو فيه أي استفسار أو حابب ننسق سيشن تجريبية أنا موجود."
  }
];
