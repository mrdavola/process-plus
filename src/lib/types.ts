
export type UserRole = "admin" | "teacher" | "student";

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt?: number;
}

export interface Grid {
    id: string;                 // Firestore Auto-ID
    ownerId: string;            // educator userId
    title: string;              // "Mr. Davola's History Class"
    flipCode: string;           // unique join slug, "davola2025"
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

export interface TopicSettings {
    maxDuration: number;      // seconds: 15,30,60,90,180,300
    micOnly: boolean;         // true = audio only, false = camera required
    uploadClip: boolean;      // true = can import videos
    pauseResume: boolean;     // true = can pause/resume
    selfieDecorations: boolean; // true = stickers/drawing on selfie
    moderation: boolean;      // hide responses until approved
    studentReplies: boolean;  // true = student video replies
    videoReactions: boolean;  // true = likes
    guestCode?: string;       // bypass domain restrictions
    feedbackType: "basic" | "rubric" | "none";
    privateFeedback: boolean; // teacher-only comments
}

export type TopicStatus = "active" | "frozen" | "hidden";

export interface Topic {
    id: string;               // Firestore Auto-ID
    gridId: string;           // parent Grid
    joinCode: string;         // unique code to join directly
    title: string;
    promptText: string;       // treat as rich text
    topicTip?: string;        // short hint
    mediaResource?: MediaResource;
    settings: TopicSettings;
    status: TopicStatus;
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
    topicId: string;
    userId: string;           // student auth UID OR guest session id
    userDisplayName: string;  // captured at submit time
    videoUrl: string;         // Firebase Storage download URL
    thumbnailUrl: string;     // Firebase Storage download URL (selfie)
    status: ResponseStatus;
    views: number;
    reactions: string[];      // array of userIds who liked
    sparkedFromId?: string;   // if turned into a new topic
    replyToId?: string;       // if this is a reply to another response
    feedback?: {              // teacher feedback
        text: string;
        rubricScore?: Record<string, number>;
    };
    createdAt?: number;
    reactionsCount?: number;
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
    topicId: string;
    code: string;           // "GUEST-123"
    expiresAt?: number;
    maxUses?: number;
    uses: number;
    createdBy: string;      // educator userId
}

export type NotificationType = "new_response" | "pending_approval" | "topic_sparked";

export interface Notification {
    id: string;
    recipientId: string;
    gridId: string;
    topicId?: string;
    responseId?: string;
    type: NotificationType;
    title: string;
    body?: string;
    createdAt: number;
    read: boolean;
}
