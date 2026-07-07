export type ExperienceItem = {
  id: string;
  company: string;
  title: string;
  from: string;
  until: string;
  details: string;
};

export type EducationItem = {
  id: string;
  institution: string;
  degree: string;
  from: string;
  until: string;
};

export type CertificationItem = {
  id: string;
  name: string;
  issuer: string;
  from: string;
  until: string;
};

export type LicenseItem = {
  id: string;
  name: string;
  issuer: string;
  from: string;
  until: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  from: string;
  until: string;
  details: string;
};

export type CertificationsPayload = {
  certifications: CertificationItem[];
  licenses: LicenseItem[];
};

export type PersonalInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  portfolio: string;
};

export type StructuredProfile = {
  personal: PersonalInfo;
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  licenses: LicenseItem[];
  skills: string[];
  projects: ProjectItem[];
  additionalInfo: string;
  pendingItems: PendingProfileItem[];
};

export type PendingProfileItem = {
  id: string;
  text: string;
  type: 'skill' | 'certification' | 'license' | 'experience' | 'education' | 'general';
  status: 'pending' | 'confirmed' | 'dismissed';
  createdAt: string;
  jobTitle?: string;
  company?: string;
};

const PENDING_JSON_MARKER = '---APPLYMATIC_PENDING---';

export function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const emptyExperience = (): ExperienceItem => ({
  id: uid(),
  company: '',
  title: '',
  from: '',
  until: '',
  details: '',
});

export const emptyEducation = (): EducationItem => ({
  id: uid(),
  institution: '',
  degree: '',
  from: '',
  until: '',
});

export const emptyCertification = (): CertificationItem => ({
  id: uid(),
  name: '',
  issuer: '',
  from: '',
  until: '',
});

export const emptyLicense = (): LicenseItem => ({
  id: uid(),
  name: '',
  issuer: '',
  from: '',
  until: '',
});

export const emptyProject = (): ProjectItem => ({
  id: uid(),
  name: '',
  from: '',
  until: '',
  details: '',
});

export function initialStructuredProfile(email = ''): StructuredProfile {
  return {
    personal: {
      firstName: '',
      lastName: '',
      email,
      phone: '',
      address: '',
      linkedin: '',
      portfolio: '',
    },
    experience: [emptyExperience()],
    education: [emptyEducation()],
    certifications: [emptyCertification()],
    licenses: [emptyLicense()],
    skills: [''],
    projects: [emptyProject()],
    additionalInfo: '',
    pendingItems: [],
  };
}

export function parseAdditionalInfoField(raw: string): { notes: string; pendingItems: PendingProfileItem[] } {
  const trimmed = (raw || '').trim();
  const idx = trimmed.indexOf(PENDING_JSON_MARKER);
  if (idx === -1) return { notes: trimmed, pendingItems: [] };

  const notes = trimmed.slice(0, idx).trim();
  const json = trimmed.slice(idx + PENDING_JSON_MARKER.length).trim();

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return { notes: trimmed, pendingItems: [] };
    return {
      notes,
      pendingItems: parsed.filter((p) => p && p.status === 'pending'),
    };
  } catch {
    return { notes: trimmed, pendingItems: [] };
  }
}

export function formatAdditionalInfoField(notes: string, pendingItems: PendingProfileItem[]): string {
  const pending = (pendingItems || []).filter((p) => p.status === 'pending');
  const cleanNotes = notes.trim();
  if (!pending.length) return cleanNotes;
  return `${cleanNotes}\n\n${PENDING_JSON_MARKER}\n${JSON.stringify(pending)}`.trim();
}

export function classifyMatchSuggestion(text: string): PendingProfileItem['type'] {
  const t = text.toLowerCase();
  if (/certif|credential|cissp|comptia|pmp\b|aws certified|azure certified/.test(t)) return 'certification';
  if (/licen[sc]e|registered|registration/.test(t)) return 'license';
  if (/skill|technolog|proficien|tool|software|framework|programming|language|stack|platform|knowledge of|experience with|familiar with|learn|highlight|add.*skill/.test(t)) {
    return 'skill';
  }
  if (/degree|education|bachelor|master|diploma|university|college/.test(t)) return 'education';
  if (/experience|years|leadership|manage|demonstrate|background in|history of|project/.test(t)) return 'experience';
  return 'general';
}

export function extractItemLabel(text: string, type: PendingProfileItem['type']): string {
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted?.[1]) return quoted[1].trim();

  const skillMatch = text.match(
    /(?:add|highlight|include|mention|obtain|get|learn|develop)\s+(?:the\s+)?([A-Za-z0-9+#./\s-]{2,40}?)(?:\s+(?:skill|certification|experience|to your profile)|[.,]|$)/i
  );
  if (skillMatch?.[1]) return skillMatch[1].trim();

  if (type === 'certification' || type === 'license') {
    const certMatch = text.match(/(?:certification|certificate|license|credential)\s+(?:in|for)?\s*([A-Za-z0-9+#./\s-]{2,40})/i);
    if (certMatch?.[1]) return certMatch[1].trim();
  }

  const firstSentence = text.split(/[.—]/)[0]?.trim() || text.trim();
  return firstSentence.length > 72 ? `${firstSentence.slice(0, 72)}…` : firstSentence;
}

export function suggestionSupportsHaveThis(type: PendingProfileItem['type']): boolean {
  return type === 'skill' || type === 'certification' || type === 'license';
}

/** Normalize suggestion text for overlap checks (recalc deduping). */
export function normalizeSuggestionKey(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/^[-•\d.]+\s*/, '')
    .replace(/[^\w\s+#./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUGGESTION_STOP_WORDS = new Set([
  'the', 'a', 'an', 'to', 'your', 'profile', 'resume', 'add', 'highlight', 'mention',
  'experience', 'with', 'and', 'or', 'for', 'in', 'on', 'of', 'that', 'this', 'from',
  'into', 'using', 'about', 'more', 'any', 'all', 'job', 'role', 'skills', 'skill',
]);

function extractSignificantTokens(text: string): string[] {
  return normalizeSuggestionKey(text)
    .split(' ')
    .filter((w) => w.length > 2 && !SUGGESTION_STOP_WORDS.has(w));
}

/** True when two suggestion strings refer to the same gap (fuzzy). */
export function suggestionsOverlap(a: string, b: string): boolean {
  const na = normalizeSuggestionKey(a);
  const nb = normalizeSuggestionKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const labelA = normalizeSuggestionKey(extractItemLabel(a, classifyMatchSuggestion(a)));
  const labelB = normalizeSuggestionKey(extractItemLabel(b, classifyMatchSuggestion(b)));
  if (labelA && labelB && (labelA === labelB || na.includes(labelB) || nb.includes(labelA))) {
    return true;
  }

  const tokensA = extractSignificantTokens(a);
  const tokensB = extractSignificantTokens(b);
  if (tokensA.length && tokensB.length) {
    const shared = tokensA.filter((token) =>
      tokensB.some((other) => other === token || other.includes(token) || token.includes(other))
    );
    const threshold = Math.min(2, Math.min(tokensA.length, tokensB.length));
    if (shared.length >= threshold) return true;
  }

  return false;
}

export function filterAddressedSuggestions(
  suggestions: string[],
  addressed: string[]
): string[] {
  if (!addressed?.length) return suggestions;
  return suggestions.filter(
    (tip) => !addressed.some((resolved) => suggestionsOverlap(tip, resolved))
  );
}

export function formatPendingItemsForMatch(pendingItems: PendingProfileItem[]): string {
  const pending = (pendingItems || []).filter((p) => p.status === 'pending');
  if (!pending.length) return '';
  return pending
    .map((p) => `- [${p.type}] ${extractItemLabel(p.text, p.type)}`)
    .join('\n');
}

/** Profile fields sent to match/tailor AI, including planned additions from pending items. */
export function buildMatchProfilePayload(profileRow: Record<string, unknown>) {
  const structured = profileRowToStructured(profileRow, String(profileRow.email || ''));
  const flat = flattenProfileForAi(profileRow) as Record<string, unknown>;

  return {
    name:
      String(flat.full_name || '').trim() ||
      `${String(flat.first_name || '').trim()} ${String(flat.last_name || '').trim()}`.trim(),
    email: String(flat.email || ''),
    phone: String(flat.phone || ''),
    summary: String(flat.summary || ''),
    experience: String(flat.experience || '').slice(0, 6000),
    education: String(flat.education || '').slice(0, 2000),
    skills: String(flat.skills || '').slice(0, 1500),
    projects: String(flat.projects || '').slice(0, 2000),
    certifications: String(flat.certifications || '').slice(0, 1500),
    planned_profile_additions: formatPendingItemsForMatch(structured.pendingItems),
  };
}

export function addPendingSuggestion(
  profile: StructuredProfile,
  text: string,
  meta?: { jobTitle?: string; company?: string }
): StructuredProfile {
  const trimmed = text.trim();
  if (!trimmed) return profile;

  const type = classifyMatchSuggestion(trimmed);
  const alreadyPending = profile.pendingItems.some(
    (item) => item.status === 'pending' && item.text.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyPending) return profile;

  const item: PendingProfileItem = {
    id: uid(),
    text: trimmed,
    type,
    status: 'pending',
    createdAt: new Date().toISOString(),
    jobTitle: meta?.jobTitle,
    company: meta?.company,
  };

  return { ...profile, pendingItems: [...profile.pendingItems, item] };
}

export function addSkillToProfile(profile: StructuredProfile, skillName: string): StructuredProfile {
  const skill = skillName.trim();
  if (!skill) return profile;

  const existing = profile.skills.map((s) => s.trim().toLowerCase());
  if (existing.includes(skill.toLowerCase())) return profile;

  const skills = [...profile.skills.filter((s) => s.trim()), skill];
  return { ...profile, skills };
}

export function addCertificationToProfile(
  profile: StructuredProfile,
  name: string,
  issuer = ''
): StructuredProfile {
  const certName = name.trim();
  if (!certName) return profile;

  const certs = [...profile.certifications];
  const emptyIndex = certs.findIndex((c) => !c.name.trim());
  const newCert = { ...emptyCertification(), id: uid(), name: certName, issuer: issuer.trim() };

  if (emptyIndex >= 0) {
    certs[emptyIndex] = newCert;
  } else {
    certs.push(newCert);
  }

  return { ...profile, certifications: certs };
}

function tryParseJson<T>(raw: string): T | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function ensureIds<T extends { id?: string }>(items: T[], factory: () => T): T[] {
  if (!items.length) return [factory()];
  return items.map((item) => ({ ...factory(), ...item, id: item.id || uid() }));
}

export function parseExperienceField(raw: string): ExperienceItem[] {
  const parsed = tryParseJson<ExperienceItem[]>(raw);
  if (Array.isArray(parsed)) return ensureIds(parsed, emptyExperience);
  if (raw?.trim()) {
    return [{ ...emptyExperience(), id: uid(), details: raw.trim() }];
  }
  return [emptyExperience()];
}

export function parseEducationField(raw: string): EducationItem[] {
  const parsed = tryParseJson<EducationItem[]>(raw);
  if (Array.isArray(parsed)) return ensureIds(parsed, emptyEducation);
  if (raw?.trim()) {
    return [{ ...emptyEducation(), id: uid(), degree: raw.trim() }];
  }
  return [emptyEducation()];
}

export function parseCertificationsField(raw: string): CertificationsPayload {
  const parsed = tryParseJson<CertificationsPayload | CertificationItem[]>(raw);
  if (parsed && !Array.isArray(parsed) && (parsed.certifications || parsed.licenses)) {
    return {
      certifications: ensureIds(parsed.certifications || [], emptyCertification),
      licenses: ensureIds(parsed.licenses || [], emptyLicense),
    };
  }
  if (Array.isArray(parsed)) {
    return {
      certifications: ensureIds(parsed, emptyCertification),
      licenses: [emptyLicense()],
    };
  }
  if (raw?.trim()) {
    return {
      certifications: [{ ...emptyCertification(), id: uid(), name: raw.trim() }],
      licenses: [emptyLicense()],
    };
  }
  return { certifications: [emptyCertification()], licenses: [emptyLicense()] };
}

export function parseSkillsField(raw: string): string[] {
  const parsed = tryParseJson<string[]>(raw);
  if (Array.isArray(parsed)) return parsed.length ? parsed : [''];
  if (raw?.trim()) {
    const split = raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    return split.length ? split : [''];
  }
  return [''];
}

export function parseProjectsField(raw: string): ProjectItem[] {
  const parsed = tryParseJson<ProjectItem[]>(raw);
  if (Array.isArray(parsed)) return ensureIds(parsed, emptyProject);
  if (raw?.trim()) {
    return [{ ...emptyProject(), id: uid(), details: raw.trim() }];
  }
  return [emptyProject()];
}

export function profileRowToStructured(row: Record<string, unknown> | null, email = ''): StructuredProfile {
  if (!row) return initialStructuredProfile(email);

  const certs = parseCertificationsField(String(row.certifications || ''));
  const { notes, pendingItems } = parseAdditionalInfoField(String(row.additional_info || ''));

  return {
    personal: {
      firstName: String(row.first_name || ''),
      lastName: String(row.last_name || ''),
      email: String(row.email || email),
      phone: String(row.phone || ''),
      address: String(row.address || ''),
      linkedin: String(row.linkedin || ''),
      portfolio: String(row.portfolio || ''),
    },
    experience: parseExperienceField(String(row.experience || '')),
    education: parseEducationField(String(row.education || '')),
    certifications: certs.certifications,
    licenses: certs.licenses,
    skills: parseSkillsField(String(row.skills || '')),
    projects: parseProjectsField(String(row.projects || '')),
    additionalInfo: notes,
    pendingItems,
  };
}

export function structuredToDbPayload(profile: StructuredProfile, userId: string) {
  return {
    id: userId,
    first_name: profile.personal.firstName.trim(),
    last_name: profile.personal.lastName.trim(),
    email: profile.personal.email.trim(),
    phone: profile.personal.phone.trim(),
    address: profile.personal.address.trim(),
    linkedin: profile.personal.linkedin.trim(),
    portfolio: profile.personal.portfolio.trim(),
    target_role: '',
    preferred_location: '',
    summary: '',
    experience: JSON.stringify(profile.experience),
    education: JSON.stringify(profile.education),
    certifications: JSON.stringify({
      certifications: profile.certifications,
      licenses: profile.licenses,
    }),
    skills: JSON.stringify(profile.skills.filter((s) => s.trim())),
    projects: JSON.stringify(profile.projects),
    additional_info: formatAdditionalInfoField(profile.additionalInfo, profile.pendingItems),
    updated_at: new Date().toISOString(),
  };
}

function formatDateRange(from: string, until: string) {
  if (from && until) return `${from} – ${until}`;
  return from || until || '';
}

export function flattenExperience(items: ExperienceItem[]) {
  return items
    .filter((item) => item.company.trim() || item.title.trim() || item.details.trim())
    .map((item) => {
      const header = [item.title, item.company].filter(Boolean).join(' at ');
      const dates = formatDateRange(item.from, item.until);
      return [header, dates, item.details].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

export function flattenEducation(items: EducationItem[]) {
  return items
    .filter((item) => item.institution.trim() || item.degree.trim())
    .map((item) => {
      const dates = formatDateRange(item.from, item.until);
      return [item.degree, item.institution, dates].filter(Boolean).join(' — ');
    })
    .join('\n');
}

export function flattenCertsAndLicenses(certs: CertificationItem[], licenses: LicenseItem[]) {
  const certLines = certs
    .filter((c) => c.name.trim())
    .map((c) => `${c.name}${c.issuer ? ` (${c.issuer})` : ''}${formatDateRange(c.from, c.until) ? ` — ${formatDateRange(c.from, c.until)}` : ''}`);
  const licenseLines = licenses
    .filter((l) => l.name.trim())
    .map((l) => `${l.name}${l.issuer ? ` (${l.issuer})` : ''}${formatDateRange(l.from, l.until) ? ` — ${formatDateRange(l.from, l.until)}` : ''}`);
  return [...certLines, ...licenseLines].join('\n');
}

export function flattenProjects(items: ProjectItem[]) {
  return items
    .filter((item) => item.name.trim() || item.details.trim())
    .map((item) => {
      const dates = formatDateRange(item.from, item.until);
      return [item.name, dates, item.details].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

export function flattenProfileForAi(profile: Record<string, unknown>) {
  const structured = profileRowToStructured(profile, String(profile.email || ''));

  return {
    ...profile,
    experience: flattenExperience(structured.experience),
    education: flattenEducation(structured.education),
    certifications: flattenCertsAndLicenses(structured.certifications, structured.licenses),
    skills: structured.skills.filter(Boolean).join(', '),
    projects: flattenProjects(structured.projects),
  };
}

/** Smaller payload for tailor API — avoids sending full DB row / duplicate JSON blobs. */
export function profileForTailorRequest(profile: Record<string, unknown>) {
  const flat = flattenProfileForAi(profile) as Record<string, unknown>;
  return {
    first_name: flat.first_name || flat.firstName || '',
    last_name: flat.last_name || flat.lastName || '',
    full_name: flat.full_name || flat.fullName || '',
    email: flat.email || '',
    phone: flat.phone || '',
    address: flat.address || flat.location || '',
    linkedin: flat.linkedin || '',
    portfolio: flat.portfolio || flat.website || '',
    target_role: flat.target_role || flat.targetRole || '',
    preferred_location: flat.preferred_location || flat.preferredLocation || '',
    summary: flat.summary || '',
    experience: flat.experience || '',
    education: flat.education || '',
    certifications: flat.certifications || '',
    skills: flat.skills || '',
    projects: flat.projects || '',
    additional_info: flat.additional_info || flat.additionalInfo || '',
  };
}

export function isProfileComplete(profile: StructuredProfile) {
  const { personal, experience, education, skills } = profile;
  const hasPersonal =
    personal.firstName.trim() &&
    personal.lastName.trim() &&
    personal.email.trim() &&
    personal.phone.trim();
  const hasExperience = experience.some((e) => e.company.trim() && e.title.trim() && e.from.trim());
  const hasEducation = education.some((e) => e.institution.trim() && e.degree.trim());
  const hasSkills = skills.some((s) => s.trim());
  return Boolean(hasPersonal && hasExperience && hasEducation && hasSkills);
}

export function profileCompletionPercent(profile: StructuredProfile) {
  const checks = [
    profile.personal.firstName.trim(),
    profile.personal.lastName.trim(),
    profile.personal.email.trim(),
    profile.personal.phone.trim(),
    profile.experience.some((e) => e.company.trim() && e.title.trim()),
    profile.education.some((e) => e.institution.trim()),
    profile.skills.some((s) => s.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}

export function parsedResumeToStructured(data: Record<string, unknown>, email = ''): StructuredProfile {
  const base = initialStructuredProfile(email);

  base.personal.firstName = String(data.firstName || '');
  base.personal.lastName = String(data.lastName || '');
  base.personal.email = String(data.email || email);
  base.personal.phone = String(data.phone || '');
  base.personal.address = String(data.address || '');
  base.personal.linkedin = String(data.linkedin || '');
  base.personal.portfolio = String(data.portfolio || '');

  if (Array.isArray(data.experience) && data.experience.length) {
    base.experience = ensureIds(data.experience as ExperienceItem[], emptyExperience);
  } else if (typeof data.experience === 'string' && data.experience.trim()) {
    base.experience = parseExperienceField(data.experience);
  }

  if (Array.isArray(data.education) && data.education.length) {
    base.education = ensureIds(data.education as EducationItem[], emptyEducation);
  } else if (typeof data.education === 'string' && data.education.trim()) {
    base.education = parseEducationField(data.education);
  }

  if (Array.isArray(data.certifications) && data.certifications.length) {
    base.certifications = ensureIds(data.certifications as CertificationItem[], emptyCertification);
  } else if (typeof data.certifications === 'string' && data.certifications.trim()) {
    base.certifications = parseCertificationsField(data.certifications).certifications;
  }

  if (Array.isArray(data.licenses) && data.licenses.length) {
    base.licenses = ensureIds(data.licenses as LicenseItem[], emptyLicense);
  } else if (typeof data.licenses === 'string' && data.licenses.trim()) {
    base.licenses = parseCertificationsField(data.licenses).licenses;
  }

  if (Array.isArray(data.skills) && data.skills.length) {
    base.skills = (data.skills as string[]).map(String).filter(Boolean);
  } else if (typeof data.skills === 'string' && data.skills.trim()) {
    base.skills = parseSkillsField(data.skills);
  }

  if (Array.isArray(data.projects) && data.projects.length) {
    base.projects = ensureIds(data.projects as ProjectItem[], emptyProject);
  } else if (typeof data.projects === 'string' && data.projects.trim()) {
    base.projects = parseProjectsField(data.projects);
  }

  return base;
}
