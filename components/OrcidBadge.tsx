/**
 * ORCID Badge Component
 * Displays a verified ORCID badge with link to ORCID profile
 */

import { ExternalLink } from "lucide-react"

interface OrcidBadgeProps {
  orcidId: string
  verified?: boolean
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function OrcidBadge({
  orcidId,
  verified = true,
  size = "sm",
  showLabel = false,
  className = ""
}: OrcidBadgeProps) {
  if (!orcidId) return null

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  }

  const orcidUrl = `https://orcid.org/${orcidId}`

  return (
    <a
      href={orcidUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#A6CE39]/10 hover:bg-[#A6CE39]/20 transition-colors border border-[#A6CE39]/30 ${className}`}
      title={`ORCID iD: ${orcidId}`}
    >
      {/* ORCID Logo SVG */}
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ORCID logo"
      >
        <path
          fill="#A6CE39"
          d="M256,128c0,70.7-57.3,128-128,128C57.3,256,0,198.7,0,128C0,57.3,57.3,0,128,0C198.7,0,256,57.3,256,128z"
        />
        <g>
          <path
            fill="#FFFFFF"
            d="M86.3,186.2H70.9V79.1h15.4v48.4V186.2z"
          />
          <path
            fill="#FFFFFF"
            d="M108.9,79.1h41.6c39.6,0,57,28.3,57,53.6c0,27.5-21.5,53.6-56.8,53.6h-41.8V79.1z M124.3,172.4h24.5 c34.9,0,42.9-26.5,42.9-39.7c0-21.5-13.7-39.7-43.7-39.7h-23.7V172.4z"
          />
          <path
            fill="#FFFFFF"
            d="M88.7,56.8c0,5.5-4.5,10.1-10.1,10.1c-5.6,0-10.1-4.6-10.1-10.1c0-5.6,4.5-10.1,10.1-10.1 C84.2,46.7,88.7,51.3,88.7,56.8z"
          />
        </g>
      </svg>

      {showLabel && (
        <span className={`font-medium text-[#A6CE39] ${textSizeClasses[size]}`}>
          {orcidId}
        </span>
      )}

      {verified && !showLabel && (
        <span className={`text-[#A6CE39] ${textSizeClasses[size]} font-medium`}>
          Verified
        </span>
      )}

      <ExternalLink className={`${sizeClasses[size]} text-[#A6CE39]`} />
    </a>
  )
}

/**
 * Mini ORCID icon for compact spaces
 */
export function OrcidIcon({ size = "sm", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ORCID logo"
    >
      <path
        fill="#A6CE39"
        d="M256,128c0,70.7-57.3,128-128,128C57.3,256,0,198.7,0,128C0,57.3,57.3,0,128,0C198.7,0,256,57.3,256,128z"
      />
      <g>
        <path
          fill="#FFFFFF"
          d="M86.3,186.2H70.9V79.1h15.4v48.4V186.2z"
        />
        <path
          fill="#FFFFFF"
          d="M108.9,79.1h41.6c39.6,0,57,28.3,57,53.6c0,27.5-21.5,53.6-56.8,53.6h-41.8V79.1z M124.3,172.4h24.5 c34.9,0,42.9-26.5,42.9-39.7c0-21.5-13.7-39.7-43.7-39.7h-23.7V172.4z"
        />
        <path
          fill="#FFFFFF"
          d="M88.7,56.8c0,5.5-4.5,10.1-10.1,10.1c-5.6,0-10.1-4.6-10.1-10.1c0-5.6,4.5-10.1,10.1-10.1 C84.2,46.7,88.7,51.3,88.7,56.8z"
        />
      </g>
    </svg>
  )
}
