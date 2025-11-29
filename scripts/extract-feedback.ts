// extract-feedback.ts
import * as fs from 'fs';
import * as path from 'path';

// 1️⃣ Read the raw file
const raw = fs.readFileSync('Customer_Feedback.txt', 'utf-8');

// 2️⃣ Split into lines, ignore empty ones
const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);

// 3️⃣ Simple heuristic: look for leading “On this platform can I …”
const feedback = lines
    .filter(l => l.startsWith('"On this platform can I'))
    .map(l => l.replace(/^"|"$/g, '').trim());

// 4️⃣ Categorise by keyword groups
const categories: Record<string, string[]> = {};

feedback.forEach(item => {
    const lower = item.toLowerCase();
    const cat = (
        lower.includes('mobile') ? 'Mobile' :
            lower.includes('dashboard') ? 'Dashboard' :
                lower.includes('permissions') ? 'Permissions' :
                    lower.includes('report') || lower.includes('dashboard') ? 'Reporting' :
                        lower.includes('integration') ? 'Integration' :
                            lower.includes('protocol') ? 'Protocol' :
                                lower.includes('booking') ? 'Booking' :
                                    lower.includes('inventory') ? 'Inventory' :
                                        lower.includes('training') ? 'Training' :
                                            lower.includes('safety') ? 'Safety' :
                                                lower.includes('task') ? 'Task Management' :
                                                    'Other'
    );
    (categories[cat] ??= []).push(item);
});

// 5️⃣ Write JSON for downstream scripts
fs.writeFileSync('feedback.json', JSON.stringify(categories, null, 2));
console.log('✅ feedback.json created –', Object.keys(categories).length, 'categories');
