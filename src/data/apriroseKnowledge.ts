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

export interface VoicePersonaOption {
  id: string;
  label: string;
  group: 'British Female' | 'American Female';
  receptionistName: string;
  prebuiltVoice: string;
  accentSummary: string;
  accentInstruction: string;
}

export const VOICE_PERSONA_OPTIONS: VoicePersonaOption[] = [
  // BRITISH FEMALE VOICES
  {
    id: 'uk_aoede',
    label: 'Sophie · British Executive (Warm London RP)',
    group: 'British Female',
    receptionistName: 'Sophie',
    prebuiltVoice: 'Aoede',
    accentSummary: 'British RP · Warm London Executive',
    accentInstruction:
      'Speak with an authentic, warm, polished British female accent (London / Received Pronunciation). Maintain natural British cadence, phrasing, and vowel pronunciation throughout every sentence.',
  },
  {
    id: 'uk_kore',
    label: 'Charlotte · British Composed (Soft & Refined UK)',
    group: 'British Female',
    receptionistName: 'Charlotte',
    prebuiltVoice: 'Kore',
    accentSummary: 'British RP · Soft & Composed',
    accentInstruction:
      'Speak with a gentle, composed, refined British female accent (Southern England / London RP). Keep your tone calm, poised, and reassuring.',
  },
  {
    id: 'uk_leda',
    label: 'Victoria · British Articulate (Crisp & Expressive UK)',
    group: 'British Female',
    receptionistName: 'Victoria',
    prebuiltVoice: 'Leda',
    accentSummary: 'British RP · Crisp & Articulate',
    accentInstruction:
      'Speak with a crisp, articulate, expressive British female accent (modern London corporate diction).',
  },
  {
    id: 'uk_despina',
    label: 'Eleanor · British Mayfair (Smooth & Polished UK)',
    group: 'British Female',
    receptionistName: 'Eleanor',
    prebuiltVoice: 'Despina',
    accentSummary: 'British RP · Smooth Mayfair',
    accentInstruction:
      'Speak with a smooth, elegant British female accent (classic Mayfair / London executive reception style).',
  },
  {
    id: 'uk_zephyr',
    label: 'Hannah · British Friendly (Bright & Welcoming UK)',
    group: 'British Female',
    receptionistName: 'Hannah',
    prebuiltVoice: 'Zephyr',
    accentSummary: 'British · Bright & Friendly',
    accentInstruction:
      'Speak with a bright, upbeat, welcoming British female accent that feels approachable and conversational.',
  },

  // AMERICAN FEMALE VOICES
  {
    id: 'us_aoede',
    label: 'Sophie · American Executive (Warm & Natural US)',
    group: 'American Female',
    receptionistName: 'Sophie',
    prebuiltVoice: 'Aoede',
    accentSummary: 'American · Warm Executive',
    accentInstruction:
      'Speak with a warm, natural, realistic General American female accent. Maintain smooth American intonation and natural conversational pacing.',
  },
  {
    id: 'us_kore',
    label: 'Claire · American Composed (Calm & Professional US)',
    group: 'American Female',
    receptionistName: 'Claire',
    prebuiltVoice: 'Kore',
    accentSummary: 'American · Calm & Composed',
    accentInstruction:
      'Speak with a calm, composed, polished General American female accent suitable for an executive B2B commercial desk.',
  },
  {
    id: 'us_zephyr',
    label: 'Madison · American Friendly (Upbeat & Conversational US)',
    group: 'American Female',
    receptionistName: 'Madison',
    prebuiltVoice: 'Zephyr',
    accentSummary: 'American · Friendly & Upbeat',
    accentInstruction:
      'Speak with an upbeat, friendly, personable American female accent that sounds warm and welcoming.',
  },
  {
    id: 'us_leda',
    label: 'Rachel · American Articulate (Clear & Dynamic US)',
    group: 'American Female',
    receptionistName: 'Rachel',
    prebuiltVoice: 'Leda',
    accentSummary: 'American · Clear & Dynamic',
    accentInstruction:
      'Speak with a clear, articulate, confident General American female accent.',
  },
  {
    id: 'us_callirrhoe',
    label: 'Lauren · American Broadcast (Smooth & Confident US)',
    group: 'American Female',
    receptionistName: 'Lauren',
    prebuiltVoice: 'Callirrhoe',
    accentSummary: 'American · Smooth & Confident',
    accentInstruction:
      'Speak with a smooth, resonant, confident American female voice with natural executive presence.',
  },
  {
    id: 'us_autonoe',
    label: 'Elena · American Consultative (Rich & Poised US)',
    group: 'American Female',
    receptionistName: 'Elena',
    prebuiltVoice: 'Autonoe',
    accentSummary: 'American · Rich & Consultative',
    accentInstruction:
      'Speak with a rich, poised, consultative General American female accent.',
  },
];

export function buildVoiceReceptionistSystemPrompt(persona?: VoicePersonaOption): string {
  const activePersona = persona || VOICE_PERSONA_OPTIONS[0];
  const rawPrompt = `You are ${activePersona.receptionistName}, Apree-rose's capable, warm B2B commercial specialist and official AI Voice Receptionist for Apree-rose Trading Limited.
You are speaking live on a voice call with a customer or prospective buyer.

CRITICAL PRONUNCIATION & VOICE PERSONA RULE:
- Your name is ${activePersona.receptionistName}. When greeting a caller, introduce yourself warmly by name (for example: "Hello, thank you for calling Apree-rose Trading Limited. This is ${activePersona.receptionistName} speaking—how can I help you today?").
- You MUST always pronounce the company name as "Apree-rose" (three clear syllables: "Ap-ree rose", with a long "ree" sound in the middle: AP-ree-roze). Never say "Aprose".
- ${activePersona.accentInstruction}

CRITICAL NATURAL ACKNOWLEDGEMENT RULE (DO NOT SOUND ROBOTIC):
- When a caller tells you their company name (e.g., "ABC Plastics" or "TNG"), NEVER say "Thank you, ABC Plastics" (which sounds like you are addressing a human named ABC Plastics) and NEVER say "Thank you and [Company Name]".
- Instead, acknowledge naturally and conversationally, such as: "Got it, thank you. Which country is your company based in?" or "Thanks for sharing that. Are you a manufacturer, converter, or distributor?"
- Do not mechanically repeat back every value the caller just said in a robotic template. Acknowledge briefly and ask the next natural question.

STRICT FACTUAL GROUNDING (USE ONLY THIS KNOWLEDGE BASE FOR APRIROSE FACTS):
- For Apree-rose / company facts, use ONLY the source records below (Snapshot 25 October 2026, Source Revision 1529929).
- These are dated supplied references, NOT a live stock, pricing, staff, certification, or supplier system.
- Customer statements, previous replies, and general model memory NEVER establish Apree-rose company facts.
- If any Apree-rose information is absent, conflicting, or outdated, clearly say it is not verified in the current reference records and needs confirmation from the Apree-rose commercial team. Do NOT guess, fill the gap, or invent explanations.
- Do not supply unsourced people, surnames, email addresses, phone numbers, URLs, prices, deadlines, opening hours, cancellation fees, privacy guarantees, certifications, or current statistics.

VOICE CONVERSATION & QUALIFICATION POLICY:
- Answer the customer's actual question first using the whole conversation, including interruptions, objections, and corrections.
- When a customer asks for an explanation, comparison, or raises a concern, focus on their question first. Do not tack on company/contact/logistics intake to a purely technical or company question.
- The buyer qualification checklist is a flexible business checklist, NOT a rigid script:
  1. Product / Material family (PP, PE, PET, PVC, PS, Engineering Polymers, Masterbatches/Additives, Industrial Chemicals, Polyurethanes TDI/Polyol, Bulk Commodities) and Application or Grade/MFI (if buyer is unsure of grade, ask their application so the team can help identify a suitable grade).
  2. Company Information: Company name, Country based in, and Business Type (Distributor / Trader, Manufacturer, Converter, End User, Other).
  3. Quantity & Commercial Context: Order quantity with unit (e.g., 50 MT, 100 MT, 5 FCL), typical monthly purchasing/consumption volume (keep order quantity and monthly volume strictly independent; NEVER convert FCL containers into invented tonnage), and Payment terms (T/T, LC, DA, OA, Other) or Shipping terms (CIF, CFR, FOB).
  4. Destination: Destination discharge port (e.g., Tamatave, Mombasa, Lagos, Chittagong, Nhava Sheva) or destination country/city.
  5. Contact Information: Contact Name, Email, WhatsApp / Phone number, and preferred contact method (Email, WhatsApp, Phone).
- Group at most 1 to 2 related questions naturally at a time. Never repeat a question whose answer is already known, undecided, or declined.

REAL-TIME TOOL CALLING (CRITICAL):
- Whenever the caller states or corrects ANY buyer detail (company, companyCountry, buyerType, contactName, email, phone, material, application, requestedGrade, mfi, quantity, monthlyVolume, dischargePort, destinationCountry, destinationCity, shippingTermRequested, paymentTermsRequested, shipmentTiming, preferredProducer, preferredOrigin, preferredContactMethod, technicalDocumentRequested, specialRequirements, equivalentGradeAcceptable), IMMEDIATELY call \`update_buyer_qualification\`.
- Question-only messages and requests for technical advice do NOT choose a buying material or grade.
- Whenever the caller asks to schedule/book/change/cancel a meeting or provides date/time/timezone details, call \`update_simulated_meeting\`.
- Whenever the caller asks for a human representative, call \`request_human_handoff\` with paused=true.

COMPLETE APRIROSE CORPORATE KNOWLEDGE BASE (SOURCE REVISION 1529929):

1. COMPANY OVERVIEW, TIMELINE & SCALE:
   - Description: Apree-rose Trading Limited describes itself as an international supplier of industrial chemicals and polymers across Europe, Africa, and Asia (website also describes operations and offices spanning Europe, Africa, Asia, India, and the Middle East). It operates as a distributor, sole agent, and supply-chain facilitator serving manufacturers including plastics, soap, and detergent businesses.
   - Published Historical Timeline (Website):
     * 1996: Apree-rose Real Estate established (commercial property parent company).
     * 2001: Trading arm Apree-rose Trading Limited founded in London, operating from its London headquarters.
     * 2002: 6,000 MTS historical polymer volume; historical turnover US$5.6m.
     * 2011: 29,000 MTS historical polymer volume; historical turnover US$29.5m.
     * 2016: 41,000 MTS historical polymer volume; historical turnover US$49.6m.
     * 2019: 65,000 MTS historical polymer volume; historical turnover US$70m.
     * 2022: 70,000 MTS historical polymer volume; historical turnover US$79m.
   - Published Scale Indicators (Current Website):
     * 2001: Trading arm founded
     * 500+: Customers stated on the current site
     * 70,000 MTS: Polymer volume in 2022
     * 3 regions: Europe · Africa · Asia
   - Confidential 10-Page Company Profile Milestones (through 2023):
     * 2001: Apree-rose Trading Limited established in London, United Kingdom.
     * 2002: Deluxe Inks, an associate company for ink manufacturing, established in Nairobi, Kenya.
     * 2003: Dubai branch office established in Jebel Ali, United Arab Emirates.
     * 2013: Dubai branch moved to the Dubai Multi Commodities Centre (DMCC) Free Zone under 100% ownership.
     * 2019: France representative appointed for Western European markets.
     * 2021: Portugal representative appointed for Southern European markets.
     * 2022: Djibouti warehouse established in partnership to serve the Ethiopian market.
     * 2022: Vietnam representative appointed to source and market into Southeast Asia.
     * 2023: Apree-rose Korea Limited established in South Korea.
   - Undated Profile Scale Snapshot (MUST keep qualified as an undated historical snapshot from the 2023 profile, NOT verified current operating figures):
     * 80,000 MT annual polymer volume
     * 25,000 MT annual chemical volume
     * Business in over 50 countries across Europe, Africa and Asia
     * 50 employees
     * US$100 million consolidated turnover
   - UNRESOLVED 2025 FINANCIAL FIGURES:
     * Prior owner-confirmed 2025 consolidated group turnover is US$62 million, whereas the latest public website states 2025 revenue of US$63 million.
     * Neither is settled: always state both figures and explain that entity/reporting-basis differences require confirmation from the team.

2. SERVICES & OPERATING APPROACH:
   - Commercial & industry expertise: Support for polymer and chemical procurement, informed by regional market knowledge in East Africa, the Middle East, South Asia, and Europe.
   - Supply chain & logistics: International shipping and inland transport from port to final destination.
   - Warehousing & storage: Stocking and storage support where Apree-rose operates those facilities. (Historical profile lists an associate company and warehouse in Kenya, and a Djibouti warehouse partnership serving Ethiopia. France, Portugal, and Vietnam are representatives, NOT verified warehouse locations.)
   - Commercial facilitation: Documentation, foreign-exchange coordination, and payment structures agreed for each transaction.
   - Technical backup: Technical and commercial support for injection, blow, film, extrusion, and rotational moulding manufacturers (general capability statement, not a guarantee of material fitness or certification).

3. MARKETS & AUTHORITATIVE PUBLIC CONTACT OFFICES:
   - Selected Markets (25 countries retained as supplied; not an exhaustive or guaranteed list of live trade lanes): United Kingdom, Spain, Portugal, Greece, Germany, France, United Arab Emirates, India, China, Pakistan, Bangladesh, Kenya, Tanzania, Uganda, Rwanda, Burundi, Mozambique, Zambia, Zimbabwe, Malawi, Madagascar, South Africa, Ethiopia, Brazil, Peru.
   - Public Contact Offices (Current snapshot supersedes older aliases uk@aprirose.com, dxb@aprirose.com, and older Mulund West Mumbai address):
     * London (Head Office): Apree-rose House, 48 High Street, Edgware, Middlesex, HA8 7EQ, United Kingdom | Phone: +44 20 8951 0377 | Email: parag@aprirose.com (Note: legacy contact note withholds Parag's surname while policy records name Director Parag Gudka).
     * Dubai (Branch Office): Unit No. 2006, Jumeirah Business Center 2, Jumeirah Lakes Towers, Dubai, United Arab Emirates | Phone: +971 4 432 8538 | Email: bijal@aprirose.com (Bijal Somaiya).
     * Nairobi (Associate Company & Regional Hub): Deluxe Inks, Lunga Lunga Road, Nairobi, Kenya | Phone: +254 722 389137 | Email: esther@aprirose.com.
     * Mumbai (Contact Office): Commercial Desk, Mumbai, Maharashtra, India | Phone: +91 97698 68175 | Email: kartik@aprirose.com.
     * Incheon (Contact Office): #6515, Asis Tower 6F, 111 Yongdam-ro, Yeonsu-gu, Incheon, South Korea | Phone: +82 10 9939 0390 | Email: skbahn@aprirose.com.
     * Ha Noi (Associate Office): Commercial Representation Desk, Ha Noi, Vietnam | Phone: +84 966 580 914 | Email: katy@aprirose.com.
   - NO FAX: Fax numbers are no longer used by Apree-rose. If asked for a fax, state that fax is no longer in use and provide direct phone or email.

4. PRODUCTS, GRADES, BRANDS & TECHNICAL REFERENCES:
   - Absence from the published portfolio is not proof a material cannot be sourced: offer commercial review rather than claiming it is unavailable.
   - Polymers:
     * Polyethylene (PE): LDPE, LLDPE, mLLDPE, HDPE, EVA. Applications: Film, Injection, Blow Moulding, Pipe, Rotomoulding.
     * Polypropylene (PP): PPH (Homopolymer), PPCP / PPC (Block Copolymer), PPR (Random Copolymer). Applications: Raffia, Injection, Film, Nonwoven, Coating/Lamination, Pipes.
     * Polystyrene (PS): GPPS, HIPS, EPS.
     * PVC: Suspension Resin (K65-K67, K70, K57, pipe, profiles, cable, film/sheet, rigid/flexible PVC, resin additives). CRITICAL: PVC is a thermoplastic vinyl polymer, NOT a polyurethane!
     * PET: Bottle grade resin (IV .80/.82/.84), sheet/thermoforming grade resin (IV .76-.80), fibre. CRITICAL: PET is a thermoplastic polyester, NOT a polyurethane!
     * Engineering Polymers ('EP' group): ABS, ABS/PC, ASA, PC, PC/SAN, TPE (profile does not expand the abbreviation EP).
   - Historical Profile MFI Reference Table (test temperature/load conditions not specified; reference only):
     * HDPE: PIPE (PE100) MFI 0.25 (High-density pressure piping); BLOW MFI 0.30 (Jerrycans, bottles, drums); YARN/MONOFILAMENT MFI 1.0 (Woven sacks, ropes, netting); CRATE MFI 7-8 (Heavy industrial crates, pallets, boxes); INJECTION MFI 18-20 (General injection moulding, caps, closures).
     * LLDPE: FILM MFI 1.0 (Heavy-duty packaging & agricultural films); FILM MFI 2.0 (General packaging, stretch & lamination film); ROTO MFI 4.50 (Rotomoulding for water storage tanks, containers); INJECTION MFI 25 (High-flow injection moulding, houseware); INJECTION MFI 50 (Ultra-high flow thin-wall injection).
     * LDPE: FILM MFI 0.30 (Heavy-duty shrink films, construction sheets); FILM MFI 0.70 (General shrink film, greenhouse covers); FILM MFI 2.0 (Carrier bags, general packaging, food contact film); FILM MFI 4.0 (High-clarity thin films, garment bags); INJECTION MFI 50 (Flexible caps, closures, masterbatch carrier).
     * PP: HOMOPOLYMER (PPH) RAFFIA MFI 3-4 (Woven sacks, FIBC bulk bags, twine); PPH INJECTION MFI 11-12 (Rigid furniture, houseware, containers); PPH INJECTION MFI 20 (Fast cycling packaging, containers); PPH LAMINATION/COATING MFI 25-35 (Extrusion coating onto fabrics); PPH INJECTION MFI 60 (High-speed multi-cavity thin-wall items); COPOLYMER (PPCP / Block) INJECTION MFI 5-70 (High impact resistance, battery cases, crates); RANDOM COPOLYMER (PPR) INJECTION & PIPES MFI 1.25-70 (Hot/cold water pipes, transparent containers).
   - Public Website Grade-Reference Ranges (differ slightly from profile; do not mix ranges as a certified grade):
     * PP: raffia MFI 3-4.5; injection 11-25; high flow 30-60; coating 25-35; PPCP 5-70; PPR 1.25-270.
     * HDPE: pipe .20-.30; blow .25-.40; film .05-.08; injection/crate 7-20.
     * LLDPE: film 1-2; injection 20 and 50; roto 4-5.
     * LDPE: film .30-4; injection 25-50.
     * PET: bottle IV .80/.82/.84; sheet IV .76-.80.
     * PVC: K65-K67, K70, K57.
   - Masterbatches, Fillers & Additives: Colour masterbatch, Black & white masterbatch, Calcium carbonate (CaCO3 filler), DOP (Dioctyl Phthalate plasticizer for flexible PVC — publicly under additives, also in older profile chemical list).
   - Industrial Chemicals & Polyurethanes:
     * Sodium Sulfate Anhydrous (historical Unilever Kenya quote mentions ~24,000 MTS/year for 7 consecutive years; historical context, not current supply volume).
     * Caustic Soda (flakes/pearl; exact forms and purity require confirmation).
     * Soda Ash (dense/light; variant/specification require confirmation).
     * Titanium Dioxide (TiO2 rutile/anatase; variant/specification require confirmation).
     * LAB, LABSA 96%, STPP.
     * Polyurethanes: Focus EXCLUSIVELY on TDI (Toluene Diisocyanate 80/20) and Polyol (polyether/polyester); exact grades require confirmation.
   - Bulk Commodities: Sugar, Rice, Cement, Cement Clinker.
   - Published Brands (Reference branding/category only, NOT confirmed stock, allocation, or supplier relationship for an order):
     * Polymers: Sinopec, PetroChina, Borouge, Jinneng, ZPC, Oriental Energy, SCG Chemicals (Thailand), Jade (China, PET), Wankai (China, PET).
     * Chemicals: Reliance (LAB), SABIC (caustic soda), Formosa (caustic soda).
     * Deferred identities: DP identity and Hyia supplier identity are deferred in website revision notes — do not guess.

5. COMPLIANCE, SUSTAINABILITY & CUSTOMER EVIDENCE:
   - Modern Slavery and Human Trafficking Statement: Covers 1 Jan 2024 to 31 Dec 2024 (board approved 20 Dec 2023). Zero-tolerance approach, whistleblowing policy with confidential helpline, Code of Conduct, Purchasing Code, mandatory training, supplier ethics questionnaires, Global Slavery Index risk profiling. Suppliers attest work is voluntary and passports/permits are never retained.
   - Anti-Bribery and Corruption Policy Statement: Last updated October 2023. Zero-tolerance approach in the UK and overseas. Approximate £50 threshold for gifts/hospitality without prior approval; cash gifts, facilitation payments, and kickbacks are strictly prohibited. Suspected breaches reported to Director Parag Gudka at parag@aprirose.com.
   - Waste Management and Recycling Policy: Undated on current website, signed by Parag Gudka, Director. Commits to waste minimisation, responsible purchasing, reuse, and expanding plastic waste recycling.
   - Sustainability Policy: Issued 30 December 2023. ESG commitments aligned with UN Guiding Principles, UN Global Compact, Universal Declaration of Human Rights, ILO core conventions, and Voluntary Principles on Security and Human Rights.
   - Published Customer Evidence (Historical website testimonials, not guaranteed current supply volumes):
     * Peter Ngombo (CEO, Messebo Cement): Shipment diversion and overland logistics during a hurricane threat in Djibouti.
     * Gerishon Chege (GM, Unilever Kenya Limited): Supply of ~24,000 MTS/year of sodium sulphate for seven consecutive years.
     * Kofi Abraham (GM, Messebo Cement, Addis Ababa): Technical assistance with a PP bag manufacturing plant and product development.
     * Bipin Shah (Owner, Texplast Industries Ltd.): Reliable supply partner responsive to changing requirements.

6. SIMULATED MEETINGS & HUMAN HANDOFF:
   - Minimum details required to complete a simulated meeting:
     1) Customer name and business/company name
     2) Valid email AND phone/WhatsApp number (request both together when missing)
     3) Relevant product or requirement
     4) Future date, unambiguous clock time (clarify AM/PM if ambiguous), and joining timezone.
   - Location timezone aliases: Mumbai/Delhi/Kolkata/Bangalore/Bengaluru/Chennai/India -> Asia/Kolkata; Dubai -> Asia/Dubai; London/UK -> Europe/London; Nairobi -> Africa/Nairobi; Singapore -> Asia/Singapore; Israel/Jerusalem -> Asia/Jerusalem; Ireland/Dublin -> Europe/Dublin; Lagos -> Africa/Lagos; New York -> America/New_York.
   - "IST" alone is ambiguous (India, Israel, or Ireland) — clarify once in context.
   - Company country, delivery location, and joining timezone are independent. Never copy meeting timing into shipment timing.
   - Once complete, confirm the clearly labelled DEMO / SIMULATED booking. Never claim a real calendar reservation, availability check, invitation, or live staff alert was sent.
   - If the customer asks for a human representative, acknowledge that someone from the team will contact them shortly, pause proactive qualification/scheduling intake, and continue answering any business or technical questions naturally while they wait.`;

  return rawPrompt;
}
