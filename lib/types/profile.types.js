"use strict";
// ============================================================================
// PROFILE TYPES
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSITION_CATEGORIES = exports.POSITION_HIERARCHY_ORDER = exports.POSITION_DISPLAY_NAMES = exports.PositionLevel = void 0;
/**
 * Position levels in academic/research hierarchy
 * Ordered from entry-level to senior positions
 */
var PositionLevel;
(function (PositionLevel) {
    // Research Staff
    PositionLevel["RESEARCH_INTERN"] = "research_intern";
    PositionLevel["RESEARCH_ASSISTANT"] = "research_assistant";
    PositionLevel["RESEARCH_ASSOCIATE"] = "research_associate";
    PositionLevel["LAB_TECHNICIAN"] = "lab_technician";
    PositionLevel["SENIOR_LAB_TECHNICIAN"] = "senior_lab_technician";
    // Students
    PositionLevel["UNDERGRADUATE_STUDENT"] = "undergraduate_student";
    PositionLevel["MASTERS_STUDENT"] = "masters_student";
    PositionLevel["PHD_STUDENT"] = "phd_student";
    PositionLevel["PHD_CANDIDATE"] = "phd_candidate";
    // Postdoctoral
    PositionLevel["POSTDOC_RESEARCH_ASSOCIATE"] = "postdoc_research_associate";
    PositionLevel["POSTDOC_RESEARCH_FELLOW"] = "postdoc_research_fellow";
    PositionLevel["SENIOR_POSTDOC_RESEARCHER"] = "senior_postdoc_researcher";
    // Academic Faculty
    PositionLevel["RESEARCH_FELLOW"] = "research_fellow";
    PositionLevel["SENIOR_RESEARCH_FELLOW"] = "senior_research_fellow";
    PositionLevel["ASSISTANT_PROFESSOR"] = "assistant_professor";
    PositionLevel["ASSOCIATE_PROFESSOR"] = "associate_professor";
    PositionLevel["PROFESSOR"] = "professor";
    PositionLevel["HEAD_OF_DEPARTMENT"] = "head_of_department";
    // Other
    PositionLevel["VISITING_RESEARCHER"] = "visiting_researcher";
    PositionLevel["EXTERNAL_COLLABORATOR"] = "external_collaborator";
    PositionLevel["LAB_MANAGER"] = "lab_manager";
    PositionLevel["ADMINISTRATIVE_STAFF"] = "administrative_staff";
})(PositionLevel || (exports.PositionLevel = PositionLevel = {}));
/**
 * Display names for position levels
 */
exports.POSITION_DISPLAY_NAMES = {
    [PositionLevel.RESEARCH_INTERN]: "Research Intern",
    [PositionLevel.RESEARCH_ASSISTANT]: "Research Assistant",
    [PositionLevel.RESEARCH_ASSOCIATE]: "Research Associate",
    [PositionLevel.LAB_TECHNICIAN]: "Lab Technician",
    [PositionLevel.SENIOR_LAB_TECHNICIAN]: "Senior Lab Technician",
    [PositionLevel.UNDERGRADUATE_STUDENT]: "Undergraduate Student",
    [PositionLevel.MASTERS_STUDENT]: "Master's Student",
    [PositionLevel.PHD_STUDENT]: "PhD Student",
    [PositionLevel.PHD_CANDIDATE]: "PhD Candidate",
    [PositionLevel.POSTDOC_RESEARCH_ASSOCIATE]: "Postdoctoral Research Associate",
    [PositionLevel.POSTDOC_RESEARCH_FELLOW]: "Postdoctoral Research Fellow",
    [PositionLevel.SENIOR_POSTDOC_RESEARCHER]: "Senior Postdoctoral Researcher",
    [PositionLevel.RESEARCH_FELLOW]: "Research Fellow",
    [PositionLevel.SENIOR_RESEARCH_FELLOW]: "Senior Research Fellow",
    [PositionLevel.ASSISTANT_PROFESSOR]: "Assistant Professor / Lecturer",
    [PositionLevel.ASSOCIATE_PROFESSOR]: "Associate Professor / Senior Lecturer",
    [PositionLevel.PROFESSOR]: "Professor / Reader",
    [PositionLevel.HEAD_OF_DEPARTMENT]: "Head of Department / Chair",
    [PositionLevel.VISITING_RESEARCHER]: "Visiting Researcher",
    [PositionLevel.EXTERNAL_COLLABORATOR]: "Collaborator (External)",
    [PositionLevel.LAB_MANAGER]: "Lab Manager",
    [PositionLevel.ADMINISTRATIVE_STAFF]: "Administrative Staff"
};
/**
 * Position hierarchy in order (for dropdowns and sorting)
 */
exports.POSITION_HIERARCHY_ORDER = [
    PositionLevel.RESEARCH_INTERN,
    PositionLevel.RESEARCH_ASSISTANT,
    PositionLevel.RESEARCH_ASSOCIATE,
    PositionLevel.LAB_TECHNICIAN,
    PositionLevel.SENIOR_LAB_TECHNICIAN,
    PositionLevel.UNDERGRADUATE_STUDENT,
    PositionLevel.MASTERS_STUDENT,
    PositionLevel.PHD_STUDENT,
    PositionLevel.PHD_CANDIDATE,
    PositionLevel.POSTDOC_RESEARCH_ASSOCIATE,
    PositionLevel.POSTDOC_RESEARCH_FELLOW,
    PositionLevel.SENIOR_POSTDOC_RESEARCHER,
    PositionLevel.RESEARCH_FELLOW,
    PositionLevel.SENIOR_RESEARCH_FELLOW,
    PositionLevel.ASSISTANT_PROFESSOR,
    PositionLevel.ASSOCIATE_PROFESSOR,
    PositionLevel.PROFESSOR,
    PositionLevel.HEAD_OF_DEPARTMENT,
    PositionLevel.VISITING_RESEARCHER,
    PositionLevel.EXTERNAL_COLLABORATOR,
    PositionLevel.LAB_MANAGER,
    PositionLevel.ADMINISTRATIVE_STAFF
];
/**
 * Position categories for grouped display
 */
exports.POSITION_CATEGORIES = {
    "Research Staff": [
        PositionLevel.RESEARCH_INTERN,
        PositionLevel.RESEARCH_ASSISTANT,
        PositionLevel.RESEARCH_ASSOCIATE,
        PositionLevel.LAB_TECHNICIAN,
        PositionLevel.SENIOR_LAB_TECHNICIAN,
    ],
    "Students": [
        PositionLevel.UNDERGRADUATE_STUDENT,
        PositionLevel.MASTERS_STUDENT,
        PositionLevel.PHD_STUDENT,
        PositionLevel.PHD_CANDIDATE,
    ],
    "Postdoctoral": [
        PositionLevel.POSTDOC_RESEARCH_ASSOCIATE,
        PositionLevel.POSTDOC_RESEARCH_FELLOW,
        PositionLevel.SENIOR_POSTDOC_RESEARCHER,
    ],
    "Academic Faculty": [
        PositionLevel.RESEARCH_FELLOW,
        PositionLevel.SENIOR_RESEARCH_FELLOW,
        PositionLevel.ASSISTANT_PROFESSOR,
        PositionLevel.ASSOCIATE_PROFESSOR,
        PositionLevel.PROFESSOR,
        PositionLevel.HEAD_OF_DEPARTMENT,
    ],
    "Other": [
        PositionLevel.VISITING_RESEARCHER,
        PositionLevel.EXTERNAL_COLLABORATOR,
        PositionLevel.LAB_MANAGER,
        PositionLevel.ADMINISTRATIVE_STAFF,
    ]
};
//# sourceMappingURL=profile.types.js.map