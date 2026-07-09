import { parseJobDescriptionBlocks, formatJobDescriptionText } from '../lib/job-description-format.js';

const raw = `• Role: AWS Network Engineer / Cloud Network Engineer

• Location: Toronto, ON (Hybrid)

• Duration: Full-Time / Perm role

Key Responsibilities:

• Design and implement AWS network architecture (VPCs, subnets, routing)

• Configure networking components (VPN, Direct Connect, load balancers, DNS)

Key Skills:

• Strong AWS networking (VPC, routing, connectivity)

Pay: $100,000.00-$130,000.00 per year

Experience:

• Network engineering: 6 years (preferred)`;

const formatted = formatJobDescriptionText(raw.replace(/•/g, '\uFFFD'));
const blocks = parseJobDescriptionBlocks(formatted);

console.log(formatted.slice(0, 300));
console.log('--- blocks ---');
for (const b of blocks) {
  if (b.type === 'list') console.log('list', b.items.length, b.items[0]);
  else if (b.type === 'label') console.log('label', b.label, b.value);
  else console.log(b.type, b.text);
}
