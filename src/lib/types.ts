
export type UserRole = "admin" | "teacher" | "student";

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt?: number;
}

export interface Studio {
    id: string;                 // Firestore Auto-ID
    ownerId: string;            // educator userId
    title: string;              // "Mr. Davola's History Class"
    processPlusCode: string;           // unique join slug, "davola2025"
    password?: string;          // optional guest password
    allowedEmailDomains: string[]; // ["@schools.org"]
    theme: string;              // banner image URL
    coPilots: string[];         // educator userIds with edit access
    status: "active" | "archived";
    settings: {
        allowGuestAccess: boolean;
        moderation: boolean;
    };
    createdAt?: number;
    updatedAt?: number;
    icon?: string;
}

export type MediaResourceType = "video" | "image" | "youtube" | "giphy";

export interface MediaResource {
    type: MediaResourceType;
    url: string;
}

export interface ProjectSettings {
    maxDuration: number;      // seconds: 15,30,60,90,180,300
    micOnly: boolean;         // true = audio only, false = camera required
    uploadClip: boolean;      // true = can import videos
    pauseResume: boolean;     // true = can pause/resume
    selfieDecorations: boolean; // true = stickers/drawing on selfie
    moderation: boolean;      // hide responses until approved
    studentReplies: boolean;  // true = student video replies
    videoReactions: boolean;  // true = likes
    guestCode?: string;       // bypass domain restrictions
    feedbackbackType: "basic" | "rubric" | "none";
    privatefeedbackback: boolean; // teacher-only Responses
}

export type ProjectStatus = "active" | "frozen" | "hidden";

export interface Project {
    id: string;               // Firestore Auto-ID
    studioId: string;           // parent Studio
    joinCode: string;         // unique code to join directly
    title: string;
    promptText: string;       // treat as rich text
    projectTip?: string;        // short hint
    mediaResource?: MediaResource;
    settings: ProjectSettings;
    status: ProjectStatus;
    scheduledRelease?: number; // timestamp
    closeDate?: number;       // timestamp
    createdAt?: number;
    updatedAt?: number;
    icon?: string;            // emoji or short icon URL
    responseCount?: number;
    pendingCount?: number;
    lastResponseAt?: number;
}

export type ResponseStatus = "active" | "hidden";

export interface Response {
    id: string;               // Firestore Auto-ID
    projectId: string;
    userId: string;           // student auth UID OR guest session id
    userDisplayName: string;  // captured at submit time
    videoUrl: string;         // Firebase Storage download URL
    thumbnailUrl: string;     // Firebase Storage download URL (selfie)
    status: ResponseStatus;
    views: number;
    reactions: string[];      // array of userIds who liked
    reflections?: string[];
    sparkedFromId?: string;   // if turned into a new project
    replyToId?: string;       // if this is a reply to another response
    feedback?: {              // teacher feedback
        text: string;
        rubricScore?: Record<string, number>;
    };
    createdAt?: number;
    isSpotlighted?: boolean;
    observationsCount?: number;
}

export interface Playlist {
    id: string;
    ownerId: string;        // educator
    title: string;
    responseIds: string[];  // ordered list
    isPublic: boolean;
    publicSlug: string;     // unique URL slug
    createdAt: number;
}

export interface GuestCode {
    id: string;
    projectId: string;
    code: string;           // "GUEST-123"
    expiresAt?: number;
    maxUses?: number;
    uses: number;
    createdBy: string;      // educator userId
}

export type NotificationType = "new_response" | "pending_approval" | "project_sparked";

export interface Notification {
    id: string;
    recipientId: string;
    studioId: string;
    projectId?: string;
    responseId?: string;
    type: NotificationType;
    title: string;
    body?: string;
    createdAt: number;
    read: boolean;
}
