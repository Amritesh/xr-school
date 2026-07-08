import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "XR School Lab Platform API" })
@server("https://api.xr-school-lab.local/v1", "Local or staging API endpoint")
@route("/v1")
namespace XrSchoolLabPlatform;

/* =========================
   Shared enums
   ========================= */

enum UserRole {
  superAdmin,
  programOwner,
  instructor,
  contentManager,
  schoolAdmin,
  supportOps
}

enum SchoolBoard {
  cbse,
  icse,
  stateBoard
}

enum IndianRegion {
  northEastIndia,
  eastIndia,
  northIndia,
  southIndia,
  westIndia,
  centralIndia
}

enum NorthEastState {
  arunachalPradesh,
  assam,
  manipur,
  meghalaya,
  mizoram,
  nagaland,
  sikkim,
  tripura
}

enum GradeBand {
  kindergarten,
  class1To2,
  class3To5,
  class6To8,
  class9To10,
  class11To12
}

enum Subject {
  science,
  physics,
  chemistry,
  biology,
  mathematics,
  geography,
  history,
  environmentalScience,
  computerScience,
  vocationalSkills,
  careerExposure
}

enum BloomLevel {
  remember,
  understand,
  apply,
  analyze,
  evaluate,
  create
}

enum XrFitType {
  strongVrFit,
  arTabletFit,
  normalClassroomBetter,
  physicalLabBetter,
  notWorthXr
}

enum SimulationFormat {
  immersiveVr,
  threeSixtyVr,
  interactive3d,
  guidedVisualization,
  practicalLabSimulation,
  virtualFieldVisit,
  revisionMode
}

enum EvidenceConfidenceLevel {
  experimental,
  expertDesigned,
  internallyPiloted,
  schoolValidated,
  researchBacked
}

enum ReleaseMaturity {
  catalogued,
  inDevelopment,
  internalQA,
  pilotReady,
  schoolValidated
}

enum OfflineSyncStatus {
  localOnly,
  queued,
  syncing,
  synced,
  failed,
  conflict
}

enum ContentPackStatus {
  draft,
  approved,
  released,
  deprecated,
  archived
}

enum ReleaseChannel {
  internal,
  pilot,
  schoolStable,
  regionalStable
}

enum DeviceType {
  metaQuestHeadset,
  chargingDock,
  storageCase,
  wifiRouter,
  instructorTablet,
  maintenanceLaptop
}

enum ComfortRiskLevel {
  low,
  medium,
  high
}

enum AssessmentType {
  preCheck,
  microQuiz,
  misconceptionCheck,
  postCheck,
  revisionCheck,
  instructorObservation
}

enum RevisionImportance {
  low,
  medium,
  high,
  examCritical
}

enum DifficultyLevel {
  easy,
  moderate,
  hard,
  advanced
}

/* =========================
   Shared models
   ========================= */

model ErrorResponse {
  code: string;
  message: string;
  details?: string[];
}

model PageRequest {
  @query page?: int32;
  @query pageSize?: int32;
}

model PageInfo {
  page: int32;
  pageSize: int32;
  totalItems: int32;
  totalPages: int32;
}

model Address {
  line1?: string;
  line2?: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  pincode?: string;
}

model AuditFields {
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
  createdBy?: string;
  updatedBy?: string;
}

/* =========================
   School and lab shell
   ========================= */

model School {
  id: string;
  name: string;
  board: SchoolBoard;
  stateBoardState?: string;
  region: IndianRegion;
  northEastState?: NorthEastState;
  address: Address;
  gradeBands: GradeBand[];
  estimatedStudents?: int32;
  notes?: string;
  ...AuditFields;
}

model LabDeployment {
  id: string;
  schoolId: string;
  labName: string;
  roomSizeSqFt: int32;
  expectedRoomSizeSqFt: int32;
  headsetCount: int32;
  expectedHeadsetCount: int32;
  classSize: int32;
  batchSize: int32;
  batchesPerClass: int32;
  projectorAvailable: boolean;
  instructorProvidedByUs: boolean;
  teacherSupportCount?: int32;
  offlineFirst: boolean;
  targetQuestStorageGb: int32;
  notes?: string;
  ...AuditFields;
}

model HardwareKit {
  id: string;
  labDeploymentId: string;
  devices: HardwareKitItem[];
  expectedSetupCostMinInr: int32;
  expectedSetupCostMaxInr: int32;
  monthlyStudentPriceInr: int32;
  warrantyNotes?: string;
  maintenanceNotes?: string;
  ...AuditFields;
}

model HardwareKitItem {
  deviceType: DeviceType;
  quantity: int32;
  required: boolean;
  notes?: string;
}

/* =========================
   Curriculum ontology
   ========================= */

model LearningConcept {
  id: string;
  canonicalName: string;
  subject: Subject;
  description: string;
  parentConceptId?: string;
  prerequisiteConceptIds?: string[];
  commonMisconceptions?: string[];
  visualizable: boolean;
  practicalRelevance?: string;
  ...AuditFields;
}

model CurriculumMap {
  id: string;
  board: SchoolBoard;
  stateBoardState?: string;
  gradeBand: GradeBand;
  subject: Subject;
  unit?: string;
  chapter?: string;
  topic: string;
  conceptIds: string[];
  subconceptIds?: string[];
  learningOutcome: string;
  bloomLevel: BloomLevel;
  prerequisiteConceptIds?: string[];
  misconceptions?: string[];
  assessmentTypes: AssessmentType[];
  revisionImportance: RevisionImportance;
  difficultyLevel: DifficultyLevel;
  languagePackIds?: string[];
  localContextRelevance?: string;
  practicalLabRelevance?: string;
  xrFitType: XrFitType;
  xrFitJustification: string;
  whyNotTextbookOrVideoOnly?: string;
  ...AuditFields;
}

/* =========================
   Simulation design system
   ========================= */

model CueCard {
  id: string;
  title: string;
  shortPrompt: string;
  visualAnchor?: string;
  conceptId: string;
  displayOrder: int32;
  instructorNote?: string;
  studentAction?: string;
  ...AuditFields;
}

model RevisionCard {
  id: string;
  title: string;
  recapText: string;
  conceptId: string;
  difficultyLevel: DifficultyLevel;
  spacedRevisionTag?: string;
  misconceptionReminder?: string;
  ...AuditFields;
}

model AssessmentHook {
  id: string;
  type: AssessmentType;
  questionText: string;
  expectedAnswer?: string;
  conceptId: string;
  misconceptionDetectedWhen?: string;
  scoringRule?: string;
  ...AuditFields;
}

model SimulationModule {
  id: string;
  title: string;
  slug: string;
  summary: string;
  gradeBands: GradeBand[];
  subjects: Subject[];
  applicableBoards: SchoolBoard[];
  stateBoardStates?: string[];
  curriculumMapIds: string[];
  conceptIds: string[];
  simulationFormat: SimulationFormat;
  evidenceConfidenceLevel: EvidenceConfidenceLevel;
  releaseMaturity: ReleaseMaturity;
  xrFitType: XrFitType;
  xrFitJustification: string;
  learningObjective: string;
  scientificConceptExplanation: string;
  prerequisiteConceptIds?: string[];
  misconceptionsAddressed?: string[];
  visualizationStrategy: string;
  interactionStrategy: string;
  imaginationHelperStrategy?: string;
  practicalUseCase?: string;
  cueCardIds: string[];
  revisionCardIds: string[];
  assessmentHookIds: string[];
  instructorScript: string;
  batchActivityPrompt?: string;
  expectedDurationMinutes: int32;
  maxSessionDurationMinutes: int32;
  comfortRiskLevel: ComfortRiskLevel;
  safetyNotes?: string[];
  offlineContentPackId?: string;
  estimatedPackageSizeMb?: int32;
  targetFrameRateFps?: int32;
  minQuestStorageGb?: int32;
  status: ContentPackStatus;
  ...AuditFields;
}

/* =========================
   Offline content packaging
   ========================= */

model OfflineContentPack {
  id: string;
  name: string;
  version: string;
  releaseChannel: ReleaseChannel;
  status: ContentPackStatus;
  moduleIds: string[];
  gradeBands: GradeBand[];
  subjects: Subject[];
  applicableBoards: SchoolBoard[];
  estimatedSizeMb: int32;
  requiresInternetAfterInstall: boolean;
  questStorageBudgetGb: int32;
  manifestPath?: string;
  checksum?: string;
  releaseNotes?: string;
  ...AuditFields;
}

model ContentVersion {
  id: string;
  entityType: string;
  entityId: string;
  version: string;
  changeSummary: string;
  approvedBy?: string;
  releaseChannel: ReleaseChannel;
  ...AuditFields;
}

model SyncJob {
  id: string;
  schoolId: string;
  labDeploymentId?: string;
  sourceDeviceId?: string;
  entityType: string;
  entityId: string;
  syncStatus: OfflineSyncStatus;
  retryCount: int32;
  lastAttemptAt?: utcDateTime;
  errorMessage?: string;
  payloadHash?: string;
  ...AuditFields;
}

/* =========================
   Instructor-led batch flow
   ========================= */

model Instructor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  region: IndianRegion;
  assignedStates?: NorthEastState[];
  active: boolean;
  ...AuditFields;
}

model BatchSession {
  id: string;
  schoolId: string;
  labDeploymentId: string;
  instructorId: string;
  moduleId: string;
  gradeBand: GradeBand;
  batchNumber: int32;
  batchSize: int32;
  totalClassSize: int32;
  plannedStartTime: utcDateTime;
  actualStartTime?: utcDateTime;
  actualEndTime?: utcDateTime;
  anonymousParticipantCount: int32;
  headsetCountUsed: int32;
  offline: boolean;
  syncStatus: OfflineSyncStatus;
  notes?: string;
  ...AuditFields;
}

/* =========================
   Evaluation engine
   ========================= */

model EvaluationRecord {
  id: string;
  schoolId: string;
  labDeploymentId: string;
  batchSessionId: string;
  moduleId: string;
  instructorId: string;
  gradeBand: GradeBand;
  anonymousParticipantCount: int32;
  preUnderstandingScore?: float64;
  postUnderstandingScore?: float64;
  improvementPercent?: float64;
  engagementScore?: float64;
  completionRate?: float64;
  confusionPoints?: string[];
  misconceptionsDetected?: string[];
  conceptsNeedingRevision?: string[];
  instructorObservation?: string;
  headsetComfortIssues?: string[];
  safetyIssues?: string[];
  syncStatus: OfflineSyncStatus;
  ...AuditFields;
}

/* =========================
   AI and Storybook boundary shell
   ========================= */

model StorybookComponentBoundary {
  id: string;
  componentName: string;
  packagePath: string;
  ownerDomain: string;
  allowedEditZones: string[];
  forbiddenEditZones: string[];
  requiredStories: string[];
  requiredTests: string[];
  mockDataPath?: string;
  ...AuditFields;
}

model AIChangeRequest {
  id: string;
  title: string;
  requestedByRole: UserRole;
  targetDomain: string;
  allowedFiles: string[];
  forbiddenFiles: string[];
  requiresTypeSpecChange: boolean;
  requiresStorybookUpdate: boolean;
  requiresDiagramUpdate: boolean;
  requiresTestUpdate: boolean;
  status: string;
  ...AuditFields;
}

/* =========================
   Future extension shell only
   ========================= */

model CRMLead {
  id: string;
  schoolId?: string;
  source?: string;
  status: string;
  notes?: string;
  futureShellOnly: boolean;
  ...AuditFields;
}

model Proposal {
  id: string;
  schoolId: string;
  title: string;
  estimatedSetupCostInr?: int32;
  monthlyStudentPriceInr?: int32;
  status: string;
  futureShellOnly: boolean;
  ...AuditFields;
}

model BillingPlan {
  id: string;
  schoolId: string;
  setupFeeInr?: int32;
  monthlyPricePerStudentInr?: int32;
  futureShellOnly: boolean;
  ...AuditFields;
}

/* =========================
   Request/response models
   ========================= */

model CreateLearningConceptRequest {
  canonicalName: string;
  subject: Subject;
  description: string;
  parentConceptId?: string;
  prerequisiteConceptIds?: string[];
  commonMisconceptions?: string[];
  visualizable: boolean;
  practicalRelevance?: string;
}

model CreateCurriculumMapRequest {
  board: SchoolBoard;
  stateBoardState?: string;
  gradeBand: GradeBand;
  subject: Subject;
  unit?: string;
  chapter?: string;
  topic: string;
  conceptIds: string[];
  subconceptIds?: string[];
  learningOutcome: string;
  bloomLevel: BloomLevel;
  prerequisiteConceptIds?: string[];
  misconceptions?: string[];
  assessmentTypes: AssessmentType[];
  revisionImportance: RevisionImportance;
  difficultyLevel: DifficultyLevel;
  languagePackIds?: string[];
  localContextRelevance?: string;
  practicalLabRelevance?: string;
  xrFitType: XrFitType;
  xrFitJustification: string;
  whyNotTextbookOrVideoOnly?: string;
}

model CreateCueCardRequest {
  title: string;
  shortPrompt: string;
  visualAnchor?: string;
  conceptId: string;
  displayOrder: int32;
  instructorNote?: string;
  studentAction?: string;
}

model CreateRevisionCardRequest {
  title: string;
  recapText: string;
  conceptId: string;
  difficultyLevel: DifficultyLevel;
  spacedRevisionTag?: string;
  misconceptionReminder?: string;
}

model CreateAssessmentHookRequest {
  type: AssessmentType;
  questionText: string;
  expectedAnswer?: string;
  conceptId: string;
  misconceptionDetectedWhen?: string;
  scoringRule?: string;
}

model CreateSimulationModuleRequest {
  title: string;
  slug: string;
  summary: string;
  gradeBands: GradeBand[];
  subjects: Subject[];
  applicableBoards: SchoolBoard[];
  stateBoardStates?: string[];
  curriculumMapIds: string[];
  conceptIds: string[];
  simulationFormat: SimulationFormat;
  evidenceConfidenceLevel: EvidenceConfidenceLevel;
  releaseMaturity: ReleaseMaturity;
  xrFitType: XrFitType;
  xrFitJustification: string;
  learningObjective: string;
  scientificConceptExplanation: string;
  prerequisiteConceptIds?: string[];
  misconceptionsAddressed?: string[];
  visualizationStrategy: string;
  interactionStrategy: string;
  imaginationHelperStrategy?: string;
  practicalUseCase?: string;
  cueCardIds: string[];
  revisionCardIds: string[];
  assessmentHookIds: string[];
  instructorScript: string;
  batchActivityPrompt?: string;
  expectedDurationMinutes: int32;
  maxSessionDurationMinutes: int32;
  comfortRiskLevel: ComfortRiskLevel;
  safetyNotes?: string[];
  offlineContentPackId?: string;
  estimatedPackageSizeMb?: int32;
  targetFrameRateFps?: int32;
  minQuestStorageGb?: int32;
  status: ContentPackStatus;
}

model CreateOfflineContentPackRequest {
  name: string;
  version: string;
  releaseChannel: ReleaseChannel;
  status: ContentPackStatus;
  moduleIds: string[];
  gradeBands: GradeBand[];
  subjects: Subject[];
  applicableBoards: SchoolBoard[];
  estimatedSizeMb: int32;
  requiresInternetAfterInstall: boolean;
  questStorageBudgetGb: int32;
  manifestPath?: string;
  checksum?: string;
  releaseNotes?: string;
}

model CreateBatchSessionRequest {
  schoolId: string;
  labDeploymentId: string;
  instructorId: string;
  moduleId: string;
  gradeBand: GradeBand;
  batchNumber: int32;
  batchSize: int32;
  totalClassSize: int32;
  plannedStartTime: utcDateTime;
  anonymousParticipantCount: int32;
  headsetCountUsed: int32;
  offline: boolean;
}

model CreateEvaluationRecordRequest {
  schoolId: string;
  labDeploymentId: string;
  batchSessionId: string;
  moduleId: string;
  instructorId: string;
  gradeBand: GradeBand;
  anonymousParticipantCount: int32;
  preUnderstandingScore?: float64;
  postUnderstandingScore?: float64;
  engagementScore?: float64;
  completionRate?: float64;
  confusionPoints?: string[];
  misconceptionsDetected?: string[];
  conceptsNeedingRevision?: string[];
  instructorObservation?: string;
  headsetComfortIssues?: string[];
  safetyIssues?: string[];
  syncStatus: OfflineSyncStatus;
}

model ListLearningConceptsResponse {
  items: LearningConcept[];
  page: PageInfo;
}

model ListCurriculumMapsResponse {
  items: CurriculumMap[];
  page: PageInfo;
}

model ListSimulationModulesResponse {
  items: SimulationModule[];
  page: PageInfo;
}

model ListOfflineContentPacksResponse {
  items: OfflineContentPack[];
  page: PageInfo;
}

model ListBatchSessionsResponse {
  items: BatchSession[];
  page: PageInfo;
}

model ListEvaluationRecordsResponse {
  items: EvaluationRecord[];
  page: PageInfo;
}

/* =========================
   API routes: first implementation domains
   ========================= */

@route("/learning-concepts")
namespace LearningConcepts {
  @get
  op list(
    ...PageRequest,
    @query subject?: Subject,
    @query visualizable?: boolean
  ): ListLearningConceptsResponse;

  @post
  op create(@body request: CreateLearningConceptRequest): LearningConcept;

  @get
  @route("/{conceptId}")
  op get(@path conceptId: string): LearningConcept;
}

@route("/curriculum-maps")
namespace CurriculumMaps {
  @get
  op list(
    ...PageRequest,
    @query board?: SchoolBoard,
    @query gradeBand?: GradeBand,
    @query subject?: Subject,
    @query xrFitType?: XrFitType
  ): ListCurriculumMapsResponse;

  @post
  op create(@body request: CreateCurriculumMapRequest): CurriculumMap;

  @get
  @route("/{curriculumMapId}")
  op get(@path curriculumMapId: string): CurriculumMap;
}

@route("/cue-cards")
namespace CueCards {
  @post
  op create(@body request: CreateCueCardRequest): CueCard;

  @get
  @route("/{cueCardId}")
  op get(@path cueCardId: string): CueCard;
}

@route("/revision-cards")
namespace RevisionCards {
  @post
  op create(@body request: CreateRevisionCardRequest): RevisionCard;

  @get
  @route("/{revisionCardId}")
  op get(@path revisionCardId: string): RevisionCard;
}

@route("/assessment-hooks")
namespace AssessmentHooks {
  @post
  op create(@body request: CreateAssessmentHookRequest): AssessmentHook;

  @get
  @route("/{assessmentHookId}")
  op get(@path assessmentHookId: string): AssessmentHook;
}

@route("/simulation-modules")
namespace SimulationModules {
  @get
  op list(
    ...PageRequest,
    @query subject?: Subject,
    @query gradeBand?: GradeBand,
    @query xrFitType?: XrFitType,
    @query status?: ContentPackStatus
  ): ListSimulationModulesResponse;

  @post
  op create(@body request: CreateSimulationModuleRequest): SimulationModule;

  @get
  @route("/{moduleId}")
  op get(@path moduleId: string): SimulationModule;
}

@route("/offline-content-packs")
namespace OfflineContentPacks {
  @get
  op list(
    ...PageRequest,
    @query releaseChannel?: ReleaseChannel,
    @query status?: ContentPackStatus,
    @query subject?: Subject,
    @query gradeBand?: GradeBand
  ): ListOfflineContentPacksResponse;

  @post
  op create(@body request: CreateOfflineContentPackRequest): OfflineContentPack;

  @get
  @route("/{packId}")
  op get(@path packId: string): OfflineContentPack;
}

@route("/batch-sessions")
namespace BatchSessions {
  @get
  op list(
    ...PageRequest,
    @query schoolId?: string,
    @query labDeploymentId?: string,
    @query instructorId?: string,
    @query moduleId?: string,
    @query syncStatus?: OfflineSyncStatus
  ): ListBatchSessionsResponse;

  @post
  op create(@body request: CreateBatchSessionRequest): BatchSession;

  @get
  @route("/{batchSessionId}")
  op get(@path batchSessionId: string): BatchSession;
}

@route("/evaluation-records")
namespace EvaluationRecords {
  @get
  op list(
    ...PageRequest,
    @query schoolId?: string,
    @query moduleId?: string,
    @query instructorId?: string,
    @query gradeBand?: GradeBand,
    @query syncStatus?: OfflineSyncStatus
  ): ListEvaluationRecordsResponse;

  @post
  op create(@body request: CreateEvaluationRecordRequest): EvaluationRecord;

  @get
  @route("/{evaluationRecordId}")
  op get(@path evaluationRecordId: string): EvaluationRecord;
}

/* =========================
   Robotree VR Smart Classroom
   Local-first classroom control: one teacher tablet drives many
   headset clients on the same Wi-Fi. Demo mode only — no real auth.
   ========================= */

@route("/robotree")
namespace Robotree {
  enum ClassroomMode {
    instructorLed,
    selfPlay,
  }

  enum ClassroomSessionStatus {
    draft,
    open,
    running,
    paused,
    stopped,
    ended,
  }

  enum DeviceConnectionStatus {
    connected,
    offline,
    batteryLow,
    syncing,
  }

  enum RobotreeDeviceType {
    vrHeadset,
    tablet,
    desktop,
    `unknown`,
  }

  enum ActivityType {
    vrActivity,
    arActivity,
    threeDModel,
    quiz,
    assessment,
  }

  enum TeacherCommandType {
    startSelected,
    startAll,
    pauseAll,
    stopAll,
    syncContent,
    selectContent,
    setMode,
    endDemo,
  }

  enum StudentProgressStatus {
    notStarted,
    running,
    paused,
    completed,
    stopped,
  }

  model DemoLogin {
    teacherName: string;
    schoolName: string;
    schoolCode: string;
    selectedClass: string;
  }

  model ClassOption {
    id: string;
    label: string;
    icon: string;
  }

  model SubjectOption {
    id: string;
    label: string;
    icon: string;
  }

  model ChapterOption {
    id: string;
    label: string;
    summary: string;
  }

  model ActivityOption {
    id: string;
    title: string;
    type: ActivityType;
    estimatedMinutes: int32;
    totalSteps: int32;
    description: string;
  }

  model HeadsetDevice {
    id: string;
    label: string;
    deviceType: RobotreeDeviceType;
    status: DeviceConnectionStatus;
    batteryPercent: int32;
    selected: boolean;
    currentActivityId?: string;
    currentStepIndex: int32;
    lastSeenAt: utcDateTime;
  }

  model StudentProgress {
    deviceId: string;
    activityId: string;
    status: StudentProgressStatus;
    currentStepIndex: int32;
    totalSteps: int32;
    answersSubmitted: int32;
    scorePercent?: float64;
    lastUpdatedAt: utcDateTime;
  }

  model ClassroomSession {
    id: string;
    joinCode: string;
    schoolCode: string;
    schoolName: string;
    teacherName: string;
    selectedClass?: string;
    selectedSubject?: string;
    selectedChapter?: string;
    selectedActivity?: ActivityOption;
    mode: ClassroomMode;
    status: ClassroomSessionStatus;
    devices: HeadsetDevice[];
    progress: StudentProgress[];
    currentStepIndex: int32;
    createdAt: utcDateTime;
    updatedAt: utcDateTime;
  }

  model ProgressSummary {
    sessionId: string;
    totalDevices: int32;
    connectedDevices: int32;
    runningCount: int32;
    pausedCount: int32;
    completedCount: int32;
    stoppedCount: int32;
    totalAnswersSubmitted: int32;
    averageScorePercent?: float64;
    entries: StudentProgress[];
  }

  model ClassroomStateSnapshot {
    session: ClassroomSession;
    summary: ProgressSummary;
    serverTime: utcDateTime;
  }

  model CreateRobotreeSessionRequest {
    login: DemoLogin;
  }

  model JoinHeadsetRequest {
    deviceType?: RobotreeDeviceType;
    label?: string;
  }

  model SimulateHeadsetsRequest {
    count?: int32;
  }

  model SelectContentRequest {
    selectedClass?: string;
    subject?: string;
    chapter?: string;
    activityId?: string;
  }

  model SelectDeviceRequest {
    selected: boolean;
  }

  model UpdateDeviceStatusRequest {
    status: DeviceConnectionStatus;
  }

  model TeacherCommand {
    type: TeacherCommandType;
    deviceIds?: string[];
    mode?: ClassroomMode;
    selectedClass?: string;
    selectedSubject?: string;
    selectedChapter?: string;
    activityId?: string;
  }

  model SubmitProgressRequest {
    deviceId: string;
    activityId?: string;
    status?: StudentProgressStatus;
    currentStepIndex?: int32;
    totalSteps?: int32;
    answersSubmitted?: int32;
    scorePercent?: float64;
  }

  model HeadsetEvent {
    type: string;
    payload: unknown;
  }

  model AnswerSubmission {
    deviceId: string;
    activityId: string;
    questionIndex: int32;
    answer: string;
    correct?: boolean;
  }

  @route("/sessions")
  namespace Sessions {
    @post
    op create(@body request: CreateRobotreeSessionRequest): ClassroomSession;

    @get
    @route("/{sessionId}")
    op getSnapshot(@path sessionId: string): ClassroomStateSnapshot;

    @post
    @route("/{sessionId}/open")
    op open(@path sessionId: string): ClassroomSession;

    @post
    @route("/{sessionId}/join-headset")
    op joinHeadset(@path sessionId: string, @body request: JoinHeadsetRequest): HeadsetDevice;

    @post
    @route("/{sessionId}/simulate-headsets")
    op simulateHeadsets(
      @path sessionId: string,
      @body request: SimulateHeadsetsRequest,
    ): HeadsetDevice[];

    @post
    @route("/{sessionId}/select-content")
    op selectContent(
      @path sessionId: string,
      @body request: SelectContentRequest,
    ): ClassroomSession;

    @post
    @route("/{sessionId}/device/{deviceId}/select")
    op selectDevice(
      @path sessionId: string,
      @path deviceId: string,
      @body request: SelectDeviceRequest,
    ): HeadsetDevice;

    @post
    @route("/{sessionId}/device/{deviceId}/status")
    op updateDeviceStatus(
      @path sessionId: string,
      @path deviceId: string,
      @body request: UpdateDeviceStatusRequest,
    ): HeadsetDevice;

    @post
    @route("/{sessionId}/command")
    op sendCommand(@path sessionId: string, @body command: TeacherCommand): ClassroomSession;

    @post
    @route("/{sessionId}/progress")
    op submitProgress(
      @path sessionId: string,
      @body request: SubmitProgressRequest,
    ): StudentProgress;

    @get
    @route("/{sessionId}/progress-summary")
    op getProgressSummary(@path sessionId: string): ProgressSummary;

    @post
    @route("/{sessionId}/end")
    op end(@path sessionId: string): ClassroomSession;
  }
}

@route("/sync-jobs")
namespace SyncJobs {
  @get
  op list(
    ...PageRequest,
    @query schoolId?: string,
    @query syncStatus?: OfflineSyncStatus,
    @query entityType?: string
  ): {
    items: SyncJob[];
    page: PageInfo;
  };

  @get
  @route("/{syncJobId}")
  op get(@path syncJobId: string): SyncJob;
}
