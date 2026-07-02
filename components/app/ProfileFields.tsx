'use client';

import { useState } from 'react';
import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  LicenseItem,
  ProjectItem,
  StructuredProfile,
} from '@/lib/profile-data';
import {
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyLicense,
  emptyProject,
} from '@/lib/profile-data';
import { AddButton, RemoveButton } from './profile-ui';

type ProfileFieldsProps = {
  profile: StructuredProfile;
  onChange: (profile: StructuredProfile) => void;
  disabled?: boolean;
};

function updateList<T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>
): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function PersonalFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  const setPersonal = (patch: Partial<StructuredProfile['personal']>) => {
    onChange({ ...profile, personal: { ...profile.personal, ...patch } });
  };

  const fields: { key: keyof StructuredProfile['personal']; label: string; type: string; full?: boolean; required?: boolean }[] = [
    { key: 'firstName', label: 'First name', type: 'text', required: true },
    { key: 'lastName', label: 'Last name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'text', required: true },
    { key: 'address', label: 'Address', type: 'text', full: true },
    { key: 'linkedin', label: 'LinkedIn URL', type: 'text', full: true },
    { key: 'portfolio', label: 'Portfolio / Website', type: 'text', full: true },
  ];

  return (
    <div className="app-field-grid">
      {fields.map((field) => (
        <div key={field.key} className={`app-field ${field.full ? 'app-field-full' : ''}`}>
          <label>
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          <input
            className="app-input"
            type={field.type}
            value={profile.personal[field.key]}
            onChange={(e) => setPersonal({ [field.key]: e.target.value })}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

export function ExperienceFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  const setExperience = (experience: ExperienceItem[]) => onChange({ ...profile, experience });

  return (
    <>
      {profile.experience.map((item, index) => (
        <div key={item.id} className="app-entry-card">
          <div className="app-entry-header">
            <span className="app-entry-label">Experience {index + 1}</span>
            {profile.experience.length > 1 && (
              <RemoveButton
                onClick={() => setExperience(profile.experience.filter((e) => e.id !== item.id))}
              />
            )}
          </div>
          <div className="app-field-grid">
            <div className="app-field">
              <label>Company *</label>
              <input
                className="app-input"
                value={item.company}
                onChange={(e) =>
                  setExperience(updateList(profile.experience, item.id, { company: e.target.value }))
                }
                placeholder="e.g. Stripe"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Job title *</label>
              <input
                className="app-input"
                value={item.title}
                onChange={(e) =>
                  setExperience(updateList(profile.experience, item.id, { title: e.target.value }))
                }
                placeholder="e.g. Senior Frontend Engineer"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>From *</label>
              <input
                className="app-input"
                value={item.from}
                onChange={(e) =>
                  setExperience(updateList(profile.experience, item.id, { from: e.target.value }))
                }
                placeholder="e.g. Jan 2021"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Until</label>
              <input
                className="app-input"
                value={item.until}
                onChange={(e) =>
                  setExperience(updateList(profile.experience, item.id, { until: e.target.value }))
                }
                placeholder="e.g. Present"
                disabled={disabled}
              />
            </div>
            <div className="app-field app-field-full">
              <label>Details</label>
              <textarea
                className="app-textarea"
                value={item.details}
                onChange={(e) =>
                  setExperience(updateList(profile.experience, item.id, { details: e.target.value }))
                }
                placeholder="Key responsibilities and achievements..."
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}
      <AddButton
        label="Add experience"
        onClick={() => setExperience([...profile.experience, emptyExperience()])}
      />
    </>
  );
}

export function EducationFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  const setEducation = (education: EducationItem[]) => onChange({ ...profile, education });

  return (
    <>
      {profile.education.map((item, index) => (
        <div key={item.id} className="app-entry-card">
          <div className="app-entry-header">
            <span className="app-entry-label">Education {index + 1}</span>
            {profile.education.length > 1 && (
              <RemoveButton onClick={() => setEducation(profile.education.filter((e) => e.id !== item.id))} />
            )}
          </div>
          <div className="app-field-grid">
            <div className="app-field">
              <label>Institution *</label>
              <input
                className="app-input"
                value={item.institution}
                onChange={(e) =>
                  setEducation(updateList(profile.education, item.id, { institution: e.target.value }))
                }
                placeholder="e.g. University of Toronto"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Degree / Program *</label>
              <input
                className="app-input"
                value={item.degree}
                onChange={(e) =>
                  setEducation(updateList(profile.education, item.id, { degree: e.target.value }))
                }
                placeholder="e.g. B.Sc. Computer Science"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>From</label>
              <input
                className="app-input"
                value={item.from}
                onChange={(e) =>
                  setEducation(updateList(profile.education, item.id, { from: e.target.value }))
                }
                placeholder="e.g. 2018"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Until</label>
              <input
                className="app-input"
                value={item.until}
                onChange={(e) =>
                  setEducation(updateList(profile.education, item.id, { until: e.target.value }))
                }
                placeholder="e.g. 2022"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}
      <AddButton label="Add education" onClick={() => setEducation([...profile.education, emptyEducation()])} />
    </>
  );
}

function CertBlock({
  items,
  labelPrefix,
  onChange,
  disabled,
  emptyFactory,
}: {
  items: CertificationItem[] | LicenseItem[];
  labelPrefix: string;
  onChange: (items: CertificationItem[] | LicenseItem[]) => void;
  disabled?: boolean;
  emptyFactory: () => CertificationItem | LicenseItem;
}) {
  return (
    <>
      {items.map((item, index) => (
        <div key={item.id} className="app-entry-card">
          <div className="app-entry-header">
            <span className="app-entry-label">
              {labelPrefix} {index + 1}
            </span>
            {items.length > 1 && (
              <RemoveButton onClick={() => onChange(items.filter((e) => e.id !== item.id))} />
            )}
          </div>
          <div className="app-field-grid">
            <div className="app-field">
              <label>Name</label>
              <input
                className="app-input"
                value={item.name}
                onChange={(e) =>
                  onChange(updateList(items, item.id, { name: e.target.value }) as typeof items)
                }
                placeholder={`e.g. ${labelPrefix === 'Certification' ? 'AWS Solutions Architect' : 'P.Eng.'}`}
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Issuer</label>
              <input
                className="app-input"
                value={item.issuer}
                onChange={(e) =>
                  onChange(updateList(items, item.id, { issuer: e.target.value }) as typeof items)
                }
                placeholder="e.g. Amazon Web Services"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>From</label>
              <input
                className="app-input"
                value={item.from}
                onChange={(e) =>
                  onChange(updateList(items, item.id, { from: e.target.value }) as typeof items)
                }
                placeholder="e.g. 2023"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Until</label>
              <input
                className="app-input"
                value={item.until}
                onChange={(e) =>
                  onChange(updateList(items, item.id, { until: e.target.value }) as typeof items)
                }
                placeholder="e.g. 2026"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}
      <AddButton
        label={`Add ${labelPrefix.toLowerCase()}`}
        onClick={() => onChange([...items, emptyFactory()])}
      />
    </>
  );
}

export function CertificationFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  return (
    <CertBlock
      items={profile.certifications}
      labelPrefix="Certification"
      onChange={(certifications) =>
        onChange({ ...profile, certifications: certifications as CertificationItem[] })
      }
      disabled={disabled}
      emptyFactory={emptyCertification}
    />
  );
}

export function LicenseFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  return (
    <CertBlock
      items={profile.licenses}
      labelPrefix="License"
      onChange={(licenses) => onChange({ ...profile, licenses: licenses as LicenseItem[] })}
      disabled={disabled}
      emptyFactory={emptyLicense}
    />
  );
}

export function SkillsFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  const [draft, setDraft] = useState('');

  const addSkill = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (profile.skills.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange({ ...profile, skills: [...profile.skills.filter(Boolean), trimmed] });
    setDraft('');
  };

  const visibleSkills = profile.skills.filter(Boolean);

  return (
    <>
      <div className="app-skills-input-row">
        <input
          className="app-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          placeholder="e.g. React, Python, AWS..."
          disabled={disabled}
        />
        <button type="button" className="app-btn app-btn-primary" onClick={addSkill} disabled={disabled}>
          Add skill
        </button>
      </div>

      {visibleSkills.length > 0 && (
        <div className="app-skills-wrap">
          {visibleSkills.map((skill) => (
            <span key={skill} className="app-skill-tag">
              {skill}
              {visibleSkills.length > 1 && (
                <button
                  type="button"
                  className="app-skill-remove"
                  onClick={() =>
                    onChange({
                      ...profile,
                      skills: profile.skills.filter((s) => s !== skill),
                    })
                  }
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

export function ProjectFields({ profile, onChange, disabled }: ProfileFieldsProps) {
  const setProjects = (projects: ProjectItem[]) => onChange({ ...profile, projects });

  return (
    <>
      {profile.projects.map((item, index) => (
        <div key={item.id} className="app-entry-card">
          <div className="app-entry-header">
            <span className="app-entry-label">Project {index + 1}</span>
            {profile.projects.length > 1 && (
              <RemoveButton onClick={() => setProjects(profile.projects.filter((p) => p.id !== item.id))} />
            )}
          </div>
          <div className="app-field-grid">
            <div className="app-field app-field-full">
              <label>Project name</label>
              <input
                className="app-input"
                value={item.name}
                onChange={(e) =>
                  setProjects(updateList(profile.projects, item.id, { name: e.target.value }))
                }
                placeholder="e.g. E-commerce Platform"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>From</label>
              <input
                className="app-input"
                value={item.from}
                onChange={(e) =>
                  setProjects(updateList(profile.projects, item.id, { from: e.target.value }))
                }
                placeholder="e.g. 2023"
                disabled={disabled}
              />
            </div>
            <div className="app-field">
              <label>Until</label>
              <input
                className="app-input"
                value={item.until}
                onChange={(e) =>
                  setProjects(updateList(profile.projects, item.id, { until: e.target.value }))
                }
                placeholder="e.g. 2024"
                disabled={disabled}
              />
            </div>
            <div className="app-field app-field-full">
              <label>Details</label>
              <textarea
                className="app-textarea"
                value={item.details}
                onChange={(e) =>
                  setProjects(updateList(profile.projects, item.id, { details: e.target.value }))
                }
                placeholder="Describe the project, tech stack, and impact..."
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}
      <AddButton label="Add project" onClick={() => setProjects([...profile.projects, emptyProject()])} />
    </>
  );
}
