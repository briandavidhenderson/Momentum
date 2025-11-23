"use strict";
// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_ROLE_DISPLAY_NAMES = exports.UserRole = void 0;
/**
 * UserRole - Enhanced RBAC for data protection and funding control
 * Roles determine access to sensitive data and funding information
 */
var UserRole;
(function (UserRole) {
    UserRole["PI"] = "pi";
    UserRole["RESEARCHER"] = "researcher";
    UserRole["ASSISTANT"] = "assistant";
    UserRole["EXTERNAL_COLLABORATOR"] = "external_collaborator";
    UserRole["FINANCE_ADMIN"] = "finance_admin";
    UserRole["LAB_MANAGER"] = "lab_manager";
    UserRole["ADMIN"] = "admin"; // System Administrator - full system access
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * Display names for user roles
 */
exports.USER_ROLE_DISPLAY_NAMES = {
    [UserRole.PI]: "Principal Investigator",
    [UserRole.RESEARCHER]: "Researcher",
    [UserRole.ASSISTANT]: "Lab Assistant",
    [UserRole.EXTERNAL_COLLABORATOR]: "External Collaborator",
    [UserRole.FINANCE_ADMIN]: "Finance Administrator",
    [UserRole.LAB_MANAGER]: "Lab Manager",
    [UserRole.ADMIN]: "System Administrator"
};
//# sourceMappingURL=user.types.js.map