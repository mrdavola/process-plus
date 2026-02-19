
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
    createdAt?: number;
}

export type MediaResourceType = "video" | "image" | "youtube" | "giphy";

export interface MediaResource {
    type: MediaResourceType;
    url: string;
}

export interface TopicSettings {
    maxDuration: number;      // seconds: 15,30,60,90,180,300
    moderation: boolean;      // hide responses until approved
    // optional expansion toggles
    selfieDecorations?: boolean;
    videoReactions?: boolean;
    studentReplies?: boolean;
}

export type TopicStatus = "active" | "frozen" | "hidden";

export interface Topic {
    id: string;               // Firestore Auto-ID
    gridId: string;           // parent Grid
    title: string;
    promptText: string;       // treat as rich text (store HTML or JSON)
    mediaResource?: MediaResource;
    settings: TopicSettings;
    status: TopicStatus;
    createdAt?: number;
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
    createdAt?: number;
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
