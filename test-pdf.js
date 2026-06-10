import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<h1>Test PDF</h1><p>If you see this, Puppeteer works.</p>');
const pdf = await page.pdf({ format: 'A4' });
await browser.close();
writeFileSync('test-output.pdf', pdf);
console.log('PDF generated successfully');