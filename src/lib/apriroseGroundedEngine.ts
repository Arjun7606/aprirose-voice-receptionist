import {
  APRIROSE_KNOWLEDGE_BASE,
  BuyerFacts,
  GroundedClaim,
  LOCATION_TIMEZONE_ALIASES,
  SimulatedMeetingState,
} from '../data/apriroseKnowledge';

export interface EngineTurnResult {
  replyText: string;
  updatedFacts: Partial<BuyerFacts>;
  factEvidence: Record<string, string>;
  updatedMeeting?: Partial<SimulatedMeetingState>;
  humanHandoffTriggered?: boolean;
  humanHandoffResumed?: boolean;
  claims: GroundedClaim[];
  askedFields: string[];
}

export function checkCommercialReadiness(facts: BuyerFacts): {
  isReady: boolean;
  score: number;
  missingCore: string[];
} {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Company Name', ok: Boolean(facts.company) },
    { label: 'Company Country', ok: Boolean(facts.companyCountry) },
    { label: 'Buyer Type', ok: Boolean(facts.buyerType) },
    { label: 'Product / Material', ok: Boolean(facts.material) },
    { label: 'Application / Grade', ok: Boolean(facts.application || facts.requestedGrade || facts.mfi) },
    { label: 'Order Quantity', ok: Boolean(facts.quantity && facts.quantity.toLowerCase() !== 'unknown') },
    { label: 'Destination / Port', ok: Boolean(facts.dischargePort || facts.destinationCountry || facts.destinationCity) },
    { label: 'Commercial Context (Terms / Monthly Vol / Timing)', ok: Boolean(facts.paymentTermsRequested || facts.monthlyVolume || facts.shipmentTiming || facts.shippingTermRequested) },
    { label: 'Contact Name', ok: Boolean(facts.contactName) },
    { label: 'Reachable Contact (Email or Phone)', ok: Boolean(facts.email || facts.phone) },
  ];

  const completed = checks.filter((c) => c.ok).length;
  const missingCore = checks.filter((c) => !c.ok).map((c) => c.label);

  return {
    isReady: missingCore.length === 0,
    score: Math.round((completed / checks.length) * 100),
    missingCore,
  };
}

export function checkSimulatedMeetingReadiness(
  facts: BuyerFacts,
  meeting: SimulatedMeetingState
): {
  canBookDemo: boolean;
  missingCriteria: string[];
} {
  const missing: string[] = [];
  if (!facts.contactName) missing.push('Customer Name');
  if (!facts.company) missing.push('Company Name');
  if (!facts.email) missing.push('Email Address');
  if (!facts.phone) missing.push('Phone / WhatsApp Number');
  if (!facts.material) missing.push('Product Requirement');
  if (!meeting.date) missing.push('Future Date');
  if (!meeting.clockTime) missing.push('Clock Time');
  if (meeting.amPm === 'ambiguous') missing.push('AM / PM Clarification');
  if (!meeting.timezone || meeting.timezone.includes('Ambiguous')) missing.push('Joining Timezone');

  return {
    canBookDemo: missing.length === 0,
    missingCriteria: missing,
  };
}

export function extractFactsAndProcessTurn(
  userText: string,
  currentFacts: BuyerFacts,
  currentMeeting: SimulatedMeetingState,
  humanPaused: boolean
): EngineTurnResult {
  const text = userText.trim();
  const lower = text.toLowerCase();
  const updatedFacts: Partial<BuyerFacts> = {};
  const factEvidence: Record<string, string> = {};
  const claims: GroundedClaim[] = [];
  const askedFields: string[] = [];
  let updatedMeeting: Partial<SimulatedMeetingState> | undefined;
  let humanHandoffTriggered = false;
  let humanHandoffResumed = false;

  const isQuestionOnly =
    /^(what|how|where|when|who|why|do you|does aprirose|can you explain|tell me about|is pvc|is pet)\b/i.test(text) &&
    !/\b(we need|we want|looking to buy|looking for|order|quote|our company|my name|i am from)\b/i.test(text);

  // 1. Check human handoff or resume
  if (/\b(speak to a human|talk to a person|real person|human agent|transfer me to sales|connect me to a human|live representative)\b/i.test(lower)) {
    humanHandoffTriggered = true;
  }
  if (humanPaused && /\b(resume|continue qualification|let's continue|keep going with the quote)\b/i.test(lower)) {
    humanHandoffResumed = true;
  }

  // 2. Extract Email & Phone
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) {
    updatedFacts.email = emailMatch[0];
    factEvidence.email = emailMatch[0];
  }

  const phoneMatch = text.match(/(?:\+\d{1,3}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?\d{3,5}[\s-]?\d{3,4}[\s-]?\d{3,4}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 8) {
    updatedFacts.phone = phoneMatch[0].trim();
    factEvidence.phone = phoneMatch[0].trim();
  }

  // 3. Extract Contact Name & Company
  const nameMatch = text.match(/(?:my name is|i'm|i am|this is|contact name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    if (!/^(looking|calling|interested|from|based|asking|wondering|unsure)$/i.test(candidate.split(' ')[0])) {
      updatedFacts.contactName = candidate;
      factEvidence.contactName = nameMatch[0];
    }
  }

  const companyMatch = text.match(
    /(?:from|with|at|company is|company name is|representing|we are)\s+([A-Z0-9][A-Za-z0-9\s&.-]{2,35}?(?:Ltd|Limited|Inc|Corp|Plastics|Polymers|Industries|Packaging|Trading|Manufacturing|Group|Chemicals|Enterprise|Co|PLC|LLC)\.?)/i
  );
  if (companyMatch) {
    updatedFacts.company = companyMatch[1].trim();
    factEvidence.company = companyMatch[0];
  }

  // 4. Extract Buyer Type
  if (/\b(manufacturer|manufacturing|we manufacture|we produce|we mould|factory|plant)\b/i.test(lower)) {
    updatedFacts.buyerType = 'Manufacturer';
    factEvidence.buyerType = 'manufacturing / production activity stated';
  } else if (/\b(converter|converting|film extruder|extrusion plant|injection moulder)\b/i.test(lower)) {
    updatedFacts.buyerType = 'Converter';
    factEvidence.buyerType = 'converting activity stated';
  } else if (/\b(distributor|trader|trading company|reseller|wholesaler)\b/i.test(lower)) {
    updatedFacts.buyerType = 'Distributor / Trader';
    factEvidence.buyerType = 'distributor / trader role stated';
  } else if (/\b(end user|end-user)\b/i.test(lower)) {
    updatedFacts.buyerType = 'End User';
    factEvidence.buyerType = 'end user stated';
  }

  // 5. Extract Countries & Ports
  const knownPorts = [
    { pattern: /\bmombasa\b/i, port: 'Mombasa', country: 'Kenya' },
    { pattern: /\btamatave\b/i, port: 'Tamatave', country: 'Madagascar' },
    { pattern: /\blagos|apapa|tin can\b/i, port: 'Lagos', country: 'Nigeria' },
    { pattern: /\bchittagong\b/i, port: 'Chittagong', country: 'Bangladesh' },
    { pattern: /\bnhava sheva|jnpt\b/i, port: 'Nhava Sheva', country: 'India' },
    { pattern: /\bdar es salaam\b/i, port: 'Dar es Salaam', country: 'Tanzania' },
    { pattern: /\bdjibouti\b/i, port: 'Djibouti', country: 'Djibouti' },
    { pattern: /\bjebel ali\b/i, port: 'Jebel Ali', country: 'United Arab Emirates' },
    { pattern: /\bdurban\b/i, port: 'Durban', country: 'South Africa' },
    { pattern: /\bkarachi\b/i, port: 'Karachi', country: 'Pakistan' },
    { pattern: /\bsantos\b/i, port: 'Santos', country: 'Brazil' },
    { pattern: /\bcallao\b/i, port: 'Callao', country: 'Peru' },
  ];

  for (const p of knownPorts) {
    if (p.pattern.test(text)) {
      updatedFacts.dischargePort = p.port;
      factEvidence.dischargePort = p.port;
      if (!currentFacts.destinationCountry) {
        updatedFacts.destinationCountry = p.country;
      }
    }
  }

  const countriesList = [
    'United Kingdom', 'UK', 'Spain', 'Portugal', 'Greece', 'Germany', 'France',
    'United Arab Emirates', 'UAE', 'India', 'China', 'Pakistan', 'Bangladesh',
    'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Burundi', 'Mozambique', 'Zambia',
    'Zimbabwe', 'Malawi', 'Madagascar', 'South Africa', 'Ethiopia', 'Brazil', 'Peru', 'Nigeria', 'Egypt'
  ];
  for (const c of countriesList) {
    const regex = new RegExp(`\\b(?:based in|from|in|to)\\s+${c}\\b`, 'i');
    if (regex.test(text)) {
      if (/\b(based in|from|company in)\b/i.test(text)) {
        updatedFacts.companyCountry = c === 'UK' ? 'United Kingdom' : c === 'UAE' ? 'United Arab Emirates' : c;
        factEvidence.companyCountry = c;
      } else if (/\b(ship to|deliver to|destination|port in)\b/i.test(text)) {
        updatedFacts.destinationCountry = c === 'UK' ? 'United Kingdom' : c === 'UAE' ? 'United Arab Emirates' : c;
        factEvidence.destinationCountry = c;
      } else if (!currentFacts.companyCountry) {
        updatedFacts.companyCountry = c === 'UK' ? 'United Kingdom' : c === 'UAE' ? 'United Arab Emirates' : c;
        factEvidence.companyCountry = c;
      }
    }
  }

  // 6. Extract Material / Product / Application / Grade (only when not a purely general question)
  if (!isQuestionOnly) {
    const materialMatches: { regex: RegExp; name: string }[] = [
      { regex: /\b(pp raffia|polypropylene raffia)\b/i, name: 'PP (Polypropylene) — Raffia' },
      { regex: /\b(pph|pp homopolymer)\b/i, name: 'PP Homopolymer (PPH)' },
      { regex: /\b(ppcp|pp copolymer|pp block)\b/i, name: 'PP Copolymer (PPCP)' },
      { regex: /\b(ppr|pp random)\b/i, name: 'PP Random Copolymer (PPR)' },
      { regex: /\b(polypropylene|\bpp\b)\b/i, name: 'Polypropylene (PP)' },
      { regex: /\b(hdpe|high density polyethylene)\b/i, name: 'HDPE' },
      { regex: /\b(lldpe|linear low density polyethylene)\b/i, name: 'LLDPE' },
      { regex: /\b(mlldpe|metallocene)\b/i, name: 'mLLDPE' },
      { regex: /\b(ldpe|low density polyethylene)\b/i, name: 'LDPE' },
      { regex: /\b(polyethylene|\bpe\b)\b/i, name: 'Polyethylene (PE)' },
      { regex: /\b(pvc|polyvinyl chloride|suspension resin)\b/i, name: 'PVC' },
      { regex: /\b(pet|bottle grade pet|sheet grade pet)\b/i, name: 'PET Resin' },
      { regex: /\b(gpps|hips|eps|polystyrene)\b/i, name: 'Polystyrene (PS)' },
      { regex: /\b(caustic soda)\b/i, name: 'Caustic Soda' },
      { regex: /\b(sodium sulfate|sodium sulphate)\b/i, name: 'Sodium Sulfate Anhydrous' },
      { regex: /\b(soda ash)\b/i, name: 'Soda Ash' },
      { regex: /\b(titanium dioxide|tio2)\b/i, name: 'Titanium Dioxide (TiO2)' },
      { regex: /\b(tdi|toluene diisocyanate)\b/i, name: 'TDI (Toluene Diisocyanate)' },
      { regex: /\b(polyol)\b/i, name: 'Polyol' },
      { regex: /\b(labsa|stpp|\bdop\b)\b/i, name: 'Industrial Chemicals (LABSA/STPP/DOP)' },
      { regex: /\b(masterbatch|calcium carbonate)\b/i, name: 'Masterbatches & Fillers' },
    ];

    for (const m of materialMatches) {
      if (m.regex.test(text)) {
        updatedFacts.material = m.name;
        factEvidence.material = text.match(m.regex)?.[0] || m.name;
        break;
      }
    }

    const appMatches = [
      'Raffia', 'Woven Sacks', 'FIBC Bulk Bags', 'Injection Moulding', 'Blow Moulding',
      'Film', 'Shrink Film', 'Stretch Film', 'Rotomoulding', 'Pipe', 'PE100 Pipe',
      'Crate', 'Bottle', 'Thermoforming', 'Cable', 'Profiles', 'Nonwoven', 'Lamination / Coating'
    ];
    for (const app of appMatches) {
      if (new RegExp(`\\b${app.replace('/', '|')}\\b`, 'i').test(text)) {
        updatedFacts.application = app;
        factEvidence.application = app;
        break;
      }
    }

    const mfiMatch = text.match(/\bmfi\s*(?:of|around|is|:)?\s*(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)/i);
    if (mfiMatch) {
      updatedFacts.mfi = `${mfiMatch[1]} g/10min`;
      factEvidence.mfi = mfiMatch[0];
    }

    const brandMatches = ['Sinopec', 'PetroChina', 'Borouge', 'Jinneng', 'ZPC', 'Oriental Energy', 'SCG Chemicals', 'Jade', 'Wankai', 'Reliance', 'SABIC', 'Formosa'];
    for (const b of brandMatches) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
        updatedFacts.preferredProducer = b;
        factEvidence.preferredProducer = b;
      }
    }
  }

  // 7. Extract Order Quantity vs Monthly Volume (Keep strictly independent; never convert FCL to MT!)
  const monthlyMatch = text.match(/(\d+(?:,\d+)?(?:\.\d+)?\s*(?:MT|MTS|tonnes|tons|FCL|containers|KG))\s*(?:per\s*month|\/\s*month|monthly|a\s*month)/i);
  if (monthlyMatch) {
    updatedFacts.monthlyVolume = `${monthlyMatch[1].toUpperCase()} / month`;
    factEvidence.monthlyVolume = monthlyMatch[0];
  }

  const qtyRegex = /\b(\d+(?:,\d+)?(?:\.\d+)?\s*(?:MT|MTS|metric\s*tons|tonnes|tons|FCL|containers|KG))\b/gi;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = qtyRegex.exec(text)) !== null) {
    const fullSnippet = text.slice(Math.max(0, qMatch.index - 15), Math.min(text.length, qMatch.index + qMatch[0].length + 20));
    if (!/per\s*month|\/\s*month|monthly|a\s*month/i.test(fullSnippet)) {
      updatedFacts.quantity = qMatch[1].replace(/\b(metric\s*tons|tonnes|tons|mts)\b/i, 'MT').toUpperCase();
      factEvidence.quantity = qMatch[0];
      break;
    }
  }

  // 8. Extract Payment Terms & Shipping Terms (Incoterms)
  const paymentMatch = text.match(/\b(T\/T|TT|Telegraphic Transfer|LC|L\/C|Letter of Credit|DA|D\/A|OA|O\/A|Open Account|CAD)\b/i);
  if (paymentMatch) {
    updatedFacts.paymentTermsRequested = paymentMatch[1].toUpperCase();
    factEvidence.paymentTermsRequested = paymentMatch[0];
  }

  const incotermMatch = text.match(/\b(CIF|CFR|FOB|EXW|DAP|DDP|FCA)\b/i);
  if (incotermMatch) {
    updatedFacts.shippingTermRequested = incotermMatch[1].toUpperCase();
    factEvidence.shippingTermRequested = incotermMatch[0];
  }

  // 9. Extract Meeting Scheduling Intent & Components
  const isMeetingCancel = /\b(cancel|call off)\s+(?:the\s+|our\s+)?(?:meeting|call|appointment|booking)\b/i.test(lower);
  const isMeetingMention =
    /\b(schedule|book|arrange|set up|meeting|call on|tomorrow|monday|tuesday|wednesday|thursday|friday|\d{1,2}(?::\d{2})?\s*(?:am|pm)|930|1030|ist|gmt|utc)\b/i.test(lower);

  if (isMeetingCancel) {
    updatedMeeting = {
      status: 'cancelled',
      validationNotes: ['Customer explicitly cancelled the simulated meeting. No cancellation fees or penalties apply in simulation.'],
    };
  } else if (isMeetingMention) {
    const nextMeeting: SimulatedMeetingState = {
      ...currentMeeting,
      status: currentMeeting.status === 'demo_booked' ? 'demo_booked' : 'collecting',
      validationNotes: [],
    };

    const dateMatch = text.match(/\b(tomorrow|today|monday|tuesday|wednesday|thursday|friday|next\s+\w+|\d{1,2}\s+(?:nov|november|oct|october|dec|december)(?:\s+\d{4})?)\b/i);
    if (dateMatch) {
      const rawDate = dateMatch[1].toLowerCase();
      if (rawDate === 'monday' || rawDate === 'tomorrow' || rawDate === 'today' || /^2\s+nov/.test(rawDate)) {
        nextMeeting.date = 'Monday, 2 Nov 2026';
      } else if (rawDate === 'tuesday' || /^3\s+nov/.test(rawDate)) {
        nextMeeting.date = 'Tuesday, 3 Nov 2026';
      } else if (rawDate === 'wednesday' || /^4\s+nov/.test(rawDate)) {
        nextMeeting.date = 'Wednesday, 4 Nov 2026';
      } else if (rawDate === 'thursday' || /^5\s+nov/.test(rawDate)) {
        nextMeeting.date = 'Thursday, 5 Nov 2026';
      } else if (rawDate === 'friday' || /^6\s+nov/.test(rawDate)) {
        nextMeeting.date = 'Friday, 6 Nov 2026';
      } else {
        nextMeeting.date = dateMatch[1];
      }
    }

    const timeWithAmPm = text.match(/\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/i);
    const compactTime = text.match(/\b(930|1030|1130|130|230|330|430)\b/);
    if (timeWithAmPm) {
      nextMeeting.clockTime = timeWithAmPm[1];
      nextMeeting.amPm = timeWithAmPm[2].toUpperCase() as 'AM' | 'PM';
    } else if (compactTime) {
      const raw = compactTime[1];
      nextMeeting.clockTime = raw.length === 3 ? `${raw[0]}:${raw.slice(1)}` : `${raw.slice(0, 2)}:${raw.slice(2)}`;
      nextMeeting.amPm = 'ambiguous';
      nextMeeting.validationNotes.push(`Clock "${nextMeeting.clockTime}" needs AM/PM clarification.`);
    }

    // Check timezone aliases and IST ambiguity rule
    for (const [alias, iana] of Object.entries(LOCATION_TIMEZONE_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
        nextMeeting.timezone = iana;
        nextMeeting.locationLabel = alias.charAt(0).toUpperCase() + alias.slice(1);
        break;
      }
    }

    if (/\bist\b/i.test(lower) && !nextMeeting.timezone) {
      nextMeeting.timezone = 'Ambiguous (IST: India / Israel / Ireland)';
      nextMeeting.validationNotes.push('IST alone can mean India, Israel, or Ireland — clarify once.');
    }

    const mergedFacts = { ...currentFacts, ...updatedFacts };
    const readiness = checkSimulatedMeetingReadiness(mergedFacts, nextMeeting);
    if (readiness.canBookDemo) {
      nextMeeting.status = 'demo_booked';
      nextMeeting.confirmedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updatedMeeting = nextMeeting;
  }

  // 10. Formulate Grounded Spoken Reply based on specific Knowledge Base topics + Qualification state
  const mergedFacts: BuyerFacts = { ...currentFacts, ...updatedFacts };
  const mergedMeeting: SimulatedMeetingState = updatedMeeting
    ? ({ ...currentMeeting, ...updatedMeeting } as SimulatedMeetingState)
    : currentMeeting;

  let replyText = '';

  // Specific Factual & Boundary Answers first!
  if (humanHandoffTriggered) {
    replyText =
      'Certainly. Someone from the Aprirose commercial team will contact you shortly, and I have paused proactive qualification and scheduling questions in the meantime. Please feel free to ask any product, technical, or company questions while you wait.';
    return {
      replyText,
      updatedFacts,
      factEvidence,
      updatedMeeting,
      humanHandoffTriggered,
      claims,
      askedFields,
    };
  }

  if (/\b(turnover|revenue|financial|62\s*m|63\s*m|100\s*m|how big|scale|how many employees|headcount|volume)\b/i.test(lower)) {
    replyText =
      'Regarding Aprirose scale and financials: for 2025, our source records have an unresolved difference between an earlier owner-confirmed consolidated group turnover of US$62 million and the latest public website 2025 revenue figure of US$63 million, which our team can confirm by reporting basis. Historically, in 2022 polymer volume reached 70,000 MTS with US$79 million turnover, and an undated company profile snapshot also references 80,000 MT annual polymer volume, 25,000 MT chemical volume, 50 employees, and US$100 million turnover.';
    claims.push(
      {
        id: `claim-${Date.now()}-1`,
        claimText: '2025 US$62M consolidated group turnover vs US$63M public website revenue requires entity/reporting-basis confirmation.',
        sourceId: 'latestWebsiteReference / section-09',
        evidenceQuote: 'Earlier owner-confirmed 2025 consolidated group turnover US$62M versus latest public 2025 revenue US$63M. Confirm entity/basis; do not choose one as settled.',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: `claim-${Date.now()}-2`,
        claimText: 'In 2022, historical polymer volume was 70,000 MTS with US$79m turnover; 80,000 MT polymer, 25,000 MT chemical, 50 employees and US$100m turnover are undated profile snapshots.',
        sourceId: 'companyProfile / section-02-06',
        evidenceQuote: '2022: 70,000 MTS. Historical polymer volume; historical turnover shown as US$79m. Undated scale snapshot: 80,000 MT annual polymer volume, 25,000 MT annual chemical volume, 50 employees, US$100 million consolidated turnover.',
        timestamp: new Date().toLocaleTimeString(),
      }
    );
  } else if (/\b(fax)\b/i.test(lower)) {
    replyText =
      'Aprirose no longer uses fax numbers. You can reach our London head office directly by phone at +44 20 8951 0377 or by email at parag@aprirose.com, or let me know which regional office you need.';
    claims.push({
      id: `claim-${Date.now()}-fax`,
      claimText: 'Fax is no longer used by Aprirose; direct enquiries to phone or email.',
      sourceId: 'legacyReference / section-05-12',
      evidenceQuote: 'NO FAX: Fax numbers are no longer used by Aprirose. If asked for a fax, state that fax is no longer in use and provide direct phone or email.',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (/\b(polyurethane|is pvc a polyurethane|is pet a polyurethane)\b/i.test(lower)) {
    replyText =
      'In Aprirose’s portfolio, polyurethanes focus exclusively on TDI (Toluene Diisocyanate) and Polyol, whose exact grades require commercial confirmation. Please note that PVC is a thermoplastic vinyl polymer and PET is a thermoplastic polyester—neither is a polyurethane.';
    claims.push({
      id: `claim-${Date.now()}-pu`,
      claimText: 'Polyurethanes focus exclusively on TDI and Polyol; PVC is a thermoplastic vinyl polymer and PET is a thermoplastic polyester.',
      sourceId: 'legacyReference / section-12',
      evidenceQuote: 'NOTE: PVC is a thermoplastic vinyl polymer, NOT a polyurethane! NOTE: PET is a thermoplastic polyester, NOT a polyurethane! Polyurethanes focus exclusively on TDI and Polyol.',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (/\b(office|offices|contact|address|phone number|london|dubai|nairobi|mumbai|korea|incheon|vietnam|hanoi)\b/i.test(lower) && isQuestionOnly) {
    replyText =
      'Our public contact records cover six offices: our London Head Office in Edgware (+44 20 8951 0377, parag@aprirose.com), our Dubai Branch in JLT (+971 4 432 8538, bijal@aprirose.com), our Nairobi Associate & Regional Hub at Deluxe Inks (+254 722 389137, esther@aprirose.com), Mumbai (+91 97698 68175, kartik@aprirose.com), Incheon in South Korea (+82 10 9939 0390, skbahn@aprirose.com), and Ha Noi in Vietnam (+84 966 580 914, katy@aprirose.com).';
    claims.push({
      id: `claim-${Date.now()}-offices`,
      claimText: 'Public contact records list London HQ, Dubai Branch, Nairobi Hub, Mumbai, Incheon, and Ha Noi offices.',
      sourceId: 'offices / section-05',
      evidenceQuote: 'London Head office (+44 20 8951 0377, parag@aprirose.com), Dubai Branch (+971 4 432 8538, bijal@aprirose.com), Nairobi (+254 722 389137, esther@aprirose.com), Mumbai (+91 97698 68175, kartik@aprirose.com), Incheon (+82 10 9939 0390, skbahn@aprirose.com), Ha Noi (+84 966 580 914, katy@aprirose.com).',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (/\b(warehouse|stock in|facilities)\b/i.test(lower)) {
    replyText =
      'Our historical company profile references an associate company and warehouse in Nairobi, Kenya, and a Djibouti warehouse partnership established in 2022 to serve the Ethiopian market, while France, Portugal, and Vietnam are listed as representatives rather than warehouses. Specific live stock and storage availability for an order always require confirmation with our commercial team.';
    claims.push({
      id: `claim-${Date.now()}-wh`,
      claimText: 'Profile maps an associate company and warehouse in Kenya and a warehouse in Djibouti; France, Portugal and Vietnam are representatives.',
      sourceId: 'companyProfile / section-05-06',
      evidenceQuote: 'Historical warehousing: the profile lists an associate company and warehouse in Kenya, and a Djibouti warehouse partnership serving Ethiopia. France, Portugal and Vietnam are representatives, not verified warehouse locations.',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (/\b(modern slavery|bribery|anti-bribery|compliance|sustainability|waste|policy|esg)\b/i.test(lower)) {
    replyText =
      'Aprirose publishes four compliance and sustainability statements: our Modern Slavery Statement covering 2024 (board-approved December 2023), our Anti-Bribery and Corruption Policy (updated October 2023 with a zero-tolerance stance, no cash gifts or facilitation payments, and an approximate £50 hospitality threshold), our Waste Management and Recycling Policy, and our Sustainability Policy issued December 2023.';
    claims.push({
      id: `claim-${Date.now()}-comp`,
      claimText: 'Aprirose publishes Modern Slavery (2024), Anti-Bribery (Oct 2023), Waste Management, and Sustainability (Dec 2023) policy statements.',
      sourceId: 'compliance / section-07',
      evidenceQuote: 'Modern Slavery and Human Trafficking (1 Jan 2024 to 31 Dec 2024); Anti-Bribery and Corruption Policy Statement (Last updated October 2023); Waste Management and Recycling Policy; Sustainability Policy (30 December 2023).',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (/\b(brand|brands|producers|suppliers|sinopec|borouge|jinneng|sabic|formosa|reliance)\b/i.test(lower) && isQuestionOnly) {
    replyText =
      'Our published polymer brands include Sinopec, PetroChina, Borouge, Jinneng, ZPC, Oriental Energy, SCG Chemicals, and Jade and Wankai for PET, alongside chemical brands Reliance for LAB and SABIC and Formosa for caustic soda. These are published brand references rather than confirmed live stock or allocation for a specific order, which our commercial team can review for your requirement.';
    claims.push({
      id: `claim-${Date.now()}-brands`,
      claimText: 'Published brands include Sinopec, PetroChina, Borouge, Jinneng, ZPC, Oriental Energy, SCG Chemicals, Jade, Wankai, Reliance, SABIC, and Formosa as reference categories.',
      sourceId: 'latestWebsiteReference / section-09',
      evidenceQuote: 'Published polymer brands: Sinopec, PetroChina, Borouge, Jinneng, ZPC, Oriental Energy, SCG Chemicals (Thailand), Jade (China, PET), Wankai (China, PET). Published chemical brands: Reliance (LAB), SABIC (caustic soda), Formosa (caustic soda).',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (/\b(mfi|melt flow|grade|pe100|raffia|injection|rotomoulding|blow moulding)\b/i.test(lower) && isQuestionOnly) {
    replyText =
      'From our reference guides, for PP Raffia the profile lists PPH MFI 3 to 4 (3 to 4.5 on the public site), PP Injection lists MFI 11 to 12, 20, or high-flow 30 to 60, and PPCP Block Copolymer covers MFI 5 to 70. For HDPE, PE100 Pipe is referenced at MFI 0.25 (public range 0.20 to 0.30) and Blow Moulding at 0.30. Because test conditions and certifications depend on the exact manufacturer TDS, our team will confirm the specific grade for your application.';
    claims.push({
      id: `claim-${Date.now()}-mfi`,
      claimText: 'Reference MFI ranges include PP Raffia 3-4 (public 3-4.5), PP Injection 11-12/20/60, HDPE PE100 Pipe 0.25, and Blow 0.30; exact suitability requires manufacturer TDS.',
      sourceId: 'products / section-03-09',
      evidenceQuote: 'The profile figures above are retained as supplied. Exact grade selection, food-contact status, pressure suitability and other regulatory or performance requirements need the manufacturer’s technical documentation.',
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  // Handle Simulated Meeting Flow if active
  if (updatedMeeting) {
    if (mergedMeeting.status === 'cancelled') {
      replyText =
        'I have marked the simulated demo meeting as cancelled in our demo CRM. Your enquiry details remain saved—please let me know if you would like to pick a new time or discuss your material requirements.';
      return { replyText, updatedFacts, factEvidence, updatedMeeting, claims, askedFields };
    }

    if (mergedMeeting.status === 'demo_booked') {
      replyText = `Your **SIMULATED / DEMO MEETING** is now confirmed and saved as "Demo booked" in the demo CRM for ${mergedMeeting.date} at ${mergedMeeting.clockTime} ${mergedMeeting.amPm !== 'resolved_24h' ? mergedMeeting.amPm : ''} (${mergedMeeting.timezone}) with ${mergedFacts.contactName} from ${mergedFacts.company}. Please note this is a simulated booking for demonstration—no real calendar invitation or live staff alert has been dispatched.`;
      return { replyText, updatedFacts, factEvidence, updatedMeeting, claims, askedFields };
    }

    const meetingCheck = checkSimulatedMeetingReadiness(mergedFacts, mergedMeeting);
    const missingBatch = meetingCheck.missingCriteria.slice(0, 3);
    askedFields.push(...missingBatch);
    const prefix = replyText ? `${replyText} ` : 'I would be glad to set up that simulated sales meeting for you. ';
    replyText = `${prefix}To complete the demo booking, could you please share your ${missingBatch.join(', ')}?`;
    return { replyText, updatedFacts, factEvidence, updatedMeeting, claims, askedFields };
  }

  // If humanPaused is active (and not resumed), don't tack on qualification intake
  if (humanPaused && !humanHandoffResumed) {
    if (!replyText) {
      replyText =
        'Thank you—I have noted those details on your enquiry record for our sales team. Please let me know if you have any other questions about Aprirose products or operations while you wait.';
    }
    return { replyText, updatedFacts, factEvidence, updatedMeeting, claims, askedFields };
  }

  // Natural Qualification Progression (only if not purely a technical/company question, or if buyer facts were provided)
  const readiness = checkCommercialReadiness(mergedFacts);
  const newlyProvidedCount = Object.keys(updatedFacts).length;

  if (!replyText) {
    if (newlyProvidedCount > 0) {
      const ackParts: string[] = [];
      if (updatedFacts.material) ackParts.push(updatedFacts.material);
      if (updatedFacts.quantity) ackParts.push(updatedFacts.quantity);
      if (updatedFacts.dischargePort || updatedFacts.destinationCountry) {
        ackParts.push(`for ${updatedFacts.dischargePort || updatedFacts.destinationCountry}`);
      }
      if (updatedFacts.company) ackParts.push(`from ${updatedFacts.company}`);

      const ackSummary = ackParts.length > 0 ? `Thank you—I have noted your requirement for ${ackParts.join(' ')}. ` : 'Thank you, I have recorded those details. ';

      if (readiness.isReady) {
        replyText = `${ackSummary}We now have a complete buyer qualification summary for our commercial team, including your product specification, quantity, destination, commercial context, and contact details. Would you like to schedule a simulated sales meeting with our team, or is there any specific grade or producer preference you would like to add?`;
      } else {
        const nextQuestions = readiness.missingCore.slice(0, 2);
        askedFields.push(...nextQuestions);
        replyText = `${ackSummary}To help our commercial team prepare an accurate review, could you also share your ${nextQuestions.join(' and ')}?`;
      }
    } else {
      replyText =
        'Welcome to Aprirose Trading Limited. I can help you with a polymer or chemical quotation, share details on our grades, producers, global offices, and compliance policies, or set up a simulated meeting with our commercial team. How can I help you today?';
    }
  }

  return {
    replyText,
    updatedFacts,
    factEvidence,
    updatedMeeting,
    humanHandoffTriggered,
    humanHandoffResumed,
    claims,
    askedFields,
  };
}
