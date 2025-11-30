// scan-codebase.ts
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = 'c:/Users/hendersb/Documents/Momentum';
const SRC = path.join(ROOT, 'components'); // adjust if you have other dirs

interface FileInfo {
    file: string;
    exports: string[];
    lines: number;
    todos: string[];
}

function walk(dir: string, out: FileInfo[] = []): FileInfo[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'out', 'build'].includes(entry.name)) continue;
            walk(full, out);
        } else if (/\.(tsx?|js|ts)$/.test(entry.name)) {
            const src = fs.readFileSync(full, 'utf-8');
            const sourceFile = ts.createSourceFile(full, src, ts.ScriptTarget.Latest, true);
            const exports: string[] = [];

            ts.forEachChild(sourceFile, node => {
                if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
                    node.exportClause.elements.forEach(e => exports.push(e.name.getText()));
                }
                if (ts.isExportAssignment(node)) {
                    exports.push('default');
                }
                if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    exports.push(node.name?.getText() ?? 'anonymous');
                }
                if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    node.declarationList.declarations.forEach(d => {
                        if (ts.isIdentifier(d.name)) exports.push(d.name.text);
                    });
                }
            });

            const todos = src.match(/\/\/\s*TODO[:\s].*|\/\/\s*FIXME[:\s].*/gi) || [];

            out.push({
                file: full,
                exports,
                lines: src.split(/\r?\n/).length,
                todos,
            });
        }
    }
    return out;
}

const info = walk(SRC);
fs.writeFileSync('codebase-scan.json', JSON.stringify(info, null, 2));
console.log('✅ codebase-scan.json written –', info.length, 'files scanned');
