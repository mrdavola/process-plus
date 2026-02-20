Below is a single, unified spec that merges your **“Classic Grid” Flipgrid Rebuild** product requirements with the **Educator and Student step-by-step workflow**. It is written so an engineer can scaffold quickly and a designer can validate the experience against the classic Flipgrid loop.

1) Product Definition: “Classic Grid” (Classic Flipgrid 2018 Rebuild)
---------------------------------------------------------------------

### Purpose

A video-based discussion tool for education that recreates the high-engagement “Classic Flipgrid” loop:

**Educator creates Grid (classroom) → Educator posts Topic (prompt) → Students record video response → Students take a selfie thumbnail → Responses render in a shared grid layout.**

### Primary UX Non-Negotiables

*   **Thumbnail is a selfie, not auto-generated.**
    
*   **Recorder is a state machine** with **Pause/Resume that appends** to the same final recording.
    
*   **Grid view is visual-first**: show selfie thumbnails prominently in a playful masonry/honeycomb layout.
    
*   Teacher actions include **moderation**, **Spark**, **MixTapes**, and **Guest Mode**.
    

2) Technical Stack (Implementation Constraints)
-----------------------------------------------

*   **Frontend:** Next.js 14+ (App Router)
    
*   **Styling:** Tailwind CSS
    
    *   Playful UI: rounded-2xl / rounded-xl, vibrant colors, large touch targets, simple sans typography
        
    *   Color rules:
        
        *   Primary: **Sky Blue**
            
        *   Success: **Emerald Green**
            
*   **Backend:** Firebase
    
    *   Firestore: data
        
    *   Auth: users
        
    *   Storage: video blobs + selfie thumbnails
        
*   **Video:** MediaStream Recording API or react-media-recorder
    
    *   Must support: pause/resume, multi-segment capture, trim, selfie phase
        

3) Firestore Data Model (Final, Combined Schema)
------------------------------------------------

Create these TypeScript interfaces in types.ts and mirror in Firestore collections.

### A) grids (Classroom / Community)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export interface Grid {    id: string;                 // Firestore Auto-ID    ownerId: string;            // educator userId    title: string;              // "Mr. Davola's History Class"    flipCode: string;           // unique join slug, "davola2025"    password?: string;          // optional guest password    allowedEmailDomains: string[]; // ["@schools.org"]    theme: string;              // banner image URL    coPilots: string[];         // educator userIds with edit access  }   `

**Workflow mapping (Educator Setup):**

*   “New Grid” button creates this doc.
    
*   Access mode choices (domain, student IDs, public) map into allowedEmailDomains and optional password.
    

### B) topics (Prompt / Discussion)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export type MediaResourceType = "video" | "image" | "youtube" | "giphy";  export interface MediaResource {    type: MediaResourceType;    url: string;  }  export interface TopicSettings {    maxDuration: number;      // seconds: 15,30,60,90,180,300    moderation: boolean;      // hide responses until approved    // optional expansion toggles (from workflow guide)    selfieDecorations?: boolean;    videoReactions?: boolean;    studentReplies?: boolean;  }  export type TopicStatus = "active" | "frozen" | "hidden";  export interface Topic {    id: string;               // Firestore Auto-ID    gridId: string;           // parent Grid    title: string;    promptText: string;       // treat as rich text (store HTML or JSON)    mediaResource?: MediaResource;    settings: TopicSettings;    status: TopicStatus;  }   `

**Workflow mapping (Educator Topic Creation):**

*   “New Topic” creates this doc.
    
*   Recording time limit maps to settings.maxDuration.
    
*   Moderation toggle maps to settings.moderation.
    
*   Topic resources (video/image/gif/youtube) map to mediaResource.
    

### C) responses (Student Work)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export type ResponseStatus = "active" | "hidden";  export interface Response {    id: string;               // Firestore Auto-ID    topicId: string;    userId: string;           // student auth UID OR guest session id    userDisplayName: string;  // captured at submit time    videoUrl: string;         // Firebase Storage download URL    thumbnailUrl: string;     // Firebase Storage download URL (selfie)    status: ResponseStatus;    views: number;    reactions: string[];      // array of userIds who liked    sparkedFromId?: string;   // if turned into a new topic  }   `

**Workflow mapping (Student Submission):**

*   Video blob uploaded to Storage, URL stored in videoUrl.
    
*   Selfie image uploaded to Storage, URL stored in thumbnailUrl (critical).
    

### D) Additions Needed for Your Feature Set

These are required to fully support Spark, MixTapes, and Guest Mode.

#### playlists (MixTapes)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export interface Playlist {    id: string;    ownerId: string;        // educator    title: string;    responseIds: string[];  // ordered list    isPublic: boolean;    publicSlug: string;     // unique URL slug    createdAt: number;  }   `

#### guestCodes (Topic-level Guest Bypass)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   export interface GuestCode {    id: string;    topicId: string;    code: string;           // "GUEST-123"    expiresAt?: number;    maxUses?: number;    uses: number;    createdBy: string;      // educator userId  }   `

4) End-to-End Workflows (Educator + Student)
--------------------------------------------

### Phase 1: Educator Workflow (Setup & Creation)

#### 1) Account Creation & Onboarding

*   Auth via Google/Microsoft (Firebase Auth providers).
    
*   Capture profile fields at first login (can be Firestore users profile doc).
    

#### 2) Create a Grid (Community)

Educator actions:

1.  Click **\+ New Grid**
    
2.  Choose access type:
    
    *   **School email domain** → enforce allowedEmailDomains
        
    *   **Student IDs** → optional future add-on (can be separate roster collection)
        
    *   **Public/PLC** → domain check off, optional email verification logic
        
3.  Enter:
    
    *   Grid Title
        
    *   Flip Code (unique slug)
        
    *   Theme / cover image
        
4.  Save → create grids doc
    

#### 3) Create a Topic (Prompt)

Educator actions:

1.  Select Grid → **New Topic**
    
2.  Enter title + promptText
    
3.  Add mediaResource (video/image/youtube/giphy)
    
4.  Configure settings:
    
    *   maxDuration
        
    *   moderation
        
    *   (optional toggles) selfieDecorations, reactions, replies
        
5.  Post Topic → create topics doc
    

### Phase 2: Student Workflow (Record & Submit)

#### 1) Access a Topic

Student actions:

1.  Go to app
    
2.  Enter **Join Code** (flipCode) or open shared Topic link
    
3.  Auth pathways:
    
    *   School login (domain restriction check)
        
    *   Guest code (topic-level bypass) if provided
        

#### 2) The Recorder (State Machine, Required)

The recorder must implement these states and transitions.

##### State: **IDLE**

UI requirements:

*   Large **Record** button (Primary: Sky Blue)
    
*   Draggable **Prompt Stickie** overlay showing the promptText
    
*   Options:
    
    *   Upload Clip
        
    *   Mic Only Mode
        

Transitions:

*   Record → RECORDING
    
*   Upload Clip → REVIEW (or directly to SELFIE if you skip trimming)
    
*   Mic Only Mode → RECORDING (audio-only track with placeholder visual)
    

##### State: **RECORDING**

UI requirements:

*   Progress bar filling based on topic.settings.maxDuration
    
*   Controls:
    
    *   Pause
        
    *   Resume
        
    *   Stop/Next
        
*   Must append pause/resume segments into one final video asset (not separate response docs)
    

Transitions:

*   Pause → remain RECORDING (paused substate)
    
*   Stop/Next → REVIEW
    

##### State: **REVIEW (Trimming)**

UI requirements:

*   Auto-play loop
    
*   Actions:
    
    *   Trim start/end
        
    *   Delete and Retake
        

Transitions:

*   Next → SELFIE
    
*   Delete and Retake → IDLE
    

##### State: **SELFIE (Thumbnail Required)**

Non-negotiable requirements:

*   Re-open camera for a still photo
    
*   Do not auto-generate from video
    

Decoration layer:

*   Drawing tool
    
*   Emoji/sticker overlays (if topic setting allows)
    

Transitions:

*   Confirm selfie → SUBMIT
    
*   Retake selfie → SELFIE
    

##### State: **SUBMIT**

UI requirements:

*   Ask Display Name (if not logged in)
    
*   Upload video + selfie to Firebase Storage
    
*   Create response doc in Firestore
    

Transitions:

*   Success → TopicView (grid) with new tile visible (or hidden if moderation true)
    

### Phase 3: Feedback & Management (Educator)

#### 1) Review Responses (Moderation)

*   If topic.settings.moderation === true, new responses default to status: "hidden"
    
*   Educator can approve to status: "active"
    

#### 2) Spark (Teacher turns a great response into a new topic)

**Function:** sparkResponse(responseId)Logic:

1.  Fetch responses/{responseId}
    
2.  Create new topics doc:
    
    *   Same gridId
        
    *   Title like: “Sparked: {originalDisplayName}”
        
    *   mediaResource = { type: "video", url: response.videoUrl }
        
    *   settings copied or reset to defaults
        
3.  Update original response:
    
    *   sparkedFromId or create a reverse link depending on preference
        

#### 3) MixTapes (Playlists)

*   Educator selects responses across topics
    
*   Adds to playlist order
    
*   Playlist generates a public URL via publicSlug
    

#### 4) Guest Mode (Topic-level bypass)

*   Educator generates guestCodes for a topic
    
*   Student entering guest code skips email domain restriction for that topic only
    

5) Implementation Blueprint (What You Build First)
--------------------------------------------------

### Step 1: Firebase + Firestore Data Helpers

Deliverables:

*   src/lib/firebase.ts (init app, auth, firestore, storage)
    
*   src/lib/types.ts (interfaces above)
    
*   src/lib/firestore.ts (helpers: createGrid, createTopic, createResponse, getTopicResponses, etc.)
    
*   Security Rules draft aligned to:
    
    *   educator ownerId/coPilots write access
        
    *   students write only their own responses
        
    *   moderation gating on read visibility if needed
        

### Step 2: RecorderModal (Core Component)

Deliverables:

*   RecorderModal.tsx implementing the required state machine:
    
    *   IDLE → RECORDING → REVIEW → SELFIE → SUBMIT
        
*   Pause/Resume that appends
    
*   Selfie capture with drawing/stickers layer
    
*   Upload pipeline to Storage, then write responses doc
    

### Step 3: TopicView Page (Grid View)

Deliverables:

*   /app/grids/\[flipCode\]/topics/\[topicId\]/page.tsx (or similar routing)
    
*   Fetch topic + responses
    
*   Render **masonry/honeycomb** grid using thumbnailUrl
    
*   Hover preview behavior
    
*   Theater mode modal playback
    

6) UI Contract (So Design and Engineering Match)
------------------------------------------------

### Visual Style Rules

*   Large touch targets, friendly typography
    
*   Buttons: rounded-2xl, bold labels
    
*   Primary actions: Sky Blue
    
*   Success / confirm: Emerald Green
    
*   Cards/tiles: rounded, subtle shadow, high contrast selfie image
    

### Grid Tile Requirements

Each response tile must show:

*   Selfie thumbnail (dominant)
    
*   Display name
    
*   Quick reaction indicator (optional)
    
*   Hover: scale up or preview play (lightweight)
    

### Theater Mode Requirements

*   Modal overlay
    
*   Video player
    
*   Next/Prev navigation
    
*   View count increments (optional, but schema supports it)
    

If you want the fastest path to code, I can convert the unified spec above into a **single engineering starter pack** (folder structure, types.ts, Firebase helpers, and a Recorder state machine skeleton) in one consolidated output, aligned to Next.js App Router conventions.