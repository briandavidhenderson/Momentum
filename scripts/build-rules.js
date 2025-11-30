const fs = require('fs');
const path = require('path');

const rulesDir = path.join(__dirname, '../firestore/rules');
const outputFile = path.join(__dirname, '../firestore.rules');

// Order of files to concatenate
// We use a deterministic order based on filenames, but we can enforce specific order if needed.
// The plan uses numbered prefixes (00_, 10_, etc.) so alphabetical sort works.

function buildRules() {
    console.log('Building firestore.rules...');

    try {
        const files = fs.readdirSync(rulesDir).sort();
        let combinedRules = '// ============================================================================\n';
        combinedRules += '// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n';
        combinedRules += '// Edit files in firestore/rules/ instead.\n';
        combinedRules += '// ============================================================================\n\n';

        for (const file of files) {
            if (file.endsWith('.rules')) {
                console.log(`Adding ${file}...`);
                const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
                combinedRules += `// Source: firestore/rules/${file}\n`;
                combinedRules += content + '\n\n';
            }
        }

        fs.writeFileSync(outputFile, combinedRules);
        console.log(`Successfully generated ${outputFile}`);
    } catch (error) {
        console.error('Error building rules:', error);
        process.exit(1);
    }
}

buildRules();
