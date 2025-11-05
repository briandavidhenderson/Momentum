"use client"

import { PositionLevel, POSITION_DISPLAY_NAMES } from "@/lib/types"
import { GraduationCap, FlaskConical, Users, Briefcase, Star } from "lucide-react"

interface PositionBadgeProps {
  positionLevel: PositionLevel
  positionDisplayName?: string
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  isPrincipalInvestigator?: boolean
}

// Position category mapping
const POSITION_CATEGORY_CONFIG: Record<PositionLevel, {
  category: string
  color: string
  icon: typeof GraduationCap
}> = {
  // Research Staff
  [PositionLevel.RESEARCH_INTERN]: {
    category: "Research Staff",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FlaskConical
  },
  [PositionLevel.RESEARCH_ASSISTANT]: {
    category: "Research Staff",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FlaskConical
  },
  [PositionLevel.RESEARCH_ASSOCIATE]: {
    category: "Research Staff",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FlaskConical
  },
  [PositionLevel.LAB_TECHNICIAN]: {
    category: "Research Staff",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FlaskConical
  },
  [PositionLevel.SENIOR_LAB_TECHNICIAN]: {
    category: "Research Staff",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FlaskConical
  },

  // Students
  [PositionLevel.UNDERGRADUATE_STUDENT]: {
    category: "Students",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: GraduationCap
  },
  [PositionLevel.MASTERS_STUDENT]: {
    category: "Students",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: GraduationCap
  },
  [PositionLevel.PHD_STUDENT]: {
    category: "Students",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: GraduationCap
  },
  [PositionLevel.PHD_CANDIDATE]: {
    category: "Students",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: GraduationCap
  },

  // Postdoctoral
  [PositionLevel.POSTDOC_RESEARCH_ASSOCIATE]: {
    category: "Postdoctoral",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Users
  },
  [PositionLevel.POSTDOC_RESEARCH_FELLOW]: {
    category: "Postdoctoral",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Users
  },
  [PositionLevel.SENIOR_POSTDOC_RESEARCHER]: {
    category: "Postdoctoral",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Users
  },

  // Academic Faculty
  [PositionLevel.RESEARCH_FELLOW]: {
    category: "Academic Faculty",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Briefcase
  },
  [PositionLevel.SENIOR_RESEARCH_FELLOW]: {
    category: "Academic Faculty",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Briefcase
  },
  [PositionLevel.ASSISTANT_PROFESSOR]: {
    category: "Academic Faculty",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Briefcase
  },
  [PositionLevel.ASSOCIATE_PROFESSOR]: {
    category: "Academic Faculty",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Briefcase
  },
  [PositionLevel.PROFESSOR]: {
    category: "Academic Faculty",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Briefcase
  },
  [PositionLevel.HEAD_OF_DEPARTMENT]: {
    category: "Academic Faculty",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Briefcase
  },

  // Other
  [PositionLevel.VISITING_RESEARCHER]: {
    category: "Other",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Users
  },
  [PositionLevel.EXTERNAL_COLLABORATOR]: {
    category: "Other",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Users
  },
  [PositionLevel.LAB_MANAGER]: {
    category: "Other",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Users
  },
  [PositionLevel.ADMINISTRATIVE_STAFF]: {
    category: "Other",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Users
  },
}

export default function PositionBadge({
  positionLevel,
  positionDisplayName,
  size = "md",
  showIcon = true,
  isPrincipalInvestigator = false
}: PositionBadgeProps) {
  const config = POSITION_CATEGORY_CONFIG[positionLevel]
  const displayName = positionDisplayName || POSITION_DISPLAY_NAMES[positionLevel]
  const Icon = config.icon

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
      >
        {showIcon && <Icon className={iconSizes[size]} />}
        {displayName}
      </span>

      {isPrincipalInvestigator && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border bg-yellow-100 text-yellow-700 border-yellow-200 font-medium ${sizeClasses[size]}`}
          title="Principal Investigator"
        >
          <Star className={iconSizes[size]} />
          PI
        </span>
      )}
    </div>
  )
}

// Compact version for lists
export function PositionBadgeCompact({
  positionLevel,
  isPrincipalInvestigator = false
}: {
  positionLevel: PositionLevel
  isPrincipalInvestigator?: boolean
}) {
  const config = POSITION_CATEGORY_CONFIG[positionLevel]
  const displayName = POSITION_DISPLAY_NAMES[positionLevel]

  return (
    <div className="inline-flex items-center gap-1">
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${config.color}`}
        title={displayName}
      >
        {displayName.split(" ").map(word => word[0]).join("")}
      </span>
      {isPrincipalInvestigator && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700 border border-yellow-200"
          title="Principal Investigator"
        >
          <Star className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  )
}

// Helper to get position category color for styling
export function getPositionCategoryColor(positionLevel: PositionLevel): string {
  return POSITION_CATEGORY_CONFIG[positionLevel]?.color || "bg-gray-100 text-gray-700"
}

// Helper to get position category
export function getPositionCategory(positionLevel: PositionLevel): string {
  return POSITION_CATEGORY_CONFIG[positionLevel]?.category || "Other"
}
