import { BuyerFacts, GroundedClaim, SimulatedMeetingState } from './apriroseKnowledge';

export type CrmStage =
  | 'New Voice Intake'
  | 'Qualified for Review'
  | 'Sourcing & TDS Review'
  | 'Quotation Issued'
  | 'Won / Allocated';

export interface CrmLeadRecord {
  id: string;
  referenceCode: string;
  createdAt: string;
  updatedAt: string;
  stage: CrmStage;
  assignedOffice: 'London HQ' | 'Dubai Branch (DMCC)' | 'Nairobi Regional Hub' | 'Mumbai Desk' | 'Incheon Office' | 'Ha Noi Desk';
  assignedOwner: string;
  readinessScore: number;
  isLiveSession?: boolean;
  callDurationSec: number;
  facts: BuyerFacts;
  factEvidence: Record<string, string>;
  meeting: SimulatedMeetingState;
  claims: GroundedClaim[];
  notes: string;
}

export const INITIAL_CRM_LEADS: CrmLeadRecord[] = [
  {
    id: 'lead-texplast-ke',
    referenceCode: 'APR-2026-841',
    createdAt: '2026-10-30 14:20',
    updatedAt: '2026-10-30 14:26',
    stage: 'Qualified for Review',
    assignedOffice: 'Nairobi Regional Hub',
    assignedOwner: 'Esther (esther@aprirose.com)',
    readinessScore: 100,
    callDurationSec: 214,
    facts: {
      company: 'Texplast Industries Ltd.',
      companyCountry: 'Kenya',
      buyerType: 'Manufacturer',
      contactName: 'Bipin Shah',
      email: 'b.shah@texplast.co.ke',
      phone: '+254 722 819 402',
      material: 'PP Homopolymer (PPH) — Raffia',
      application: 'Woven Sacks & FIBC Bulk Bags',
      requestedGrade: 'Jinneng / Sinopec Raffia Grade',
      mfi: '3.5 g/10min',
      quantity: '150 MT',
      monthlyVolume: '300 MT / month',
      dischargePort: 'Mombasa',
      destinationCountry: 'Kenya',
      destinationCity: 'Nairobi',
      shippingTermRequested: 'CIF',
      paymentTermsRequested: 'LC',
      shipmentTiming: 'Mid-November 2026',
      preferredProducer: 'Jinneng',
      preferredContactMethod: 'WhatsApp',
      technicalDocumentRequested: 'TDS & COA',
      equivalentGradeAcceptable: 'Yes (Sinopec or Borouge)',
    },
    factEvidence: {
      company: 'Calling from Texplast Industries Ltd in Kenya',
      material: 'looking for 150 MT of PP Raffia MFI 3.5',
      dischargePort: 'CIF Mombasa port',
      paymentTermsRequested: '90-day LC',
    },
    meeting: {
      status: 'demo_booked',
      date: 'Tuesday, 3 Nov 2026',
      clockTime: '11:00',
      amPm: 'AM',
      timezone: 'Africa/Nairobi',
      locationLabel: 'Nairobi',
      validationNotes: [],
      confirmedAt: '14:25',
    },
    claims: [],
    notes: 'Repeat industrial packaging manufacturer in East Africa. Requested TDS review for high-tenacity raffia tape extrusion.',
  },
  {
    id: 'lead-messebo-et',
    referenceCode: 'APR-2026-839',
    createdAt: '2026-10-29 11:05',
    updatedAt: '2026-10-29 16:40',
    stage: 'Sourcing & TDS Review',
    assignedOffice: 'Dubai Branch (DMCC)',
    assignedOwner: 'Bijal Somaiya (bijal@aprirose.com)',
    readinessScore: 100,
    callDurationSec: 285,
    facts: {
      company: 'Messebo Cement Factory PLC',
      companyCountry: 'Ethiopia',
      buyerType: 'End User',
      contactName: 'Kofi Abraham',
      email: 'k.abraham@messebocement.com.et',
      phone: '+251 911 240 881',
      material: 'PP Raffia & AD*Star Bag Film Resin',
      application: 'Cement Valve Bags (50kg)',
      requestedGrade: 'Borouge / Oriental Energy Raffia',
      mfi: '3.0 - 4.0 g/10min',
      quantity: '220 MT',
      monthlyVolume: '450 MT / month',
      dischargePort: 'Djibouti',
      destinationCountry: 'Ethiopia',
      destinationCity: 'Addis Ababa',
      shippingTermRequested: 'CFR',
      paymentTermsRequested: 'LC',
      shipmentTiming: 'Q4 Scheduled Allocation',
      preferredProducer: 'Borouge',
      preferredContactMethod: 'Email',
      technicalDocumentRequested: 'Manufacturer TDS',
    },
    factEvidence: {
      company: 'Messebo Cement plant in Ethiopia',
      dischargePort: 'discharge at Djibouti port with overland transit',
      quantity: '220 MT initial lot',
    },
    meeting: {
      status: 'demo_booked',
      date: 'Wednesday, 4 Nov 2026',
      clockTime: '02:30',
      amPm: 'PM',
      timezone: 'Asia/Dubai',
      locationLabel: 'Dubai',
      validationNotes: [],
      confirmedAt: '11:12',
    },
    claims: [],
    notes: 'Coordinating with Djibouti warehouse partnership for overland logistics to Addis Ababa.',
  },
  {
    id: 'lead-iberia-es',
    referenceCode: 'APR-2026-834',
    createdAt: '2026-10-28 16:15',
    updatedAt: '2026-10-29 09:30',
    stage: 'Quotation Issued',
    assignedOffice: 'London HQ',
    assignedOwner: 'Parag (parag@aprirose.com)',
    readinessScore: 90,
    callDurationSec: 192,
    facts: {
      company: 'Iberia Conductos & Tuberías S.L.',
      companyCountry: 'Spain',
      buyerType: 'Converter',
      contactName: 'Carlos Mendoza',
      email: 'cmendoza@iberiaconductos.es',
      phone: '+34 91 555 0192',
      material: 'HDPE — PIPE (PE100)',
      application: 'High-Density Pressure Piping',
      requestedGrade: 'PE100 Black / Natural',
      mfi: '0.25 g/10min',
      quantity: '4 FCL',
      monthlyVolume: '10 FCL / month',
      dischargePort: 'Valencia',
      destinationCountry: 'Spain',
      destinationCity: 'Madrid',
      shippingTermRequested: 'CIF',
      paymentTermsRequested: 'T/T',
      preferredContactMethod: 'Email',
      technicalDocumentRequested: 'PE100 Pressure & TDS Certificate',
    },
    factEvidence: {
      quantity: '4 FCL trial order (kept in FCL without converting to invented tonnage)',
      material: 'HDPE PE100 pipe grade MFI 0.25',
    },
    meeting: {
      status: 'none',
      validationNotes: [],
    },
    claims: [],
    notes: 'Container quantity preserved strictly as 4 FCL per Aprirose intake rules. Manufacturer TDS under review for pressure pipe certification.',
  },
  {
    id: 'lead-unilever-ke',
    referenceCode: 'APR-2026-828',
    createdAt: '2026-10-26 10:00',
    updatedAt: '2026-10-27 17:10',
    stage: 'Won / Allocated',
    assignedOffice: 'Nairobi Regional Hub',
    assignedOwner: 'Esther (esther@aprirose.com)',
    readinessScore: 100,
    callDurationSec: 310,
    facts: {
      company: 'East Africa Detergents & Homecare Ltd.',
      companyCountry: 'Kenya',
      buyerType: 'Manufacturer',
      contactName: 'David Ochieng',
      email: 'd.ochieng@eadetergents.co.ke',
      phone: '+254 733 901 118',
      material: 'Sodium Sulfate Anhydrous & LABSA 96%',
      application: 'Soap & Detergent Powder Formulation',
      requestedGrade: '99% Min Purity Anhydrous / Reliance LAB',
      mfi: 'Chemical Spec',
      quantity: '500 MT',
      monthlyVolume: '1,200 MT / month',
      dischargePort: 'Mombasa',
      destinationCountry: 'Kenya',
      destinationCity: 'Nairobi',
      shippingTermRequested: 'CIF',
      paymentTermsRequested: 'LC',
      preferredProducer: 'Reliance',
      preferredContactMethod: 'Phone',
      technicalDocumentRequested: 'COA & MSDS',
    },
    factEvidence: {
      material: 'Sodium Sulfate Anhydrous and LABSA 96%',
      quantity: '500 MT',
    },
    meeting: {
      status: 'demo_booked',
      date: 'Monday, 2 Nov 2026',
      clockTime: '10:00',
      amPm: 'AM',
      timezone: 'Africa/Nairobi',
      locationLabel: 'Nairobi',
      validationNotes: [],
      confirmedAt: '10:08',
    },
    claims: [],
    notes: 'Detergent raw material package (Sodium Sulfate Anhydrous + LABSA 96%).Purity & COA verified with supplier.',
  },
  {
    id: 'lead-maharashtra-in',
    referenceCode: 'APR-2026-821',
    createdAt: '2026-10-25 15:40',
    updatedAt: '2026-10-25 15:48',
    stage: 'New Voice Intake',
    assignedOffice: 'Mumbai Desk',
    assignedOwner: 'Kartik (kartik@aprirose.com)',
    readinessScore: 80,
    callDurationSec: 165,
    facts: {
      company: 'Navkar Polyfilms Pvt. Ltd.',
      companyCountry: 'India',
      buyerType: 'Converter',
      contactName: 'Rajesh Mehta',
      email: 'rajesh@navkarpolyfilms.in',
      phone: '+91 98201 44510',
      material: 'LLDPE — Film Grade',
      application: 'Stretch & Lamination Packaging Film',
      requestedGrade: 'Butene / Octene LLDPE',
      mfi: '2.0 g/10min',
      quantity: '80 MT',
      monthlyVolume: '200 MT / month',
      dischargePort: 'Nhava Sheva',
      destinationCountry: 'India',
      destinationCity: 'Mumbai',
      shippingTermRequested: 'CIF',
      paymentTermsRequested: 'LC',
      preferredProducer: 'SABIC / Borouge',
      preferredContactMethod: 'WhatsApp',
    },
    factEvidence: {
      dischargePort: 'Nhava Sheva port',
      material: 'LLDPE film grade MFI 2.0',
    },
    meeting: {
      status: 'demo_booked',
      date: 'Thursday, 5 Nov 2026',
      clockTime: '03:30',
      amPm: 'PM',
      timezone: 'Asia/Kolkata',
      locationLabel: 'Mumbai',
      validationNotes: [],
      confirmedAt: '15:47',
    },
    claims: [],
    notes: 'Mapped Mumbai location alias to Asia/Kolkata. Ready for Mumbai Commercial Desk follow-up.',
  },
];

export function inferAssignedOffice(facts: BuyerFacts): {
  office: CrmLeadRecord['assignedOffice'];
  owner: string;
} {
  const loc = `${facts.companyCountry || ''} ${facts.destinationCountry || ''} ${facts.dischargePort || ''}`.toLowerCase();
  if (/india|mumbai|delhi|nhava sheva|chennai|kolkata|bangladesh|chittagong|pakistan/i.test(loc)) {
    return { office: 'Mumbai Desk', owner: 'Kartik (kartik@aprirose.com)' };
  }
  if (/kenya|mombasa|nairobi|tanzania|uganda|rwanda|burundi|madagascar|tamatave|mozambique|zambia|zimbabwe|malawi|south africa/i.test(loc)) {
    return { office: 'Nairobi Regional Hub', owner: 'Esther (esther@aprirose.com)' };
  }
  if (/uae|dubai|jebel ali|ethiopia|djibouti|middle east/i.test(loc)) {
    return { office: 'Dubai Branch (DMCC)', owner: 'Bijal Somaiya (bijal@aprirose.com)' };
  }
  if (/korea|incheon|china/i.test(loc)) {
    return { office: 'Incheon Office', owner: 'S.K. Bahn (skbahn@aprirose.com)' };
  }
  if (/vietnam|hanoi|ha noi/i.test(loc)) {
    return { office: 'Ha Noi Desk', owner: 'Katy (katy@aprirose.com)' };
  }
  return { office: 'London HQ', owner: 'Parag (parag@aprirose.com)' };
}
