"use strict";
/**
 * Barrel export for all type modules
 * Simplifies imports: import { PersonProfile, MasterProject } from '@/lib/types'
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Common types
__exportStar(require("./common.types"), exports);
// ORCID integration
__exportStar(require("./orcid.types"), exports);
// User & Authentication
__exportStar(require("./user.types"), exports);
// Organization & Structure
__exportStar(require("./organization.types"), exports);
__exportStar(require("./researchgroup.types"), exports);
__exportStar(require("./network.types"), exports);
// Profile & People
__exportStar(require("./profile.types"), exports);
// Funding
__exportStar(require("./funding.types"), exports);
// Projects & Workpackages
__exportStar(require("./project.types"), exports);
__exportStar(require("./workpackage.types"), exports);
__exportStar(require("./deliverable.types"), exports);
__exportStar(require("./task.types"), exports);
__exportStar(require("./projectSnapshot"), exports);
// Lab Operations
__exportStar(require("./order.types"), exports);
__exportStar(require("./inventory.types"), exports);
__exportStar(require("./equipment.types"), exports);
__exportStar(require("./booking.types"), exports);
__exportStar(require("./poll.types"), exports);
// Electronic Lab Notebook
__exportStar(require("./eln.types"), exports);
// Calendar & Events
__exportStar(require("./calendar.types"), exports);
// Compliance & Audit
__exportStar(require("./audit.types"), exports);
__exportStar(require("./privacy.types"), exports);
__exportStar(require("./ai.types"), exports);
// Comments
__exportStar(require("./comment.types"), exports);
//# sourceMappingURL=index.js.map