
import { parseWorks } from '../../lib/orcidService';

// Mock data based on ORCID API structure
const mockOrcidWorksResponse = [
    {
        "work-summary": [
            {
                "put-code": 12345,
                "title": { "title": { "value": "Test Publication" } },
                "type": "journal-article",
                "publication-date": { "year": { "value": "2023" } },
                "journal-title": { "value": "Journal of Testing" },
                "contributors": {
                    "contributor": [
                        { "credit-name": { "value": "Author One" } },
                        { "credit-name": { "value": "Author Two" } }
                    ]
                }
            }
        ]
    }
];

describe('ORCID Parsing', () => {
    test('should extract contributors from work summary', () => {
        const works = parseWorks(mockOrcidWorksResponse);

        expect(works).toHaveLength(1);
        expect(works[0].title).toBe("Test Publication");

        // This expectation is what we expect to fail currently
        // because contributors are not yet parsed
        expect(works[0].contributors).toBeDefined();
        expect(works[0].contributors).toHaveLength(2);
        expect(works[0].contributors).toContain("Author One");
        expect(works[0].contributors).toContain("Author Two");
    });
});
