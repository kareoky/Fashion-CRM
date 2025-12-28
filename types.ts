
export type ContactCategory = 'Brand' | 'Factory' | 'Export' | 'Workshop' | 'Other';
export type ContactStatus = 'New' | 'Contacted' | 'Interested' | 'Meeting' | 'Deal Closed' | 'Cold';

export interface BusinessCardData {
  id: string;
  companyName: string;
  personName: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  address: string;
  category: ContactCategory;
  field?: string; // Men, Women, Kids, etc.
  status: ContactStatus;
  notes: string;
  aiStrategy?: string; // الخطة المقترحة من الذكاء الاصطناعي
  lastContactDate?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  label: string;
  text: string;
}
