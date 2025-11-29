// map-feedback-to-code.ts
import * as fs from 'fs';

interface Gap {
    category: string;
    description: string;
    files: string[];
}

const feedback: Record<string, string[]> = JSON.parse(fs.readFileSync('feedback.json', 'utf-8'));
const scan: { file: string; exports: string[]; lines: number; todos: string[] }[] = JSON.parse(fs.readFileSync('codebase-scan.json', 'utf-8'));

const gaps: Gap[] = [];

// Mobile gap detection – look for responsive utilities or media queries
if (feedback['Mobile']?.length) {
    const mobileFiles = scan.filter(f => {
        const src = fs.readFileSync(f.file, 'utf-8');
        return f.exports.some(e => e.toLowerCase().includes('mobile')) || /useMediaQuery|react-responsive/.test(src);
    });
    if (mobileFiles.length === 0) {
        gaps.push({
            category: 'Mobile',
            description: 'No mobile‑optimised components found.',
            files: []
        });
    }
}

// Permissions gap detection – auth hooks without role checks
if (feedback['Permissions']?.length) {
    const authFiles = scan.filter(f => /Auth|useAuth/.test(f.file));
    const missing = authFiles.filter(f => {
        const src = fs.readFileSync(f.file, 'utf-8');
        return !/(role|permission|access)/i.test(src);
    });
    if (missing.length) {
        gaps.push({
            category: 'Permissions',
            description: 'Auth hooks used without explicit role checks.',
            files: missing.map(m => m.file)
        });
    }
}

// Reporting gap detection – look for chart libraries
if (feedback['Reporting']?.length) {
    const chartFiles = scan.filter(f => /chart|graph|dashboard/.test(f.file));
    if (chartFiles.length === 0) {
        gaps.push({
            category: 'Reporting',
            description: 'No reporting/dashboard components detected.',
            files: []
        });
    }
}

// Protocol gap detection – ensure diff view exists
if (feedback['Protocol']?.length) {
    const hasDiff = scan.some(f => /DiffView/.test(f.file) || /protocoldiff/i.test(f.file));
    if (!hasDiff) {
        gaps.push({
            category: 'Protocol',
            description: 'Protocol diff view missing.',
            files: []
        });
    }
}

// Booking gap detection – look for booking UI components
if (feedback['Booking']?.length) {
    const bookingUI = scan.filter(f => /BookingForm|BookingDialog|EquipmentBooking/.test(f.file));
    if (bookingUI.length === 0) {
        gaps.push({
            category: 'Booking',
            description: 'No booking UI components detected.',
            files: []
        });
    }
}

fs.writeFileSync('feedback-gaps.json', JSON.stringify(gaps, null, 2));
console.log('✅ feedback-gaps.json written –', gaps.length, 'gaps identified');
