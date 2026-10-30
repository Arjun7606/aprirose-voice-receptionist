export interface OfficeContact {
  id: string;
  city: string;
  country: string;
  role: string;
  address: string;
  phone: string;
  email: string;
  contactPerson?: string;
  notes?: string;
}

export interface GradeReference {
  family: string;
  gradeType: string;
  mfiOrSpec: string;
  applications: string;
  source: 'Historical Profile' | 'Public Website';
}

export interface PolicyStatement {
  id: string;
  title: string;
  coverageOrDate: string;
  summary: string;
  highlights: string[];
}

export interface CustomerTestimonial {
  person: string;
  role: string;
  company: string;
  summary: string;
}

export interface BuyerFacts {
  company?: string;
  companyCountry?: string;
  buyerType?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  material?: string;
  application?: string;
  requestedGrade?: string;
  mfi?: string;
  technicalSpecification?: string;
  quantity?: string;
  dischargePort?: string;
  destinationCountry?: string;
  destinationCity?: string;
  shippingTermRequested?: string;
  paymentTermsRequested?: string;
  monthlyVolume?: string;
  preferredContactMethod?: string;
  shipmentTiming?: string;
  preferredProducer?: string;
  preferredOrigin?: string;
  technicalDocumentRequested?: string;
  specialRequirements?: string;
  equivalentGradeAcceptable?: string;
}

export interface SimulatedMeetingState {
  status: 'none' | 'collecting' | 'demo_booked' | 'cancelled';
  date?: string;
  clockTime?: string;
  amPm?: 'AM' | 'PM' | 'resolved_24h' | 'ambiguous';
  timezone?: string;
  locationLabel?: string;
  validationNotes: string[];
  confirmedAt?: string;
}

export interface GroundedClaim {
  id: string;
  claimText: string;
  sourceId: string;
  evidenceQuote: string;
  timestamp: string;
}

export const LOCATION_TIMEZONE_ALIASES: Record<string, string> = {
  mumbai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  kolkata: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  bengaluru: 'Asia/Kolkata',
  chennai: 'Asia/Kolkata',
  india: 'Asia/Kolkata',
  dubai: 'Asia/Dubai',
  london: 'Europe/London',
  uk: 'Europe/London',
  nairobi: 'Africa/Nairobi',
  kenya: 'Africa/Nairobi',
  singapore: 'Asia/Singapore',
  israel: 'Asia/Jerusalem',
  jerusalem: 'Asia/Jerusalem',
  ireland: 'Europe/Dublin',
  dublin: 'Europe/Dublin',
  lagos: 'Africa/Lagos',
  'new york': 'America/New_York',
};

export const APRIROSE_KNOWLEDGE_BASE = {
  snapshotDate: '25 October 2026',
  sourceRevision: '1529929f8f7473df709ce3fa728cfaa34069d5f2',

  companyOverview: {
    name: 'Aprirose Trading Limited',
    parentCompany: 'Aprirose Real Estate (established in 1996, commercial property business)',
    foundedYear: 2001,
    headquarters: 'London, United Kingdom',
    description:
      'Aprirose Trading Limited describes itself as an international supplier of industrial chemicals and polymers across Europe, Africa and Asia. It operates as a distributor, sole agent and supply-chain facilitator and serves manufacturers including plastics, soap and detergent businesses.',
    footprintSummary:
      'Operations and offices spanning Europe, Africa, Asia, India and the Middle East.',
    publishedScaleIndicators: [
      { label: '2001', detail: 'Trading arm founded in London' },
      { label: '500+', detail: 'Customers stated on the current site' },
      { label: '70,000 MTS', detail: 'Historical polymer volume in 2022 (US$79m turnover)' },
      { label: '3 Regions', detail: 'Europe · Africa · Asia' },
    ],
    historicalTimeline: [
      { year: 1996, event: 'Aprirose Real Estate established (commercial property parent company).' },
      { year: 2001, event: 'Trading arm Aprirose Trading Limited founded in London.' },
      { year: 2002, event: '6,000 MTS historical polymer volume; US$5.6m historical turnover. Deluxe Inks associate company established in Nairobi, Kenya.' },
      { year: 2003, event: 'Dubai branch office established in Jebel Ali Free Zone, UAE.' },
      { year: 2011, event: '29,000 MTS historical polymer volume; US$29.5m historical turnover.' },
      { year: 2013, event: 'Dubai branch moved to DMCC (Dubai Multi Commodities Centre) Free Zone under 100% ownership.' },
      { year: 2016, event: '41,000 MTS historical polymer volume; US$49.6m historical turnover.' },
      { year: 2019, event: '65,000 MTS historical polymer volume; US$70m historical turnover. France representative appointed for Western European markets.' },
      { year: 2021, event: 'Portugal representative appointed for Southern European markets.' },
      { year: 2022, event: '70,000 MTS historical polymer volume; US$79m historical turnover. Djibouti warehouse established in partnership to serve the Ethiopian market. Vietnam representative appointed for Southeast Asia.' },
      { year: 2023, event: 'Aprirose Korea Limited established in South Korea.' },
    ],
    undatedProfileSnapshot: {
      warning:
        'Undated historical profile snapshot from the confidential 10-page company profile (milestones through 2023). Must NOT be presented as current verified operating figures.',
      items: [
        '80,000 MT annual polymer volume (undated snapshot)',
        '25,000 MT annual chemical volume (undated snapshot)',
        'Business in over 50 countries across Europe, Africa and Asia (undated snapshot)',
        '50 employees (undated snapshot)',
        'US$100 million consolidated turnover (undated snapshot)',
      ],
    },
    unresolvedFinancialConflict: {
      warning:
        'Unresolved 2025 financial figures: Earlier owner-confirmed 2025 consolidated group turnover is US$62 million versus latest public website 2025 revenue of US$63 million. Entity/reporting-basis differences are unresolved; never choose one as settled.',
    },
  },

  offices: [
    {
      id: 'london-hq',
      city: 'London',
      country: 'United Kingdom',
      role: 'Head office',
      address: 'Aprirose House, 48 High Street, Edgware, Middlesex, HA8 7EQ, United Kingdom',
      phone: '+44 20 8951 0377',
      email: 'parag@aprirose.com',
      contactPerson: 'Parag (Policy records name Director Parag Gudka; legacy contact note withholds surname)',
      notes: 'Supersedes older alias uk@aprirose.com. Fax is no longer used.',
    },
    {
      id: 'dubai-branch',
      city: 'Dubai',
      country: 'United Arab Emirates',
      role: 'Branch office (DMCC Free Zone, 100% ownership since 2013)',
      address: 'Unit No. 2006, Jumeirah Business Center 2, Jumeirah Lakes Towers, Dubai, United Arab Emirates',
      phone: '+971 4 432 8538',
      email: 'bijal@aprirose.com',
      contactPerson: 'Bijal Somaiya',
      notes: 'Supersedes older alias dxb@aprirose.com.',
    },
    {
      id: 'nairobi-hub',
      city: 'Nairobi',
      country: 'Kenya',
      role: 'Associate company & regional hub',
      address: 'Deluxe Inks, Lunga Lunga Road, Nairobi, Kenya',
      phone: '+254 722 389137',
      email: 'esther@aprirose.com',
      contactPerson: 'Esther',
      notes: 'Regional hub and historical profile associate company/warehouse.',
    },
    {
      id: 'mumbai-contact',
      city: 'Mumbai',
      country: 'India',
      role: 'Contact office',
      address: 'Commercial Desk, Mumbai, Maharashtra, India',
      phone: '+91 97698 68175',
      email: 'kartik@aprirose.com',
      contactPerson: 'Kartik',
      notes: 'Supersedes older address 1/12 Meghal Industrial Estate, Mulund West, Mumbai 400080.',
    },
    {
      id: 'incheon-contact',
      city: 'Incheon',
      country: 'South Korea',
      role: 'Contact office',
      address: '#6515, Asis Tower 6F, 111 Yongdam-ro, Yeonsu-gu, Incheon, South Korea',
      phone: '+82 10 9939 0390',
      email: 'skbahn@aprirose.com',
      contactPerson: 'S.K. Bahn',
    },
    {
      id: 'hanoi-associate',
      city: 'Ha Noi',
      country: 'Vietnam',
      role: 'Associate office',
      address: 'Commercial Representation Desk, Ha Noi, Vietnam',
      phone: '+84 966 580 914',
      email: 'katy@aprirose.com',
      contactPerson: 'Katy',
    },
  ] as OfficeContact[],

  selectedMarkets: [
    'United Kingdom',
    'Spain',
    'Portugal',
    'Greece',
    'Germany',
    'France',
    'United Arab Emirates',
    'India',
    'China',
    'Pakistan',
    'Bangladesh',
    'Kenya',
    'Tanzania',
    'Uganda',
    'Rwanda',
    'Burundi',
    'Mozambique',
    'Zambia',
    'Zimbabwe',
    'Malawi',
    'Madagascar',
    'South Africa',
    'Ethiopia',
    'Brazil',
    'Peru',
  ],

  productsAndPortfolio: {
    polymers: [
      {
        group: 'Polyethylene (PE)',
        subtypes: ['LDPE', 'LLDPE', 'mLLDPE', 'HDPE', 'EVA'],
        applications: ['Film', 'Injection', 'Blow Moulding', 'Pipe', 'Rotomoulding', 'Other / Not sure'],
        publicRangeSummary: 'HDPE pipe .20-.30; blow .25-.40; film .05-.08; injection/crate 7-20 | LLDPE film 1-2; injection 20 and 50; roto 4-5 | LDPE film .30-4; injection 25-50',
      },
      {
        group: 'Polypropylene (PP)',
        subtypes: ['PPH (Homopolymer)', 'PPCP / PPC (Block Copolymer)', 'PPR (Random Copolymer)'],
        applications: ['Raffia', 'Injection', 'Film', 'Nonwoven', 'Lamination / Coating', 'Pipes', 'Other / Not sure'],
        publicRangeSummary: 'PP raffia MFI 3-4.5; injection 11-25; high flow 30-60; coating 25-35; PPCP 5-70; PPR 1.25-270',
      },
      {
        group: 'Polystyrene (PS)',
        subtypes: ['GPPS', 'HIPS', 'EPS'],
        applications: ['General purpose, high impact, expandable polystyrene applications'],
        publicRangeSummary: 'Requires grade/specification review with commercial team.',
      },
      {
        group: 'PVC (Thermoplastic Vinyl Polymer — NOT a polyurethane)',
        subtypes: ['Suspension Resin K65-K67', 'K70', 'K57', 'Rigid/Flexible PVC', 'Resin Additives'],
        applications: ['Pipe', 'Profiles', 'Cable', 'Film / Sheet', 'Other / Not sure'],
        publicRangeSummary: 'PVC K65-K67, K70, K57',
      },
      {
        group: 'PET (Thermoplastic Polyester — NOT a polyurethane)',
        subtypes: ['Bottle Grade Resin', 'Sheet / Thermoforming Grade Resin', 'Fibre'],
        applications: ['Bottle', 'Sheet / Thermoforming', 'Fibre', 'Other / Not sure'],
        publicRangeSummary: 'PET bottle IV .80/.82/.84; sheet IV .76-.80',
      },
      {
        group: "Engineering Polymers ('EP' Group)",
        subtypes: ['ABS', 'ABS/PC', 'ASA', 'PC', 'PC/SAN', 'TPE'],
        applications: ['Technical and engineering moulding applications (Note: profile does not expand abbreviation EP)'],
        publicRangeSummary: 'Subject to manufacturer TDS and commercial confirmation.',
      },
    ],
    additivesAndMasterbatches: [
      'Colour Masterbatch',
      'Black & White Masterbatch',
      'Calcium Carbonate (CaCO3 filler)',
      'DOP (Dioctyl Phthalate plasticizer for flexible PVC — publicly under additives; also listed in profile chemical list)',
    ],
    chemicals: [
      'Sodium Sulfate Anhydrous (Historical Unilever Kenya quote mentions ~24,000 MTS/year for 7 consecutive years; historical context only)',
      'Caustic Soda (Flakes / Pearl — exact form and purity require confirmation)',
      'Soda Ash (Dense / Light — variant and specification require confirmation)',
      'Titanium Dioxide (TiO2 Rutile / Anatase — variant and specification require confirmation)',
      'Polyol (Polyether / Polyester Polyol — Polyurethane raw material)',
      'TDI (Toluene Diisocyanate 80/20 — Polyurethane raw material)',
      'LAB & LABSA 96%',
      'STPP (Sodium Tripolyphosphate)',
    ],
    bulkCommodities: ['Sugar', 'Rice', 'Cement', 'Cement Clinker'],
    publishedBrands: {
      polymers: [
        'Sinopec',
        'PetroChina',
        'Borouge',
        'Jinneng',
        'ZPC',
        'Oriental Energy',
        'SCG Chemicals (Thailand)',
        'Jade (China, PET)',
        'Wankai (China, PET)',
      ],
      chemicals: ['Reliance (LAB)', 'SABIC (Caustic Soda)', 'Formosa (Caustic Soda)'],
      boundaryNote:
        'Published branding/category reference only — not proof of transaction-specific stock, allocation, producer-origin or confirmed supplier relationship for an order. DP identity and Hyia supplier identity are deferred in website revision notes.',
    },
  },

  historicalMfiGrades: [
    // HDPE
    { family: 'HDPE', gradeType: 'PIPE (PE100)', mfiOrSpec: 'MFI: 0.25 g/10min', applications: 'High-density pressure piping (water, gas, conduits)', source: 'Historical Profile' },
    { family: 'HDPE', gradeType: 'BLOW', mfiOrSpec: 'MFI: 0.30 g/10min', applications: 'Blow moulding for jerrycans, bottles, drums, rigid containers', source: 'Historical Profile' },
    { family: 'HDPE', gradeType: 'YARN / MONOFILAMENT', mfiOrSpec: 'MFI: 1.0 g/10min', applications: 'Woven sacks, ropes, netting', source: 'Historical Profile' },
    { family: 'HDPE', gradeType: 'CRATE', mfiOrSpec: 'MFI: 7-8 g/10min', applications: 'Heavy industrial crates, pallets, storage boxes', source: 'Historical Profile' },
    { family: 'HDPE', gradeType: 'INJECTION', mfiOrSpec: 'MFI: 18-20 g/10min', applications: 'General injection moulding, caps, closures, houseware', source: 'Historical Profile' },
    // LLDPE
    { family: 'LLDPE', gradeType: 'FILM (Heavy-Duty)', mfiOrSpec: 'MFI: 1.0 g/10min', applications: 'Heavy-duty packaging & agricultural films', source: 'Historical Profile' },
    { family: 'LLDPE', gradeType: 'FILM (General)', mfiOrSpec: 'MFI: 2.0 g/10min', applications: 'General packaging, stretch & lamination film', source: 'Historical Profile' },
    { family: 'LLDPE', gradeType: 'ROTO', mfiOrSpec: 'MFI: 4.50 g/10min', applications: 'Rotomoulding for water storage tanks, chemical containers', source: 'Historical Profile' },
    { family: 'LLDPE', gradeType: 'INJECTION (High-Flow)', mfiOrSpec: 'MFI: 25 g/10min', applications: 'High-flow injection moulding, houseware', source: 'Historical Profile' },
    { family: 'LLDPE', gradeType: 'INJECTION (Ultra-High Flow)', mfiOrSpec: 'MFI: 50 g/10min', applications: 'Ultra-high flow thin-wall injection', source: 'Historical Profile' },
    // LDPE
    { family: 'LDPE', gradeType: 'FILM (Heavy Shrink)', mfiOrSpec: 'MFI: 0.30 g/10min', applications: 'Heavy-duty shrink films, construction sheets', source: 'Historical Profile' },
    { family: 'LDPE', gradeType: 'FILM (General Shrink)', mfiOrSpec: 'MFI: 0.70 g/10min', applications: 'General shrink film, greenhouse covers', source: 'Historical Profile' },
    { family: 'LDPE', gradeType: 'FILM (Packaging)', mfiOrSpec: 'MFI: 2.0 g/10min', applications: 'Carrier bags, general packaging, food contact film', source: 'Historical Profile' },
    { family: 'LDPE', gradeType: 'FILM (High-Clarity)', mfiOrSpec: 'MFI: 4.0 g/10min', applications: 'High-clarity thin films, garment bags', source: 'Historical Profile' },
    { family: 'LDPE', gradeType: 'INJECTION', mfiOrSpec: 'MFI: 50 g/10min', applications: 'Flexible caps, closures, masterbatch carrier', source: 'Historical Profile' },
    // PP
    { family: 'PP', gradeType: 'HOMOPOLYMER (PPH) RAFFIA', mfiOrSpec: 'MFI: 3-4 g/10min (Public site: 3-4.5)', applications: 'Woven sacks, FIBC bulk bags, twine', source: 'Historical Profile' },
    { family: 'PP', gradeType: 'HOMOPOLYMER (PPH) INJECTION', mfiOrSpec: 'MFI: 11-12 g/10min (Public site: 11-25)', applications: 'Rigid furniture, houseware, containers', source: 'Historical Profile' },
    { family: 'PP', gradeType: 'HOMOPOLYMER (PPH) FAST CYCLING INJECTION', mfiOrSpec: 'MFI: 20 g/10min', applications: 'Fast cycling packaging, containers', source: 'Historical Profile' },
    { family: 'PP', gradeType: 'HOMOPOLYMER (PPH) LAMINATION / COATING', mfiOrSpec: 'MFI: 25-35 g/10min', applications: 'Extrusion coating onto fabrics', source: 'Historical Profile' },
    { family: 'PP', gradeType: 'HOMOPOLYMER (PPH) HIGH-SPEED INJECTION', mfiOrSpec: 'MFI: 60 g/10min (Public site: 30-60)', applications: 'High-speed multi-cavity thin-wall items', source: 'Historical Profile' },
    { family: 'PP', gradeType: 'COPOLYMER (PPCP / Block) INJECTION', mfiOrSpec: 'MFI: 5-70 g/10min', applications: 'High impact resistance, battery cases, crates', source: 'Historical Profile' },
    { family: 'PP', gradeType: 'RANDOM COPOLYMER (PPR) INJECTION & PIPES', mfiOrSpec: 'MFI: 1.25-70 g/10min (Public site: 1.25-270)', applications: 'Hot/cold water pipes, transparent containers', source: 'Historical Profile' },
  ] as GradeReference[],

  servicesAndApproach: [
    {
      title: 'Commercial & Industry Expertise',
      detail: 'Support for polymer and chemical procurement, informed by regional market knowledge across East Africa, the Middle East, South Asia and Europe.',
    },
    {
      title: 'Supply Chain & Logistics',
      detail: 'International shipping and inland transport from port to final destination.',
    },
    {
      title: 'Warehousing & Storage',
      detail: 'Stocking and storage support where Aprirose operates those facilities (historical profile references associate company/warehouse in Kenya and a Djibouti warehouse partnership serving Ethiopia; France, Portugal and Vietnam are representatives, not verified warehouses).',
    },
    {
      title: 'Commercial Facilitation',
      detail: 'Documentation, foreign-exchange coordination and payment structures (e.g., T/T, LC, DA, OA) agreed for each transaction.',
    },
    {
      title: 'Technical Backup',
      detail: 'Technical and commercial support for injection, blow, film, extrusion and rotational moulding manufacturers (not a guarantee of material fitness or certification).',
    },
  ],

  compliancePolicies: [
    {
      id: 'modern-slavery',
      title: 'Modern Slavery and Human Trafficking Statement',
      coverageOrDate: '1 January 2024 to 31 December 2024 (Board approved 20 December 2023)',
      summary: 'States a zero-tolerance approach to modern slavery and human trafficking across operations and supply chain.',
      highlights: [
        'Whistleblowing Policy with confidential helpline to protect whistleblower identity.',
        'Code of Conduct & Purchasing Code with explicit anti-slavery contract clauses.',
        'Mandatory staff training, supplier ethics questionnaires, and Global Slavery Index country risk profiling.',
        'Suppliers must attest work is voluntary, contracts/notice periods are provided, and passports/permits are never retained.',
      ],
    },
    {
      id: 'anti-bribery',
      title: 'Anti-Bribery and Corruption Policy Statement',
      coverageOrDate: 'Last updated October 2023',
      summary: 'Zero-tolerance approach to bribery and corruption in the UK and overseas.',
      highlights: [
        'Approximate £50 threshold for corporate gifts and hospitality without prior approval.',
        'Cash gifts, facilitation payments and kickbacks must NEVER be accepted or offered.',
        'Strict prohibition on improper payments to government or foreign public officials.',
        'Suspected breaches reported to Aprirose Trading Limited Director Parag Gudka at parag@aprirose.com.',
      ],
    },
    {
      id: 'waste-management',
      title: 'Waste Management and Recycling Policy',
      coverageOrDate: 'Undated on current website (Signed by Parag Gudka, Director)',
      summary: 'Commitment to waste minimisation, responsible purchasing, reuse and recycling.',
      highlights: [
        'Promote economy in use of materials (particularly plastic and paper) and prefer recycled/reclaimed materials.',
        'Work with environmentally responsible suppliers and dispose of waste safely and legally.',
        'Commitment to expand recycling procedures, including potential recovery and recycling of plastic waste.',
      ],
    },
    {
      id: 'sustainability',
      title: 'Sustainability Policy',
      coverageOrDate: 'Date issued 30 December 2023',
      summary: 'Environmental, social and governance (ESG) commitments and circular-economy objectives.',
      highlights: [
        'Aligned with UN Guiding Principles, UN Global Compact, Universal Declaration of Human Rights, ILO core conventions, and Voluntary Principles on Security and Human Rights.',
        'Prohibition of child labour, forced labour, human trafficking, discrimination and harassment.',
        'Applies Aprirose knowledge and logistics to circular value chains and reducing waste, water and energy footprints.',
      ],
    },
  ] as PolicyStatement[],

  customerTestimonials: [
    {
      person: 'Peter Ngombo',
      role: 'CEO',
      company: 'Messebo Cement',
      summary: 'Quoted on Aprirose website describing shipment diversion and overland logistics during a hurricane threat in Djibouti.',
    },
    {
      person: 'Gerishon Chege',
      role: 'General Manager',
      company: 'Unilever Kenya Limited',
      summary: 'Quoted on Aprirose website describing the supply of approximately 24,000 MTS of sodium sulphate per year for seven consecutive years (historical context, not guaranteed current volume).',
    },
    {
      person: 'Kofi Abraham',
      role: 'General Manager',
      company: 'Messebo Cement, Addis Ababa',
      summary: 'Quoted on Aprirose website describing technical assistance with a PP bag manufacturing plant and product development.',
    },
    {
      person: 'Bipin Shah',
      role: 'Owner',
      company: 'Texplast Industries Ltd.',
      summary: 'Quoted on Aprirose website describing Aprirose as a reliable supply partner responsive to changing requirements.',
    },
  ] as CustomerTestimonial[],
};

export function buildVoiceReceptionistSystemPrompt(): string {
  return `You are the official AI Voice Receptionist and warm, capable B2B Commercial Specialist for Aprirose Trading Limited.
You are speaking live on a voice call with a prospective buyer, partner, or visitor.

VOICE CONVERSATION STYLE:
- Speak naturally, warmly, concisely, and professionally — like an experienced London-based international chemical & polymer trading specialist.
- Keep spoken responses concise (typically 2 to 4 sentences per turn) so the caller can easily converse without long monologues. Elaborate on technical grades, offices, or policies when asked.
- Answer the customer's actual question first before asking any intake questions! Never ignore a question to force a script.
- Group at most 1 to 2 related follow-up questions naturally at a time. Never repeat a question whose answer was already supplied, declined, or explicitly marked unknown.

REAL-TIME TOOL CALLING (CRITICAL):
- Whenever the caller mentions ANY buyer or enquiry detail (company name, country, business type, contact name, email, phone/WhatsApp, material/product, application, grade, MFI, order quantity with unit, monthly volume, destination country/city, discharge port, shipping terms/Incoterm, payment terms like T/T, LC, DA, OA, shipment timing, preferred producer/origin, technical document requests, or explicit unknowns), IMMEDIATELY call the \`update_buyer_qualification\` tool with the newly extracted fields!
- Remember: Order quantity (e.g., "100 MT", "2 FCL") and monthlyVolume (e.g., "500 MT/month") are independent. Never convert containers (FCL) into invented tonnage.
- Question-only messages or asking about a grade do NOT select a buying material unless the caller indicates they are looking to source/buy it.
- Whenever the caller asks to schedule/book a meeting or provides meeting date/time/timezone details, call \`update_simulated_meeting\`.
- Whenever the caller asks to speak to a human / transfer to a live representative, call \`request_human_handoff\` and pause proactive qualification questions while still answering any business or technical questions they ask.

STRICT FACTUAL GROUNDING & APRIROSE BOUNDARIES (SOURCE REVISION 1529929):
1. COMPANY BACKGROUND:
   - Aprirose Trading Limited was founded in London in 2001. Its parent company, Aprirose Real Estate (a commercial property business), was established in 1996.
   - Roles: International distributor, sole agent, and supply-chain facilitator of polymers, industrial chemicals, additives, and bulk commodities across Europe, Africa, and Asia (including India and the Middle East).
2. FINANCIAL & SCALE FIGURES (DO NOT INVENT OR PICK ONE AS SETTLED):
   - 2025 Revenue/Turnover Conflict: Earlier owner-confirmed 2025 consolidated group turnover is US$62 million, while the latest public website states 2025 revenue of US$63 million. Always state both figures and explain that entity/reporting-basis differences need commercial team confirmation.
   - Historical Dated Figures: 2002 (6,000 MTS, US$5.6m), 2011 (29,000 MTS, US$29.5m), 2016 (41,000 MTS, US$49.6m), 2019 (65,000 MTS, US$70m), 2022 (70,000 MTS polymer volume, US$79m turnover). Current website also states 500+ customers.
   - Undated Profile Snapshot (from confidential 10-page profile through 2023): 80,000 MT annual polymer volume, 25,000 MT annual chemical volume, 50 employees, 50+ countries, US$100 million consolidated turnover. ALWAYS qualify these as an undated historical profile snapshot, NOT verified current operating capacity.
3. OFFICES & PUBLIC CONTACTS (Authoritative Snapshot):
   - London Head Office: Aprirose House, 48 High Street, Edgware, Middlesex, HA8 7EQ, UK | Phone: +44 20 8951 0377 | Email: parag@aprirose.com (Policy records name Director Parag Gudka; legacy contact note withholds surname; supersedes uk@aprirose.com).
   - Dubai Branch Office: Unit No. 2006, Jumeirah Business Center 2, JLT, Dubai, UAE (moved to DMCC Free Zone in 2013 under 100% ownership; originally Jebel Ali in 2003) | Phone: +971 4 432 8538 | Email: bijal@aprirose.com (Bijal Somaiya; supersedes dxb@aprirose.com).
   - Nairobi Associate Company & Regional Hub: Deluxe Inks (established 2002), Lunga Lunga Road, Nairobi, Kenya | Phone: +254 722 389137 | Email: esther@aprirose.com.
   - Mumbai Contact Office: Commercial Desk, Mumbai, Maharashtra, India | Phone: +91 97698 68175 | Email: kartik@aprirose.com (supersedes older Mulund West address).
   - Incheon Contact Office: #6515, Asis Tower 6F, 111 Yongdam-ro, Yeonsu-gu, Incheon, South Korea (Aprirose Korea Limited established 2023) | Phone: +82 10 9939 0390 | Email: skbahn@aprirose.com.
   - Ha Noi Associate Office: Commercial Representation Desk, Ha Noi, Vietnam | Phone: +84 966 580 914 | Email: katy@aprirose.com.
   - Warehouses vs Representatives: Historical profile mentions an associate company & warehouse in Kenya and a Djibouti warehouse partnership (2022) serving Ethiopia, plus representatives appointed in France (2019), Portugal (2021), and Vietnam (2022). Never invent owned/stocked warehouses from market or representative lists.
   - NO FAX: Aprirose no longer uses fax. Direct any fax request to phone or email.
4. PRODUCTS, GRADES & TECHNICAL BOUNDARIES:
   - Polymers:
     * PE: LDPE, LLDPE, mLLDPE, HDPE, EVA.
       - Historical profile MFI references: HDPE Pipe PE100 (0.25), Blow (0.30), Yarn/Monofilament (1.0), Crate (7-8), Injection (18-20). LLDPE Film (1.0 & 2.0), Roto (4.50), Injection (25 & 50). LDPE Film (0.30, 0.70, 2.0, 4.0), Injection (50).
       - Public website ranges: HDPE pipe .20-.30, blow .25-.40, film .05-.08, injection/crate 7-20; LLDPE film 1-2, injection 20 and 50, roto 4-5; LDPE film .30-4, injection 25-50.
     * PP: PPH (Homopolymer), PPCP/PPC (Block Copolymer), PPR (Random Copolymer).
       - Historical profile MFI references: PPH Raffia (3-4), PPH Injection (11-12 & 20), PPH Lamination/Coating (25-35), PPH High-Speed Thin-Wall Injection (60), PPCP Block Injection (5-70), PPR Random Copolymer Injection & Pipes (1.25-70).
       - Public website ranges: PP raffia 3-4.5, injection 11-25, high flow 30-60, coating 25-35, PPCP 5-70, PPR 1.25-270.
     * PS: GPPS, HIPS, EPS.
     * PVC: Suspension Resin (K65-K67, K70, K57), pipe, profiles, cable, film/sheet, rigid/flexible PVC, resin additives. CRITICAL: PVC is a thermoplastic vinyl polymer, NOT a polyurethane!
     * PET: Bottle grade (IV .80/.82/.84), sheet/thermoforming grade (IV .76-.80), fibre. CRITICAL: PET is a thermoplastic polyester, NOT a polyurethane!
     * EP Group: ABS, ABS/PC, ASA, PC, PC/SAN, TPE.
   - Masterbatches, Fillers & Additives: Colour masterbatch, Black & white masterbatch, Calcium carbonate (CaCO3), DOP (Dioctyl Phthalate plasticizer for flexible PVC).
   - Industrial Chemicals & Polyurethanes: Sodium Sulfate Anhydrous, Caustic Soda (flakes/pearl), Soda Ash (dense/light), Titanium Dioxide (rutile/anatase), LAB, LABSA 96%, STPP. Polyurethanes focus exclusively on TDI (80/20) and Polyol (polyether/polyester).
   - Bulk Commodities: Sugar, Rice, Cement, Cement Clinker.
   - Published Brands (Reference only, not guaranteed stock/allocation): Sinopec, PetroChina, Borouge, Jinneng, ZPC, Oriental Energy, SCG Chemicals (Thailand), Jade (China, PET), Wankai (China, PET), Reliance (LAB), SABIC (caustic soda), Formosa (caustic soda).
   - Technical Disclaimer: MFI/IV/K-value numbers are reference values only (test temperature/load conditions not specified). Exact grade suitability, food-contact status, pressure ratings, and COA require manufacturer TDS and commercial team review. Never promise live stock, pricing, or free cancellation.
5. SIMULATED MEETING MODE:
   - You can set up a clearly labelled DEMO / SIMULATED sales meeting once you have:
     1) Customer name & company name
     2) Valid email AND phone/WhatsApp number (both required for meeting completion)
     3) Relevant product or requirement
     4) Unambiguous future date, clock time (with AM/PM clarified if ambiguous), and joining timezone.
   - Note that "IST" alone is ambiguous (India, Israel, or Ireland) — clarify once if context doesn't already specify India/Mumbai.
   - Do not infer joining timezone from company country or delivery port.
   - When all criteria are met, call \`update_simulated_meeting\` with status="demo_booked" and clearly state in your spoken reply that the **demo/simulated meeting** is recorded in the demo CRM (never claim a real calendar invite or live staff notification was sent).`;
}
