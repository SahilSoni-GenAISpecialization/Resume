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
};

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
  };
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
    additionalInfo: String(row.additional_info || ''),
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
    additional_info: profile.additionalInfo.trim(),
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
