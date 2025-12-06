"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react"
import { PersonProfile } from "@/lib/types"
import { FirestoreUser } from "@/lib/firestoreService"
import { updateProfile } from "@/lib/services/profileService"
import { uploadFile, deleteFile } from "@/lib/storage"
import { linkOrcidToCurrentUser, resyncOrcidProfile } from "@/lib/auth/orcid"
import { syncOrcidRecord } from "@/lib/orcidService"
import { OrcidBadge } from "@/components/OrcidBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  BookOpen,
  Building,
  Camera,
  Save,
  Edit,
  X,
  ExternalLink,
  RefreshCw,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react"
import { logger } from "@/lib/logger"
import { useToast } from "@/lib/toast"
import { PositionLevel, POSITION_DISPLAY_NAMES } from "@/lib/types"
import { CollaboratorsList } from "@/components/profile/CollaboratorsList"

interface EnhancedProfilePageProps {
  currentUser: FirestoreUser
  currentUserProfile: PersonProfile
}

export function EnhancedProfilePage({
  currentUser,
  currentUserProfile: initialProfile,
}: EnhancedProfilePageProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const [profile, setProfile] = useState<PersonProfile>(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSyncingOrcid, setIsSyncingOrcid] = useState(false)
  const [formData, setFormData] = useState<Partial<PersonProfile>>({
    firstName: initialProfile.firstName,
    lastName: initialProfile.lastName,
    email: initialProfile.email,
    phone: initialProfile.phone || "",
    officeLocation: initialProfile.officeLocation || "",
    researchInterests: initialProfile.researchInterests || [],
    qualifications: initialProfile.qualifications || [],
    notes: initialProfile.notes || "",
    positionLevel: initialProfile.positionLevel,
  })

  useEffect(() => {
    setProfile(initialProfile)
    setFormData({
      firstName: initialProfile.firstName,
      lastName: initialProfile.lastName,
      email: initialProfile.email,
      phone: initialProfile.phone || "",
      officeLocation: initialProfile.officeLocation || "",
      researchInterests: initialProfile.researchInterests || [],
      qualifications: initialProfile.qualifications || [],
      notes: initialProfile.notes || "",
      positionLevel: initialProfile.positionLevel,
    })
  }, [initialProfile])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates: Partial<PersonProfile> = {
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        email: formData.email!,
        phone: formData.phone || "",
        officeLocation: formData.officeLocation || "",
        researchInterests: formData.researchInterests || [],
        qualifications: formData.qualifications || [],
        notes: formData.notes || "",
        positionLevel: formData.positionLevel,
        updatedAt: new Date().toISOString(),
      }

      await updateProfile(profile.id, updates)
      setProfile({ ...profile, ...updates })
      setIsEditing(false)
      toastSuccess("Profile updated successfully")
    } catch (error: any) {
      logger.error("Error updating profile", error)
      toastError(`Failed to update profile: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toastError("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError("Image must be less than 5MB")
      return
    }

    setIsUploadingPhoto(true)
    try {
      // Delete old photo if exists
      if (profile.avatarUrl) {
        try {
          const oldPath = profile.avatarUrl.split("/o/")[1]?.split("?")[0]
          if (oldPath) {
            await deleteFile(decodeURIComponent(oldPath))
          }
        } catch (error) {
          logger.warn("Error deleting old photo", error instanceof Error ? error : new Error(String(error)))
        }
      }

      // Upload new photo
      const path = `avatars/${currentUser.uid}/${Date.now()}_${file.name}`
      const result = await uploadFile(file, path)

      // Update profile with new photo URL
      await updateProfile(profile.id, {
        avatarUrl: result.url,
        updatedAt: new Date().toISOString(),
      })

      setProfile({ ...profile, avatarUrl: result.url })
      toastSuccess("Profile photo updated successfully")
    } catch (error: any) {
      logger.error("Error uploading photo", error)
      toastError(`Failed to upload photo: ${error.message}`)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!profile.avatarUrl) return

    try {
      const path = profile.avatarUrl.split("/o/")[1]?.split("?")[0]
      if (path) {
        await deleteFile(decodeURIComponent(path))
      }

      await updateProfile(profile.id, {
        avatarUrl: undefined,
        updatedAt: new Date().toISOString(),
      })

      setProfile({ ...profile, avatarUrl: undefined })
      toastSuccess("Profile photo removed")
    } catch (error: any) {
      logger.error("Error deleting photo", error)
      toastError(`Failed to delete photo: ${error.message}`)
    }
  }

  const handleLinkOrcid = async () => {
    setIsSyncingOrcid(true)
    try {
      const result = await linkOrcidToCurrentUser()

      // Update profile with ORCID info
      await updateProfile(profile.id, {
        orcidId: result.orcid,
        orcidUrl: result.orcidUrl,
        orcidVerified: true,
        orcidLastSynced: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      setProfile({
        ...profile,
        orcidId: result.orcid,
        orcidUrl: result.orcidUrl,
        orcidVerified: true,
        orcidLastSynced: new Date().toISOString(),
      })

      toastSuccess("ORCID linked successfully")
    } catch (error: any) {
      logger.error("Error linking ORCID", error)
      toastError(`Failed to link ORCID: ${error.message}`)
    } finally {
      setIsSyncingOrcid(false)
    }
  }

  const handleSyncOrcid = async () => {
    setIsSyncingOrcid(true)
    try {
      if (profile.orcidId) {
        // Sync ORCID record
        await syncOrcidRecord(profile.orcidId, undefined, currentUser.uid)

        // Also trigger backend resync
        await resyncOrcidProfile(true)

        await updateProfile(profile.id, {
          orcidLastSynced: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        setProfile({
          ...profile,
          orcidLastSynced: new Date().toISOString(),
        })

        toastSuccess("ORCID data synced successfully")
      }
    } catch (error: any) {
      logger.error("Error syncing ORCID", error)
      toastError(`Failed to sync ORCID: ${error.message}`)
    } finally {
      setIsSyncingOrcid(false)
    }
  }

  const handleImportNBIB = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      try {
        const importedWorks = parseNBIB(text)
        if (importedWorks.length === 0) {
          toastError("No valid references found in NBIB file")
          return
        }

        // Merge with existing works
        // We'll append them to orcidWorks for now, filtering duplicates by title/doi if possible
        const existingWorks = profile.orcidWorks || []
        const newWorks = [...existingWorks]
        let addedCount = 0

        importedWorks.forEach(work => {
          // Simple duplicate check by title or DOI
          const exists = existingWorks.some((w: any) =>
            (w.doi && w.doi === work.doi) ||
            (w.title && w.title.toLowerCase() === work.title.toLowerCase())
          )
          if (!exists) {
            newWorks.push({
              ...work,
              source: 'manual-nbib-import',
              importedAt: new Date().toISOString()
            })
            addedCount++
          }
        })

        if (addedCount > 0) {
          await updateProfile(profile.id, {
            orcidWorks: newWorks,
            updatedAt: new Date().toISOString()
          })
          setProfile({ ...profile, orcidWorks: newWorks })
          toastSuccess(`Imported ${addedCount} new reference(s)`)
        } else {
          toastSuccess("No new references to import (duplicates skipped)")
        }

      } catch (err) {
        console.error("NBIB Import Error", err)
        toastError("Failed to parse NBIB file")
      }
    }
    reader.readAsText(file)
  }

  const parseNBIB = (text: string) => {
    const lines = text.split('\n')
    const works: any[] = []
    let currentWork: any = {}
    let currentTag = ''

    lines.forEach(line => {
      const match = line.match(/^([A-Z]{2,4})\s*-(.*)/)
      if (match) {
        currentTag = match[1].trim()
        const value = match[2].trim()

        if (currentTag === 'PMID') {
          if (Object.keys(currentWork).length > 0) {
            works.push(currentWork)
            currentWork = {}
          }
          currentWork.pmid = value
        } else if (currentTag === 'TI') {
          currentWork.title = value
        } else if (currentTag === 'AB') {
          currentWork.abstract = value
        } else if (currentTag === 'FAU') { // Full Author Name
          if (!currentWork.authors) currentWork.authors = []
          currentWork.authors.push(value)
        } else if (currentTag === 'DP') {
          currentWork.publicationDate = value
        } else if (currentTag === 'TA' || currentTag === 'JT') {
          currentWork.journal = value
        } else if (currentTag === 'LID') {
          if (value.includes('[doi]')) {
            currentWork.doi = value.replace('[doi]', '').trim()
          }
        }
      } else {
        // Continuation lines
        if (currentTag && ['TI', 'AB'].includes(currentTag)) {
          const cleanLine = line.trim()
          if (cleanLine) {
            if (currentTag === 'TI') currentWork.title += ' ' + cleanLine
            if (currentTag === 'AB') currentWork.abstract += ' ' + cleanLine
          }
        }
      }
    })
    if (Object.keys(currentWork).length > 0) works.push(currentWork)
    return works
  }

  const addArrayItem = (field: "researchInterests" | "qualifications") => {
    const current = formData[field] || []
    setFormData({ ...formData, [field]: [...current, ""] })
  }

  const updateArrayItem = (
    field: "researchInterests" | "qualifications",
    index: number,
    value: string
  ) => {
    const current = formData[field] || []
    const updated = [...current]
    updated[index] = value
    setFormData({ ...formData, [field]: updated })
  }

  const removeArrayItem = (
    field: "researchInterests" | "qualifications",
    index: number
  ) => {
    const current = formData[field] || []
    const updated = current.filter((_, i) => i !== index)
    setFormData({ ...formData, [field]: updated })
  }

  const getInitials = () => {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
  }

  const getAvatarColor = () => {
    const hash = profile.id.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile information and research identity
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setFormData({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                    phone: profile.phone || "",
                    officeLocation: profile.officeLocation || "",
                    researchInterests: profile.researchInterests || [],
                    qualifications: profile.qualifications || [],
                    notes: profile.notes || "",
                    positionLevel: profile.positionLevel,
                  })
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Photo & Basic Info */}
          <div className="space-y-6">
            {/* Profile Photo Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
                <CardDescription>Upload a professional photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  {profile.avatarUrl ? (
                    <div className="relative">
                      <img
                        src={profile.avatarUrl}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        className="w-32 h-32 rounded-full object-cover border-4 border-border"
                      />
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                          onClick={handleDeletePhoto}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-border"
                      style={{ backgroundColor: getAvatarColor() }}
                    >
                      {getInitials()}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        asChild
                        disabled={isUploadingPhoto}
                      >
                        <span>
                          {isUploadingPhoto ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                          {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploadingPhoto}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground text-center">
                      JPG, PNG or GIF. Max 5MB
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="flex items-center gap-2 text-foreground">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {profile.firstName} {profile.lastName}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 text-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                </div>
                {profile.phone && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.phone}</span>
                      </div>
                    </div>
                  </>
                )}
                {profile.officeLocation && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Office Location</Label>
                      <div className="flex items-center gap-2 text-foreground">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.officeLocation}</span>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="space-y-2">
                  <Label>Position</Label>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">
                      {profile.positionLevel
                        ? POSITION_DISPLAY_NAMES[profile.positionLevel]
                        : profile.position || "Not specified"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>{profile.organisationName}</div>
                    <div>{profile.instituteName}</div>
                    <div>{profile.labName}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Editable Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* ORCID Integration Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ORCID Integration</CardTitle>
                    <CardDescription>
                      Link your ORCID iD to sync your research profile
                    </CardDescription>
                  </div>
                  {profile.orcidId && (
                    <OrcidBadge orcidId={profile.orcidId} verified={profile.orcidVerified} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.orcidId ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <div className="font-semibold">ORCID iD: {profile.orcidId}</div>
                        {profile.orcidLastSynced && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Last synced: {new Date(profile.orcidLastSynced).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSyncOrcid}
                          disabled={isSyncingOrcid}
                          className="flex items-center gap-2"
                        >
                          {isSyncingOrcid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={profile.orcidUrl || `https://orcid.org/${profile.orcidId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                      </div>
                    </div>
                    {profile.orcidData && (
                      <div className="space-y-2">
                        {profile.orcidData.biography && (
                          <div>
                            <Label className="text-sm font-semibold">Biography</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {profile.orcidData.biography}
                            </p>
                          </div>
                        )}
                        {profile.orcidData.employment && profile.orcidData.employment.length > 0 && (
                          <div>
                            <Label className="text-sm font-semibold">Employment</Label>
                            <div className="mt-1 space-y-1">
                              {profile.orcidData.employment.map((emp, idx) => (
                                <div key={idx} className="text-sm text-muted-foreground">
                                  {emp.role} at {emp.organization}
                                  {emp.startDate && ` (${emp.startDate})`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={handleLinkOrcid}
                    disabled={isSyncingOrcid}
                    className="w-full flex items-center gap-2"
                  >
                    {isSyncingOrcid ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Link ORCID iD
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Collaborators List */}
            {profile.orcidData?.works && profile.orcidData.works.length > 0 && (
              <CollaboratorsList works={profile.orcidData.works} />
            )}

            {/* Manual Import Card */}
            <Card>
              <CardHeader>
                <CardTitle>Import References</CardTitle>
                <CardDescription>
                  Import citations from PubMed (NBIB) or other formats to populate your network if ORCID sync is incomplete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="relative cursor-pointer" asChild>
                    <label>
                      <Upload className="h-4 w-4 mr-2" />
                      Import .nbib File
                      <input
                        type="file"
                        accept=".nbib,.txt"
                        className="hidden"
                        onChange={handleImportNBIB}
                      />
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Supports standard Medline/PubMed NBIB format.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Editable Profile Information */}
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile Information</CardTitle>
                  <CardDescription>Update your profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName || ""}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName || ""}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="officeLocation">Office Location</Label>
                      <Input
                        id="officeLocation"
                        value={formData.officeLocation || ""}
                        onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                        placeholder="e.g., Building A, Room 301"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="positionLevel">Position</Label>
                    <select
                      id="positionLevel"
                      value={formData.positionLevel || ""}
                      onChange={(e) => setFormData({ ...formData, positionLevel: e.target.value as PositionLevel })}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background"
                    >
                      {Object.entries(POSITION_DISPLAY_NAMES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Separator />
                  <div>
                    <Label>Research Interests</Label>
                    <div className="space-y-2 mt-2">
                      {(formData.researchInterests || []).map((interest, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={interest}
                            onChange={(e) => updateArrayItem("researchInterests", index, e.target.value)}
                            placeholder="e.g., Microfluidics, Cell Analysis"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeArrayItem("researchInterests", index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem("researchInterests")}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Add Research Interest
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Qualifications</Label>
                    <div className="space-y-2 mt-2">
                      {(formData.qualifications || []).map((qual, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={qual}
                            onChange={(e) => updateArrayItem("qualifications", index, e.target.value)}
                            placeholder="e.g., PhD Molecular Biology, MSc Biochemistry"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeArrayItem("qualifications", index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem("qualifications")}
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Add Qualification
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      placeholder="Additional notes about your research or background..."
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Research Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.researchInterests && profile.researchInterests.length > 0 && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4" />
                        Research Interests
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {profile.researchInterests.map((interest, idx) => (
                          <Badge key={idx} variant="outline">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.qualifications && profile.qualifications.length > 0 && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <GraduationCap className="h-4 w-4" />
                        Qualifications
                      </Label>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {profile.qualifications.map((qual, idx) => (
                          <li key={idx}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {profile.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {profile.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div >
  )
}

