const LOCATION_GROUPS = {
  toronto: {
    aliases: [
      'toronto',
      'gta',
      'greater toronto',
      'scarborough',
      'north york',
      'etobicoke',
      'mississauga',
      'markham',
      'brampton',
      'richmond hill',
      'vaughan',
      'oakville',
      'ajax',
      'pickering',
      'whitby',
      'oshawa',
    ],
  },
  vancouver: {
    aliases: [
      'vancouver',
      'burnaby',
      'surrey',
      'north vancouver',
      'west vancouver',
      'new westminster',
      'coquitlam',
      'langley',
      'delta',
      'richmond bc',
    ],
  },
  montreal: {
    aliases: ['montreal', 'montréal', 'montréal', 'laval', 'longueuil', 'brossard'],
  },
  calgary: {
    aliases: ['calgary'],
  },
  edmonton: {
    aliases: ['edmonton'],
  },
  ottawa: {
    aliases: ['ottawa', 'gatineau', 'kanata'],
  },
  winnipeg: {
    aliases: ['winnipeg'],
  },
  halifax: {
    aliases: ['halifax', 'dartmouth'],
  },
};

function normalizeLocationText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveLocationGroup(requested) {
  const text = normalizeLocationText(requested);
  if (!text) return null;

  for (const [key, group] of Object.entries(LOCATION_GROUPS)) {
    if (text.includes(key) || group.aliases.some((alias) => text.includes(alias))) {
      return key;
    }
  }

  return null;
}

function locationMentionsOtherMetro(jobText, activeGroupKey) {
  for (const [key, group] of Object.entries(LOCATION_GROUPS)) {
    if (key === activeGroupKey) continue;
    if (group.aliases.some((alias) => jobText.includes(alias))) {
      return true;
    }
  }
  return false;
}

export function jobMatchesRequestedLocation(jobLocation, isRemote, requestedLocation) {
  const requested = normalizeLocationText(requestedLocation);
  if (!requested) return true;
  if (isRemote) return true;

  const job = normalizeLocationText(jobLocation);
  if (!job) return false;

  const groupKey = resolveLocationGroup(requested);
  if (groupKey) {
    const group = LOCATION_GROUPS[groupKey];
    const matchesGroup = group.aliases.some((alias) => job.includes(alias));
    if (!matchesGroup) return false;
    if (locationMentionsOtherMetro(job, groupKey)) return false;
    return true;
  }

  return job.includes(requested);
}

export function filterJobsByLocation(jobs, requestedLocation) {
  const location = requestedLocation?.trim();
  if (!location) {
    return {
      jobs,
      locationFilterApplied: false,
      locationFilterMatched: false,
    };
  }

  const filtered = jobs.filter((job) =>
    jobMatchesRequestedLocation(job.location, job.isRemote, location)
  );

  return {
    jobs: filtered,
    locationFilterApplied: true,
    locationFilterMatched: filtered.length > 0,
  };
}
