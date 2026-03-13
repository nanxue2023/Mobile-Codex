const taskCacheKey = "mobileCodexTaskCache.v3";
const sessionCacheKey = "mobileCodexSessionCache.v3";
const localeStorageKey = "mobileCodexLocale";
const activeTabStorageKey = "mobileCodexActiveTab";
const cachedTaskFields = ["summary", "error"];
const legacySensitiveStorageKeys = ["mobileCodexTaskCache.v2", "mobileCodexSessionCache.v2", "mobileCodexTaskCache.v3", "mobileCodexSessionCache.v3"];

const translations = {
  en: {
    appTitle: "Mobile Codex",
    heroEyebrow: "Mobile Remote Control",
    heroSubhead: "A stripped-back control surface for sessions, tasks, pairing, and security.",
    signInEyebrow: "Sign In",
    signInTitle: "Use the relay without exposing the workstation",
    signInHint: "Passkeys are the default. Recovery token access stays available for first-time setup and break-glass recovery.",
    passkeyLogin: "Continue With Passkey",
    passkeyLoginDefaultHint: "Use the passkey already registered for this relay.",
    recoverySummary: "Use Recovery Token Instead",
    bootstrapToken: "Bootstrap Token",
    unlockRecovery: "Unlock With Recovery Token",
    recoveryHint: "Use the recovery token only for first-time setup, adding a new passkey, or break-glass recovery.",
    inviteSummary: "Use An Invite",
    inviteCode: "Invite Code",
    displayName: "Display Name",
    joinWithInvite: "Join With Invite",
    inviteLoginHint: "An account invite creates your own user without joining someone else's workspace. A workspace invite lets you collaborate inside the current workspace.",
    userRecoverySummary: "Use A User Recovery Code",
    userRecoveryCode: "Recovery Code",
    continueWithRecoveryCode: "Continue With Recovery Code",
    userRecoveryHint: "If your invite was already used but you lost the session before adding a passkey, ask the relay owner for a user recovery code.",
    controlPlane: "Control Plane",
    currentWorkspace: "Current Workspace",
    context: "Context",
    connecting: "Connecting…",
    workspace: "Workspace",
    agent: "Agent",
    refresh: "Refresh",
    logout: "Logout",
    clearCache: "Clear Cache",
    clearCacheHint: "Clear local task and session previews from this device.",
    close: "Close",
    tabAsk: "Ask",
    tabSessions: "Sessions",
    tabAgents: "Agents",
    tabMore: "More",
    control: "Control",
    askEyebrow: "Ask",
    askTitle: "Run With Codex",
    agentDetails: "Agent Details",
    prompt: "Prompt",
    continuePrompt: "Continue Prompt",
    promptPlaceholder: "Describe the coding task you want Codex to perform.",
    relativeCwd: "Relative CWD",
    allowWrites: "Allow Workspace Writes",
    action: "Action",
    logSource: "Log Source",
    taskTypeCodex: "Codex Task",
    taskTypeAction: "Run Action",
    taskTypeLog: "Read Log",
    runTask: "Run",
    historyEyebrow: "History",
    recentTasks: "Recent Tasks",
    sessionEyebrow: "Sessions",
    codexSessions: "Codex Sessions",
    sessionsHint: "Recent sessions from the selected agent. Previews stay on your phone and in relay memory only.",
    searchSessions: "Search sessions",
    agentsEyebrow: "Agents",
    agentsTitle: "Devices And Approvals",
    pairNewAgent: "Pair New Agent",
    registeredAgents: "Registered Agents",
    approvalsEyebrow: "Approvals",
    pendingDevices: "Pending Devices",
    moreEyebrow: "More",
    moreTitle: "Workspace And Access",
    workspaceTitle: "Workspace",
    workspaceHintShort: "Members, invites, and workspace setup.",
    accessTitle: "Access",
    accessHintShort: "Passkeys, users, recovery, and relay-wide controls.",
    workspaceSetupEyebrow: "Workspace Setup",
    spaces: "Spaces",
    createWorkspace: "Create Workspace",
    workspaceNamePlaceholder: "Production Team",
    joinWorkspaceWithInvite: "Join Workspace With Invite",
    joinWorkspaceButton: "Join Existing Workspace",
    joinWorkspaceHint: "Use this after you already have an account and want to collaborate inside another workspace.",
    membersEyebrow: "Members",
    peopleAndInvites: "People And Invites",
    relayUsersEyebrow: "Relay Users",
    relayUsers: "Users",
    relayUsersHint: "Only relay owners can manage global users, recovery codes, and membership cleanup.",
    accessEyebrow: "Access",
    security: "Security",
    checkingPasskey: "Checking passkey status…",
    newPasskeyLabel: "New Passkey Label",
    passkeyLabelPlaceholder: "My iPhone",
    addPasskey: "Add This Device As A Passkey",
    inviteType: "Invite Type",
    accountInvite: "Account Invite",
    workspaceInvite: "Workspace Invite",
    role: "Role",
    viewer: "Viewer",
    operator: "Operator",
    owner: "Owner",
    note: "Note",
    ttlSeconds: "TTL Seconds",
    inviteNotePlaceholder: "Who this invite is for",
    pairNotePlaceholder: "Server or environment name",
    createAccountInvite: "Create Account Invite",
    createWorkspaceInvite: "Create Workspace Invite",
    inviteTypeSummaryAccount: "Account invites create a standalone user. They can create their own workspace after registering a passkey.",
    inviteTypeSummaryWorkspace: "Workspace invites add someone to the current workspace with the selected role.",
    noTasks: "No tasks yet.",
    noSessions: "No Codex sessions found for this workspace yet.",
    noPreview: "No preview available yet.",
    noPendingDevices: "No pending devices waiting for approval.",
    noAgents: "No agents are paired in this workspace yet.",
    noPasskeys: "No passkeys registered yet. Add this device before you log out.",
    noMembers: "No members yet.",
    noInvites: "No active invites for this workspace.",
    noUsers: "No relay users found.",
    noMemberships: "No workspace memberships.",
    ownersManageMembers: "Workspace owners can manage members and invites here.",
    noWorkspace: "No workspace",
    noRole: "no role",
    signedOut: "Signed out.",
    userDefault: "User",
    currentUserSummary: "{user} · {role} · {workspace}",
    statusSummary: "{workspace} · {agents} agent(s), {tasks} recent task(s)",
    workspaceLabel: "Workspace: {workspace}",
    sessionLabel: "Session: {session}",
    targetSessionLabel: "Target Session: {session}",
    actionLabel: "Action: {action}",
    logLabel: "Log: {log}",
    shortPairCodeLabel: "Short pair code",
    expiresLabel: "Expires",
    pairResultHint: "This code is single-use and still requires phone approval.",
    suggestedPairCommand: "Suggested Pair Command",
    copyPairCommand: "Copy Pair Command",
    copied: "Copied",
    copyFailed: "Copy failed. The command has been selected for manual copy.",
    inviteCodeLabel: "Invite code",
    inviteResultAccount: "Type: Account Invite\nThis creates a standalone user account.",
    inviteResultWorkspace: "Type: Workspace Invite",
    inviteResultRole: "Role",
    inviteResultWorkspaceLabel: "Workspace",
    relayOwnerBadge: "Relay Owner",
    disabledUser: "Disabled",
    activeUser: "Active",
    passkeySetupPending: "Passkey Setup Pending",
    passkeysCountLabel: "{count} passkey(s)",
    sessionsCountLabel: "{count} active session(s)",
    lastWorkspaceLabel: "Last workspace: {workspace}",
    membershipSummary: "{workspace} · {role}",
    activeRecoveryUntil: "Active recovery code until {expires}",
    createRecoveryCode: "Create Recovery Code",
    revokeSessions: "Revoke Sessions",
    disableUser: "Disable User",
    enableUser: "Enable User",
    deleteUser: "Delete User",
    removeMember: "Remove",
    revoke: "Revoke",
    approve: "Approve",
    approveDevice: "Approve Device",
    reject: "Reject",
    continueHere: "Continue Here",
    loadConversation: "Load Conversation",
    loadingConversation: "Loading conversation…",
    conversationMessages: "{count} message(s)",
    selected: "Selected",
    delete: "Delete",
    passkeyDefault: "Passkey",
    createdAt: "Created {date}",
    usedDate: "Used {date}",
    neverUsed: "Never used",
    transportsLabel: "Transports: {transports}",
    noWorkspaceSelectedHint: "Create or join a workspace to start working.",
    pairSummary: "{agents} agent(s) · {pending} pending approval(s)",
    statusRegistered: "Registered",
    statusOnline: "Online",
    statusStale: "Stale",
    statusRevoked: "Revoked",
    statusPending: "Pending",
    revokeAgent: "Revoke Agent",
    revokeAgentConfirm: "Revoke this agent? The current token will stop working and the same agentId can be paired again.",
    passkeysSummary: "{count} passkey(s) on this account. Recovery token remains available only for the relay owner.",
    passkeysUnavailable: "Passkeys are unavailable here. Check HTTPS/publicOrigin and passkey configuration.",
    passkeyNoBrowser: "This browser cannot use passkeys here. Use Safari/Chrome on a secure origin, or fall back to the recovery token.",
    passkeyNoRegistered: "No passkeys registered yet.",
    passkeyEnrollRequired: "Register a passkey on this device before running tasks or pairing agents.",
    recoveryCodeIssued: "Recovery code for {user}",
    recoveryCodeUseHint: "Ask the user to open the relay and use the recovery code once, then register a passkey immediately.",
    disableUserConfirm: "Disable this user and revoke all active sessions?",
    enableUserConfirm: "Re-enable this user?",
    revokeSessionsConfirm: "Revoke all active sessions for this user?",
    removeMembershipConfirm: "Remove this user from the workspace?",
    deleteUserConfirm: "Delete this user permanently? This only works for users with no memberships and no passkeys.",
    deleteSessionConfirm: "Delete this Codex session from the agent?\n\n{label}\n\nThis cannot be undone.",
    revokePasskeyConfirm: "Revoke this passkey?",
    revokeInviteConfirm: "Revoke this invite?",
    operatorsContinueDelete: "Workspace operators can continue or delete sessions.",
    operatorsApprovePair: "Workspace operators can approve or reject this device.",
    accountInviteCardTitle: "Account Invite",
    accountInviteCardHint: "Creates a standalone user account. The user can create their own workspace after registering a passkey.",
    workspaceInviteCardTitle: "{role} Invite",
    pendingDevice: "Pending Device",
    unknownHost: "unknown host",
    thisDevice: "This Device",
    codexSessionDefault: "Codex Session"
  },
  zh: {
    appTitle: "Mobile Codex",
    heroEyebrow: "手机远程控制",
    heroSubhead: "一个尽量克制的手机控制面板，用来处理会话、任务、配对和安全设置。",
    signInEyebrow: "登录",
    signInTitle: "无需暴露工作机，也能使用 relay",
    signInHint: "默认推荐 passkey。恢复口令仅用于首次初始化、补绑设备或紧急恢复。",
    passkeyLogin: "使用 Passkey 继续",
    passkeyLoginDefaultHint: "使用已在此 relay 注册过的 passkey 登录。",
    recoverySummary: "改用恢复口令",
    bootstrapToken: "Bootstrap Token",
    unlockRecovery: "用恢复口令解锁",
    recoveryHint: "恢复口令只用于首次配置、补绑 passkey 或紧急恢复，不建议日常使用。",
    inviteSummary: "使用邀请码",
    inviteCode: "邀请码",
    displayName: "显示名称",
    joinWithInvite: "使用邀请码加入",
    inviteLoginHint: "账号邀请只会创建你自己的用户，不会自动加入别人的 workspace。工作区邀请才会把你加入当前 workspace 进行协作。",
    userRecoverySummary: "使用用户恢复码",
    userRecoveryCode: "恢复码",
    continueWithRecoveryCode: "使用恢复码继续",
    userRecoveryHint: "如果邀请码已经用过，但用户还没绑定 passkey 就丢失了会话，请向 relay owner 申请一个用户恢复码。",
    controlPlane: "控制平面",
    currentWorkspace: "当前工作区",
    context: "上下文",
    connecting: "连接中…",
    workspace: "工作区",
    agent: "Agent",
    refresh: "刷新",
    logout: "退出登录",
    clearCache: "清空缓存",
    clearCacheHint: "清除当前设备上缓存的任务和会话预览。",
    close: "关闭",
    tabAsk: "提问",
    tabSessions: "会话",
    tabAgents: "Agent",
    tabMore: "更多",
    control: "控制",
    askEyebrow: "提问",
    askTitle: "交给 Codex",
    agentDetails: "Agent 详情",
    prompt: "提示词",
    continuePrompt: "继续提示词",
    promptPlaceholder: "描述你希望 Codex 执行的编码任务。",
    relativeCwd: "相对工作目录",
    allowWrites: "允许写入工作区",
    action: "动作",
    logSource: "日志源",
    taskTypeCodex: "Codex 任务",
    taskTypeAction: "执行动作",
    taskTypeLog: "读取日志",
    runTask: "执行",
    historyEyebrow: "历史",
    recentTasks: "最近任务",
    sessionEyebrow: "会话",
    codexSessions: "Codex 会话",
    sessionsHint: "显示当前所选 agent 的最近会话。预览只保留在你的手机和 relay 内存中。",
    searchSessions: "搜索会话",
    agentsEyebrow: "Agent",
    agentsTitle: "设备与审批",
    pairNewAgent: "新增配对",
    registeredAgents: "已注册 Agent",
    approvalsEyebrow: "审批",
    pendingDevices: "待批准设备",
    moreEyebrow: "更多",
    moreTitle: "工作区与访问控制",
    workspaceTitle: "工作区",
    workspaceHintShort: "成员、邀请和工作区设置。",
    accessTitle: "访问控制",
    accessHintShort: "Passkey、用户、恢复和 relay 级管理。",
    workspaceSetupEyebrow: "工作区设置",
    spaces: "工作区",
    createWorkspace: "创建工作区",
    workspaceNamePlaceholder: "生产团队",
    joinWorkspaceWithInvite: "用邀请码加入工作区",
    joinWorkspaceButton: "加入已有工作区",
    joinWorkspaceHint: "当你已经有账号，只是想加入另一个 workspace 协作时，使用这里。",
    membersEyebrow: "成员",
    peopleAndInvites: "成员与邀请",
    relayUsersEyebrow: "Relay 用户",
    relayUsers: "用户",
    relayUsersHint: "只有 relay owner 可以管理全局用户、恢复码和成员清理。",
    accessEyebrow: "访问控制",
    security: "安全",
    checkingPasskey: "正在检查 Passkey 状态…",
    newPasskeyLabel: "新 Passkey 标签",
    passkeyLabelPlaceholder: "我的 iPhone",
    addPasskey: "把当前设备注册为 Passkey",
    inviteType: "邀请类型",
    accountInvite: "账号邀请",
    workspaceInvite: "工作区邀请",
    role: "角色",
    viewer: "查看者",
    operator: "操作员",
    owner: "所有者",
    note: "备注",
    ttlSeconds: "有效期（秒）",
    inviteNotePlaceholder: "给这次邀请写个备注",
    pairNotePlaceholder: "服务器名或环境名",
    createAccountInvite: "创建账号邀请",
    createWorkspaceInvite: "创建工作区邀请",
    inviteTypeSummaryAccount: "账号邀请只创建独立用户。对方注册 passkey 后可以自己创建 workspace。",
    inviteTypeSummaryWorkspace: "工作区邀请会把对方加入当前 workspace，并使用所选角色。",
    noTasks: "还没有任务。",
    noSessions: "当前工作区下还没有可显示的 Codex 会话。",
    noPreview: "当前还没有可显示的预览。",
    noPendingDevices: "当前没有待批准设备。",
    noAgents: "当前工作区还没有已配对的 agent。",
    noPasskeys: "当前账号还没有注册 passkey。建议先为这台设备补绑一个。",
    noMembers: "还没有成员。",
    noInvites: "当前工作区没有有效邀请。",
    noUsers: "当前没有可管理的 relay 用户。",
    noMemberships: "当前没有工作区成员关系。",
    ownersManageMembers: "只有工作区 owner 才能在这里管理成员和邀请。",
    noWorkspace: "未选择工作区",
    noRole: "无角色",
    signedOut: "未登录。",
    userDefault: "用户",
    currentUserSummary: "{user} · {role} · {workspace}",
    statusSummary: "{workspace} · {agents} 个 agent，{tasks} 个最近任务",
    workspaceLabel: "工作区：{workspace}",
    sessionLabel: "会话：{session}",
    targetSessionLabel: "目标会话：{session}",
    actionLabel: "动作：{action}",
    logLabel: "日志：{log}",
    shortPairCodeLabel: "短配对码",
    expiresLabel: "过期时间",
    pairResultHint: "该配对码一次性有效，且仍然需要手机端批准。",
    suggestedPairCommand: "建议执行的配对命令",
    copyPairCommand: "复制配对命令",
    copied: "已复制",
    copyFailed: "复制失败，已自动选中内容，请手动复制。",
    inviteCodeLabel: "邀请码",
    inviteResultAccount: "类型：账号邀请\n这会创建一个独立用户账号。",
    inviteResultWorkspace: "类型：工作区邀请",
    inviteResultRole: "角色",
    inviteResultWorkspaceLabel: "工作区",
    relayOwnerBadge: "Relay Owner",
    disabledUser: "已禁用",
    activeUser: "正常",
    passkeySetupPending: "等待绑定 Passkey",
    passkeysCountLabel: "{count} 个 passkey",
    sessionsCountLabel: "{count} 个活动会话",
    lastWorkspaceLabel: "最近工作区：{workspace}",
    membershipSummary: "{workspace} · {role}",
    activeRecoveryUntil: "恢复码有效至 {expires}",
    createRecoveryCode: "生成恢复码",
    revokeSessions: "注销会话",
    disableUser: "禁用用户",
    enableUser: "恢复用户",
    deleteUser: "删除用户",
    removeMember: "移除成员",
    revoke: "撤销",
    approve: "批准",
    approveDevice: "批准设备",
    reject: "拒绝",
    continueHere: "在这里继续",
    loadConversation: "查看对话",
    loadingConversation: "正在加载对话…",
    conversationMessages: "{count} 条消息",
    selected: "已选择",
    delete: "删除",
    passkeyDefault: "Passkey",
    createdAt: "创建于 {date}",
    usedDate: "最近使用：{date}",
    neverUsed: "从未使用",
    transportsLabel: "传输方式：{transports}",
    noWorkspaceSelectedHint: "先创建或加入一个工作区，再开始工作。",
    pairSummary: "{agents} 个 agent · {pending} 个待批准",
    statusRegistered: "已注册",
    statusOnline: "在线",
    statusStale: "离线",
    statusRevoked: "已撤销",
    statusPending: "待批准",
    revokeAgent: "撤销 Agent",
    revokeAgentConfirm: "要撤销这个 agent 吗？当前 token 会失效，之后可以重新用同一个 agentId 配对。",
    passkeysSummary: "当前账号已有 {count} 个 passkey。Bootstrap Token 仅保留给 relay owner 作为恢复入口。",
    passkeysUnavailable: "当前环境无法使用 passkey，请检查 HTTPS/publicOrigin 和 passkey 配置。",
    passkeyNoBrowser: "当前浏览器无法在这里使用 passkey。请使用安全来源下的 Safari/Chrome，或暂时改用恢复口令。",
    passkeyNoRegistered: "当前还没有可用的 passkey。",
    passkeyEnrollRequired: "请先在这台设备上注册 passkey，再执行任务或批准配对。",
    recoveryCodeIssued: "{user} 的恢复码",
    recoveryCodeUseHint: "让用户打开 relay，使用该恢复码登录一次，然后立刻补绑 passkey。",
    disableUserConfirm: "要禁用这个用户并撤销其所有活动会话吗？",
    enableUserConfirm: "要恢复这个用户吗？",
    revokeSessionsConfirm: "要撤销这个用户的所有活动会话吗？",
    removeMembershipConfirm: "要把这个用户移出该工作区吗？",
    deleteUserConfirm: "要永久删除这个用户吗？只有没有成员关系且没有 passkey 的用户才能删除。",
    deleteSessionConfirm: "要从 agent 上删除这个 Codex 会话吗？\n\n{label}\n\n该操作无法撤销。",
    revokePasskeyConfirm: "要撤销这个 passkey 吗？",
    revokeInviteConfirm: "要撤销这个邀请吗？",
    operatorsContinueDelete: "只有 workspace 的 operator 或 owner 才能继续或删除会话。",
    operatorsApprovePair: "只有 workspace 的 operator 或 owner 才能批准或拒绝这台设备。",
    accountInviteCardTitle: "账号邀请",
    accountInviteCardHint: "这会创建一个独立用户。对方注册 passkey 后可以自己创建 workspace。",
    workspaceInviteCardTitle: "{role} 邀请",
    pendingDevice: "待批准设备",
    unknownHost: "未知主机",
    thisDevice: "当前设备",
    codexSessionDefault: "Codex 会话"
  }
};

clearLegacySensitiveStorage();

const state = {
  authenticated: false,
  authStatus: null,
  data: null,
  pollTimer: null,
  locale: localStorage.getItem(localeStorageKey) || "en",
  activeTab: "ask",
  selectedAgentId: "",
  taskType: "codex_exec",
  selectedSessionId: "",
  overlay: null,
  taskCache: loadTaskCache(),
  sessionCache: loadSessionCache(),
  sessionFilter: "",
  swipedSessionId: "",
  pairingResult: null,
  inviteResultText: "",
  userAdminResultText: "",
  inviteType: "account"
};

let gesture = null;

const hero = document.querySelector(".hero");
const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const passkeyLoginBox = document.querySelector("#passkey-login-box");
const passkeyLoginButton = document.querySelector("#passkey-login-button");
const passkeyLoginHint = document.querySelector("#passkey-login-hint");
const recoveryLoginBox = document.querySelector("#recovery-login-box");
const inviteLoginForm = document.querySelector("#invite-login-form");
const userRecoveryForm = document.querySelector("#user-recovery-form");
const loginForm = document.querySelector("#login-form");
const currentUserLine = document.querySelector("#current-user-line");
const workspaceTitle = document.querySelector("#workspace-title");
const statusLine = document.querySelector("#status-line");
const refreshButton = document.querySelector("#refresh-button");
const logoutButton = document.querySelector("#logout-button");
const taskForm = document.querySelector("#task-form");
const taskPrompt = document.querySelector("#task-prompt");
const taskPromptLabel = document.querySelector("#task-prompt-label");
const taskCwd = document.querySelector("#task-cwd");
const taskWrite = document.querySelector("#task-write");
const actionSelect = document.querySelector("#task-action-id");
const logSelect = document.querySelector("#task-log-source-id");
const taskTypeButtons = Array.from(document.querySelectorAll("[data-task-type]"));
const codexPromptRow = document.querySelector("#codex-prompt-row");
const cwdRow = document.querySelector("#cwd-row");
const writeRow = document.querySelector("#write-row");
const actionRow = document.querySelector("#action-row");
const logRow = document.querySelector("#log-row");
const resumeSessionBanner = document.querySelector("#resume-session-banner");
const resumeSessionLabel = document.querySelector("#resume-session-label");
const clearSessionSelectionButton = document.querySelector("#clear-session-selection");
const tasksEl = document.querySelector("#tasks");
const priorityEventsEl = document.querySelector("#priority-events");
const askFootnote = document.querySelector("#ask-footnote");
const moreBadge = document.querySelector("#more-badge");
const backdrop = document.querySelector("#overlay-backdrop");
const sidePanel = document.querySelector("#side-panel");
const panelTitle = document.querySelector("#panel-title");
const panelEyebrow = document.querySelector("#panel-eyebrow");
const panelContent = document.querySelector("#panel-content");
const closePanelButton = document.querySelector("#close-panel-button");
const bottomSheet = document.querySelector("#bottom-sheet");
const sheetTitle = document.querySelector("#sheet-title");
const sheetEyebrow = document.querySelector("#sheet-eyebrow");
const sheetContent = document.querySelector("#sheet-content");
const closeSheetButton = document.querySelector("#close-sheet-button");
const langButtons = [
  document.querySelector("#lang-en"),
  document.querySelector("#lang-zh")
];

function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(normalized + padding);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function decodeCredentialDescriptor(descriptor) {
  return {
    ...descriptor,
    id: base64UrlToBytes(descriptor.id)
  };
}

function decodeCreationOptions(publicKey) {
  return {
    ...publicKey,
    challenge: base64UrlToBytes(publicKey.challenge),
    user: {
      ...publicKey.user,
      id: base64UrlToBytes(publicKey.user.id)
    },
    excludeCredentials: Array.isArray(publicKey.excludeCredentials)
      ? publicKey.excludeCredentials.map(decodeCredentialDescriptor)
      : []
  };
}

function decodeRequestOptions(publicKey) {
  return {
    ...publicKey,
    challenge: base64UrlToBytes(publicKey.challenge),
    allowCredentials: Array.isArray(publicKey.allowCredentials)
      ? publicKey.allowCredentials.map(decodeCredentialDescriptor)
      : []
  };
}

function serializeCredential(credential) {
  const response = credential.response;
  const payload = {
    id: credential.id,
    rawId: bytesToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToBase64Url(response.clientDataJSON)
    }
  };
  if (response.attestationObject) {
    payload.response.attestationObject = bytesToBase64Url(response.attestationObject);
  }
  if (response.authenticatorData) {
    payload.response.authenticatorData = bytesToBase64Url(response.authenticatorData);
  }
  if (response.signature) {
    payload.response.signature = bytesToBase64Url(response.signature);
  }
  if (response.userHandle) {
    payload.response.userHandle = bytesToBase64Url(response.userHandle);
  }
  if (typeof response.getTransports === "function") {
    payload.response.transports = response.getTransports();
  }
  return payload;
}

function loadTaskCache() {
  try {
    return JSON.parse(sessionStorage.getItem(taskCacheKey) || "{}");
  } catch {
    return {};
  }
}

function clearLegacySensitiveStorage() {
  for (const key of legacySensitiveStorageKeys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures on locked-down browsers.
    }
  }
}

function loadSessionCache() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionCacheKey) || "{}");
  } catch {
    return {};
  }
}

function persistTaskCache() {
  const entries = Object.entries(state.taskCache)
    .sort((left, right) => String(right[1]?.cachedAt || "").localeCompare(String(left[1]?.cachedAt || "")))
    .slice(0, 100);
  state.taskCache = Object.fromEntries(entries);
  sessionStorage.setItem(taskCacheKey, JSON.stringify(state.taskCache));
}

function persistSessionCache() {
  const entries = Object.entries(state.sessionCache)
    .sort((left, right) => String(right[1]?.cachedAt || "").localeCompare(String(left[1]?.cachedAt || "")))
    .slice(0, 30);
  state.sessionCache = Object.fromEntries(entries);
  sessionStorage.setItem(sessionCacheKey, JSON.stringify(state.sessionCache));
}

function t(key, vars = {}) {
  const table = translations[state.locale] || translations.en;
  const fallback = translations.en[key] || key;
  const template = table[key] || fallback;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

function localeTag() {
  return state.locale === "zh" ? "zh-CN" : "en-US";
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString(localeTag());
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleDateString(localeTag());
}

function formatRoleLabel(role) {
  if (role === "viewer" || role === "operator" || role === "owner") {
    return t(role);
  }
  return String(role || "");
}

function formatPreviewRole(role) {
  if (role === "assistant") {
    return state.locale === "zh" ? "助手" : "assistant";
  }
  if (role === "user") {
    return state.locale === "zh" ? "用户" : "user";
  }
  return String(role || "");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shellEscape(value) {
  return `'${String(value || "").replaceAll("'", `'\"'\"'`)}'`;
}

function webauthnAvailable() {
  return typeof window.PublicKeyCredential !== "undefined" && !!navigator.credentials && window.isSecureContext;
}

function buildPairCommand(pairingCode) {
  const configPathHint = state.data?.web?.pairCommandConfigPathHint || "config/agent.local.json";
  return `npm run agent:pair -- --config ${shellEscape(configPathHint)} --pair-code ${shellEscape(pairingCode)}`;
}

function setLocale(locale) {
  state.locale = locale === "zh" ? "zh" : "en";
  localStorage.setItem(localeStorageKey, state.locale);
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  document.title = t("appTitle");
  for (const button of langButtons) {
    if (!button) {
      continue;
    }
    button.classList.toggle("active", button.id.endsWith(state.locale));
  }
  applyStaticLocale();
  renderAuthStatus(state.authStatus);
  render();
}

function applyStaticLocale() {
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  taskPrompt.placeholder = t("promptPlaceholder");
  document.querySelector("#invite-code").placeholder = "ABCD-EFGH-IJKL";
  document.querySelector("#invite-display-name").placeholder = t("displayName");
  document.querySelector("#user-recovery-code").placeholder = "ABCD-EFGH-IJKL";
  document.querySelector("#workspace-title").textContent ||= t("currentWorkspace");
  const recoveryButton = document.querySelector("#close-panel-button");
  if (recoveryButton) {
    recoveryButton.textContent = t("close");
  }
  const closeSheet = document.querySelector("#close-sheet-button");
  if (closeSheet) {
    closeSheet.textContent = t("close");
  }
}

function getCurrentAuth() {
  return state.data?.auth || state.authStatus || null;
}

function currentPermissions() {
  return getCurrentAuth()?.permissions || {};
}

function currentWorkspace() {
  return state.data?.currentWorkspace || null;
}

function agentStatus(agent) {
  if (!agent) {
    return "registered";
  }
  if (agent.revokedAt) {
    return "revoked";
  }
  const pollInterval = Number(state.data?.web?.pollIntervalMs || 2500);
  const staleAfterMs = Math.max(15000, pollInterval * 6);
  const lastSeenAt = Date.parse(agent.lastSeenAt || agent.createdAt || "");
  if (Number.isFinite(lastSeenAt) && Date.now() - lastSeenAt > staleAfterMs) {
    return "stale";
  }
  return "online";
}

function agentStatusLabel(agent) {
  const status = agentStatus(agent);
  if (status === "online") {
    return t("statusOnline");
  }
  if (status === "stale") {
    return t("statusStale");
  }
  if (status === "revoked") {
    return t("statusRevoked");
  }
  return t("statusRegistered");
}

function selectedAgent() {
  return (state.data?.agents || []).find((agent) => agent.agentId === state.selectedAgentId) || null;
}

function selectedSession(agent = selectedAgent()) {
  if (!agent || !state.selectedSessionId) {
    return null;
  }
  return (agent.codexSessions || []).find((session) => session.sessionId === state.selectedSessionId) || null;
}

function clearSelectedSession() {
  state.selectedSessionId = "";
  syncTaskFields();
}

function mergeTaskFromCache(task) {
  const cached = state.taskCache[task.taskId];
  if (!cached) {
    return task;
  }
  const merged = { ...task };
  for (const field of cachedTaskFields) {
    const value = merged[field];
    const shouldUseCached =
      field === "result" ? value == null && cached[field] != null : (!value || value.length === 0) && cached[field];
    if (shouldUseCached) {
      merged[field] = cached[field];
    }
  }
  return merged;
}

function updateTaskCache(tasks) {
  for (const task of tasks) {
    const existing = state.taskCache[task.taskId] || {};
    const next = { ...existing };
    for (const field of cachedTaskFields) {
      const value = task[field];
      if (field === "result") {
        if (value != null) {
          next[field] = value;
        }
      } else if (typeof value === "string" && value.length > 0) {
        next[field] = value;
      }
    }
    if (Object.keys(next).length > 0) {
      next.cachedAt = new Date().toISOString();
      state.taskCache[task.taskId] = next;
    }
  }
  persistTaskCache();
}

function mergeAgentSessionsFromCache(agent) {
  const cached = state.sessionCache[agent.agentId];
  if (Array.isArray(agent.codexSessions) && agent.codexSessions.length > 0) {
    return agent;
  }
  if (!cached?.sessions?.length) {
    return {
      ...agent,
      codexSessions: []
    };
  }
  return {
    ...agent,
    codexSessions: cached.sessions
  };
}

function updateSessionCache(agents) {
  for (const agent of agents) {
    if (Array.isArray(agent.codexSessions) && agent.codexSessions.length > 0) {
      state.sessionCache[agent.agentId] = {
        cachedAt: new Date().toISOString(),
        sessions: agent.codexSessions.slice(0, 30).map((session) => ({
          sessionId: session.sessionId,
          title: session.title,
          cwd: session.cwd,
          updatedAt: session.updatedAt,
          preview: []
        }))
      };
    }
  }
  persistSessionCache();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

async function refreshAuthStatus() {
  try {
    const body = await api("/api/auth/status");
    state.authenticated = !!body.authenticated;
    state.authStatus = body.auth || null;
    renderAuthStatus(body.auth);
  } catch {
    state.authenticated = false;
    state.authStatus = null;
    renderAuthStatus(null);
  }
}

async function refresh() {
  const data = await api("/api/admin/state");
  state.authenticated = true;
  const agents = (data.agents || []).map(mergeAgentSessionsFromCache);
  const tasks = (data.tasks || []).map(mergeTaskFromCache);
  updateSessionCache(agents);
  updateTaskCache(tasks);
  state.data = {
    ...data,
    agents,
    tasks
  };
  const currentAgentId = state.selectedAgentId;
  const availableAgent = agents.some((agent) => agent.agentId === currentAgentId) ? currentAgentId : agents[0]?.agentId || "";
  state.selectedAgentId = availableAgent;
  renderAuthStatus(state.data.auth || state.authStatus);
  if (state.selectedSessionId && !selectedSession()) {
    state.selectedSessionId = "";
  }
  showDashboard(true);
  render();
  schedulePolling(data.web?.pollIntervalMs || 2500);
}

function schedulePolling(intervalMs) {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
  }
  state.pollTimer = setInterval(() => {
    if (!state.authenticated) {
      return;
    }
    refresh().catch(async () => {
      clearAuthenticatedState();
      showDashboard(false);
      await refreshAuthStatus().catch(() => {});
    });
  }, Number(intervalMs) || 2500);
}

function clearAuthenticatedState() {
  state.authenticated = false;
  state.data = null;
  state.overlay = null;
  state.selectedSessionId = "";
  state.pairingResult = null;
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function login(bootstrapToken) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: { bootstrapToken }
  });
  state.authenticated = true;
  state.authStatus = data.auth || null;
  showDashboard(true);
  await refresh();
}

async function redeemInvite(inviteCode, displayName = "") {
  const data = await api("/api/auth/invitations/redeem", {
    method: "POST",
    body: { inviteCode, displayName }
  });
  state.authenticated = true;
  state.authStatus = data.auth || null;
  showDashboard(true);
  await refresh();
}

async function redeemRecoveryCode(recoveryCode) {
  const data = await api("/api/auth/recovery/redeem", {
    method: "POST",
    body: { recoveryCode }
  });
  state.authenticated = true;
  state.authStatus = data.auth || null;
  showDashboard(true);
  await refresh();
}

async function loginWithPasskey() {
  if (!webauthnAvailable()) {
    throw new Error("passkeys-unavailable-in-this-browser");
  }
  const options = await api("/api/auth/passkeys/login/options", {
    method: "POST",
    body: {}
  });
  const credential = await navigator.credentials.get({
    publicKey: decodeRequestOptions(options.publicKey)
  });
  if (!credential) {
    throw new Error("passkey-login-cancelled");
  }
  const verified = await api("/api/auth/passkeys/login/verify", {
    method: "POST",
    body: {
      loginId: options.loginId,
      credential: serializeCredential(credential)
    }
  });
  state.authenticated = true;
  state.authStatus = verified.auth || null;
  showDashboard(true);
  await refresh();
}

async function registerPasskey(label) {
  if (!webauthnAvailable()) {
    throw new Error("passkeys-unavailable-in-this-browser");
  }
  const options = await api("/api/auth/passkeys/register/options", {
    method: "POST",
    body: { label: label || t("thisDevice") }
  });
  const credential = await navigator.credentials.create({
    publicKey: decodeCreationOptions(options.publicKey)
  });
  if (!credential) {
    throw new Error("passkey-registration-cancelled");
  }
  const verified = await api("/api/auth/passkeys/register/verify", {
    method: "POST",
    body: {
      registrationId: options.registrationId,
      credential: serializeCredential(credential)
    }
  });
  state.authStatus = verified.auth || state.authStatus;
  renderAuthStatus(state.authStatus);
  await refresh();
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  clearAuthenticatedState();
  showDashboard(false);
  replaceHistoryRoute();
  await refreshAuthStatus().catch(() => {});
}

async function switchWorkspace(workspaceId) {
  await api("/api/auth/workspace", {
    method: "POST",
    body: { workspaceId }
  });
  clearSelectedSession();
  await refresh();
}

async function createWorkspace(name) {
  await api("/api/admin/workspaces", {
    method: "POST",
    body: { name }
  });
  await refresh();
}

async function createInvite(type, role, ttlSec, note) {
  const result = await api("/api/admin/invitations", {
    method: "POST",
    body: { type, role, ttlSec, note }
  });
  state.inviteResultText =
    result.invitation.type === "account"
      ? `${t("inviteCodeLabel")}: ${result.inviteCode}\n${t("inviteResultAccount")}\n${t("expiresLabel")}: ${result.invitation.expiresAt}`
      : `${t("inviteCodeLabel")}: ${result.inviteCode}\n${t("inviteResultWorkspace")}\n${t("inviteResultRole")}: ${formatRoleLabel(result.invitation.role)}\n${t("inviteResultWorkspaceLabel")}: ${result.invitation.workspaceName || t("currentWorkspace")}\n${t("expiresLabel")}: ${result.invitation.expiresAt}`;
  await refresh();
  renderOverlay();
}

async function createUserRecoveryCode(userId) {
  const result = await api(`/api/admin/users/${encodeURIComponent(userId)}/recovery-codes`, {
    method: "POST",
    body: { ttlSec: 3600 }
  });
  state.userAdminResultText = `${t("recoveryCodeIssued", { user: result.user.displayName })}\n${t("userRecoveryCode")}: ${result.recoveryCode}\n${t("expiresLabel")}: ${result.recovery.expiresAt}\n${t("recoveryCodeUseHint")}`;
  await refresh();
  renderOverlay();
}

async function disableUser(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/disable`, { method: "POST" });
  await refresh();
  renderOverlay();
}

async function enableUser(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/enable`, { method: "POST" });
  await refresh();
  renderOverlay();
}

async function revokeUserSessions(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke`, { method: "POST" });
  await refresh();
  renderOverlay();
}

async function deleteUser(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/delete`, { method: "POST" });
  await refresh();
  renderOverlay();
}

async function revokeMembership(membershipId) {
  await api(`/api/admin/memberships/${encodeURIComponent(membershipId)}/revoke`, { method: "POST" });
  await refresh();
  renderOverlay();
}

async function revokePasskey(passkeyId) {
  const result = await api(`/api/admin/passkeys/${encodeURIComponent(passkeyId)}/revoke`, { method: "POST" });
  state.authStatus = result.auth || state.authStatus;
  renderAuthStatus(state.authStatus);
  await refresh();
  renderOverlay();
}

async function revokeInvite(inviteId) {
  await api(`/api/admin/invitations/${encodeURIComponent(inviteId)}/revoke`, { method: "POST" });
  await refresh();
  renderOverlay();
}

async function revokeAgent(agentId) {
  await api(`/api/admin/agents/${encodeURIComponent(agentId)}/revoke`, { method: "POST" });
  if (state.selectedAgentId === agentId) {
    clearSelectedSession();
    state.selectedAgentId = "";
  }
  await refresh();
  renderOverlay();
}

async function createPairing(note, ttlSec) {
  const result = await api("/api/admin/pairings", {
    method: "POST",
    body: { note, ttlSec }
  });
  state.pairingResult = result;
  renderOverlay();
  await refresh();
}

async function submitTask(body) {
  await api("/api/admin/tasks", {
    method: "POST",
    body
  });
  await refresh();
}

function routeState() {
  return {
    tab: state.activeTab,
    overlay: state.overlay ? { ...state.overlay } : null
  };
}

function normalizeRoute(route) {
  const tab = "ask";
  const overlay = route?.overlay && typeof route.overlay === "object" ? route.overlay : null;
  return { tab, overlay };
}

function replaceHistoryRoute() {
  history.replaceState({ mobileCodex: true, route: routeState() }, "");
}

function pushHistoryRoute() {
  history.pushState({ mobileCodex: true, route: routeState() }, "");
}

function applyRoute(route, options = {}) {
  const next = normalizeRoute(route);
  state.activeTab = next.tab;
  state.overlay = next.overlay;
  localStorage.setItem(activeTabStorageKey, state.activeTab);
  render();
  if (!options.fromPop) {
    replaceHistoryRoute();
  }
}

function setActiveTab(tab) {
  state.activeTab = ["ask", "sessions", "agents", "more"].includes(tab) ? tab : "ask";
  state.overlay = null;
  state.swipedSessionId = "";
  localStorage.setItem(activeTabStorageKey, state.activeTab);
  render();
  replaceHistoryRoute();
}

function openPanel(view, extra = {}) {
  state.overlay = { kind: "panel", view, ...extra };
  renderOverlay();
  pushHistoryRoute();
}

function openSheet(view, extra = {}) {
  state.overlay = { kind: "sheet", view, ...extra };
  renderOverlay();
  pushHistoryRoute();
}

function closeOverlay(options = {}) {
  if (!state.overlay) {
    return;
  }
  if (!options.fromPop && history.state?.mobileCodex && history.state?.route?.overlay) {
    history.back();
    return;
  }
  state.overlay = null;
  renderOverlay();
  replaceHistoryRoute();
}

function showDashboard(visible) {
  hero.classList.toggle("hidden", visible);
  loginPanel.classList.toggle("hidden", visible);
  dashboard.classList.toggle("hidden", !visible);
  if (visible) {
    replaceHistoryRoute();
  } else {
    document.body.classList.remove("keyboard-active");
  }
}

function renderAuthStatus(auth) {
  const passkeysEnabled = !!auth?.passkeysEnabled;
  const hasPasskeys = !!auth?.hasPasskeys;
  const supported = webauthnAvailable();
  passkeyLoginBox.classList.toggle("hidden", !passkeysEnabled || !hasPasskeys);
  passkeyLoginButton.disabled = !supported;
  recoveryLoginBox.open = !passkeysEnabled || !hasPasskeys;
  passkeyLoginHint.textContent = !supported ? t("passkeyNoBrowser") : hasPasskeys ? t("passkeyLoginDefaultHint") : t("passkeyNoRegistered");

  if (!auth || !state.authenticated) {
    currentUserLine.textContent = t("signedOut");
    return;
  }
  const workspaceLabel = auth.workspaces?.find((item) => item.workspaceId === auth.currentWorkspaceId)?.name || t("noWorkspace");
  currentUserLine.textContent = t("currentUserSummary", {
    user: auth.currentUser?.displayName || t("userDefault"),
    role: auth.currentRole ? formatRoleLabel(auth.currentRole) : t("noRole"),
    workspace: workspaceLabel
  });
}

function syncTaskSelectors() {
  actionSelect.innerHTML = "";
  logSelect.innerHTML = "";
  for (const action of selectedAgent()?.actions || []) {
    const option = document.createElement("option");
    option.value = action.id;
    option.textContent = action.label || action.id;
    actionSelect.append(option);
  }
  for (const source of selectedAgent()?.logSources || []) {
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.label || source.id;
    logSelect.append(option);
  }
  syncTaskFields();
}

function workspaceOptionsHtml() {
  const workspaces = getCurrentAuth()?.workspaces || [];
  if (!workspaces.length) {
    return `<option value="">${escapeHtml(t("noWorkspace"))}</option>`;
  }
  return workspaces
    .map(
      (workspace) =>
        `<option value="${escapeHtml(workspace.workspaceId)}" ${workspace.workspaceId === getCurrentAuth()?.currentWorkspaceId ? "selected" : ""}>${escapeHtml(`${workspace.name} (${formatRoleLabel(workspace.role)})`)}</option>`
    )
    .join("");
}

function agentOptionsHtml() {
  const agents = (state.data?.agents || []).filter((agent) => !agent.revokedAt);
  return agents.length
    ? agents
        .map(
          (agent) =>
            `<option value="${escapeHtml(agent.agentId)}" ${agent.agentId === state.selectedAgentId ? "selected" : ""}>${escapeHtml(`${agent.label || agent.agentId} (${agent.agentId})`)}</option>`
        )
        .join("")
    : `<option value="">${escapeHtml(t("noAgents"))}</option>`;
}

function syncTaskFields() {
  const isResume = Boolean(state.selectedSessionId);
  const relayFeatures = state.data?.features || {};
  codexPromptRow.classList.toggle("hidden", state.taskType !== "codex_exec");
  cwdRow.classList.toggle("hidden", state.taskType !== "codex_exec" || isResume);
  writeRow.classList.toggle("hidden", state.taskType !== "codex_exec" || isResume || !relayFeatures.codexExecWrite);
  actionRow.classList.toggle("hidden", state.taskType !== "run_action");
  logRow.classList.toggle("hidden", state.taskType !== "read_log");
  taskPromptLabel.textContent = isResume ? t("continuePrompt") : t("prompt");
  for (const button of taskTypeButtons) {
    button.classList.toggle("active", button.dataset.taskType === state.taskType);
  }
  const session = selectedSession();
  resumeSessionBanner.classList.toggle("hidden", !session);
  resumeSessionLabel.textContent = session ? `${session.title} · ${session.sessionId} · ${session.cwd || "."}` : "";
  const agent = selectedAgent();
  askFootnote.textContent = !agent
    ? t("noWorkspaceSelectedHint")
    : state.selectedSessionId
      ? `${t("sessionLabel", { session: state.selectedSessionId })}`
      : `${agent.label || agent.agentId} · ${agent.workspaceRootName || "."}`;
}

function render() {
  if (!state.authenticated || !state.data) {
    renderOverlay();
    updateKeyboardState();
    return;
  }
  workspaceTitle.textContent = currentWorkspace()?.name || t("currentWorkspace");
  statusLine.textContent = t("statusSummary", {
    workspace: currentWorkspace()?.name || t("noWorkspace"),
    agents: state.data.agents?.length || 0,
    tasks: state.data.tasks?.length || 0
  });
  syncTaskSelectors();
  renderAsk();
  renderAgents();
  renderBadges();
  renderOverlay();
  updateKeyboardState();
}

function renderBadges() {
  const needsEnrollment = !!state.data?.auth?.needsPasskeyEnrollment;
  moreBadge.classList.toggle("hidden", !needsEnrollment);
  moreBadge.textContent = needsEnrollment ? "•" : "";
}

function renderAsk() {
  const tasks = (state.data?.tasks || []).slice(0, 6);
  const permissions = currentPermissions();
  taskForm.classList.toggle("hidden", !permissions.createTasks || !currentWorkspace() || !selectedAgent());
  tasksEl.innerHTML = tasks.length ? tasks.map(taskCard).join("") : emptyState(t("noTasks"));
  syncTaskFields();
}

function renderAgents() {
  const pending = state.data?.pendingPairRequests || [];
  priorityEventsEl.innerHTML = pending.length ? pending.map(pairRequestCard).join("") : emptyState(t("noPendingDevices"));
}

function filteredSessions() {
  const agent = selectedAgent();
  const filter = state.sessionFilter.trim().toLowerCase();
  let sessions = agent?.codexSessions || [];
  if (filter) {
    sessions = sessions.filter((session) => {
      const haystack = [session.title, session.sessionId, session.cwd, session.firstUserMessage].join(" ").toLowerCase();
      return haystack.includes(filter);
    });
  }
  return sessions;
}

function sessionsDrawerHtml() {
  const sessions = filteredSessions();
  return `
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("sessionEyebrow"))}</p>
          <h3>${escapeHtml(t("codexSessions"))}</h3>
        </div>
      </div>
      <p class="hint">${escapeHtml(t("sessionsHint"))}</p>
      <label class="search-field" style="margin-top:12px;">
        <span class="hidden">${escapeHtml(t("searchSessions"))}</span>
        <input id="panel-session-filter" type="search" autocomplete="off" value="${escapeHtml(state.sessionFilter)}" placeholder="${escapeHtml(t("searchSessions"))}">
      </label>
      <div class="session-stack" style="margin-top:14px;">${sessions.length ? sessions.map((session) => sessionRow(session)).join("") : emptyState(t("noSessions"))}</div>
    </section>
  `;
}

function contextPanelHtml() {
  const agent = selectedAgent();
  return `
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("controlPlane"))}</p>
          <h3>${escapeHtml(t("currentWorkspace"))}</h3>
        </div>
      </div>
      <div class="context-strip">
        <label class="select-card">
          <span>${escapeHtml(t("workspace"))}</span>
          <select id="context-workspace-id">${workspaceOptionsHtml()}</select>
        </label>
        <label class="select-card">
          <span>${escapeHtml(t("agent"))}</span>
          <select id="context-agent-id">${agentOptionsHtml()}</select>
        </label>
      </div>
      <p class="hint" style="margin-top:12px;">${escapeHtml(t("currentUserSummary", {
        user: getCurrentAuth()?.currentUser?.displayName || t("userDefault"),
        role: getCurrentAuth()?.currentRole ? formatRoleLabel(getCurrentAuth()?.currentRole) : t("noRole"),
        workspace: currentWorkspace()?.name || t("noWorkspace")
      }))}</p>
    </section>
    <section class="card" style="margin-top:12px;">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("agentsEyebrow"))}</p>
          <h3>${escapeHtml(agent?.label || t("agent"))}</h3>
        </div>
        <button type="button" class="secondary" data-open-sheet="pair">${escapeHtml(t("pairNewAgent"))}</button>
      </div>
      ${agent ? agentCard(agent) : emptyState(t("noAgents"))}
      <div style="margin-top:14px;">${(state.data?.pendingPairRequests || []).length ? state.data.pendingPairRequests.map(pairRequestCard).join("") : emptyState(t("noPendingDevices"))}</div>
    </section>
  `;
}

function controlPanelHtml() {
  return `
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("moreEyebrow"))}</p>
          <h3>${escapeHtml(t("moreTitle"))}</h3>
        </div>
      </div>
      <div class="locale-switch control-locale" role="group" aria-label="Language">
        <button type="button" class="locale-button ${state.locale === "en" ? "active" : ""}" data-set-locale="en">EN</button>
        <button type="button" class="locale-button ${state.locale === "zh" ? "active" : ""}" data-set-locale="zh">中文</button>
      </div>
      <div class="menu-stack" style="margin-top:14px;">
        <button type="button" class="menu-card" data-open-panel="workspace">
          <strong>${escapeHtml(t("workspaceTitle"))}</strong>
          <span>${escapeHtml(t("workspaceHintShort"))}</span>
        </button>
        <button type="button" class="menu-card" data-open-panel="access">
          <strong>${escapeHtml(t("accessTitle"))}</strong>
          <span>${escapeHtml(t("accessHintShort"))}</span>
        </button>
        <button type="button" class="menu-card" data-clear-cache>
          <strong>${escapeHtml(t("clearCache"))}</strong>
          <span>${escapeHtml(t("clearCacheHint"))}</span>
        </button>
      </div>
    </section>
  `;
}

function renderOverlay() {
  const overlay = state.overlay;
  const visible = !!overlay;
  backdrop.classList.toggle("hidden", !visible);
  backdrop.classList.toggle("visible", visible);
  sidePanel.classList.toggle("hidden", !visible || overlay?.kind !== "panel");
  sidePanel.classList.toggle("visible", visible && overlay?.kind === "panel");
  bottomSheet.classList.toggle("hidden", !visible || overlay?.kind !== "sheet");
  bottomSheet.classList.toggle("visible", visible && overlay?.kind === "sheet");
  sidePanel.setAttribute("aria-hidden", String(!(visible && overlay?.kind === "panel")));
  bottomSheet.setAttribute("aria-hidden", String(!(visible && overlay?.kind === "sheet")));

  if (!visible) {
    panelTitle.textContent = "";
    panelEyebrow.textContent = "";
    panelContent.innerHTML = "";
    sheetTitle.textContent = "";
    sheetEyebrow.textContent = "";
    sheetContent.innerHTML = "";
    return;
  }
  if (overlay.kind === "panel") {
    renderPanel();
  } else {
    renderSheet();
  }
}

function renderPanel() {
  const overlay = state.overlay;
  if (!overlay || overlay.kind !== "panel") {
    return;
  }
  if (overlay.view === "context") {
    panelEyebrow.textContent = t("controlPlane");
    panelTitle.textContent = currentWorkspace()?.name || t("currentWorkspace");
    panelContent.innerHTML = contextPanelHtml();
  } else if (overlay.view === "sessions") {
    panelEyebrow.textContent = t("sessionEyebrow");
    panelTitle.textContent = t("codexSessions");
    panelContent.innerHTML = sessionsDrawerHtml();
  } else if (overlay.view === "control") {
    panelEyebrow.textContent = t("moreEyebrow");
    panelTitle.textContent = t("moreTitle");
    panelContent.innerHTML = controlPanelHtml();
  } else if (overlay.view === "workspace") {
    panelEyebrow.textContent = t("workspaceSetupEyebrow");
    panelTitle.textContent = t("workspaceTitle");
    panelContent.innerHTML = workspacePanelHtml();
  } else if (overlay.view === "access") {
    panelEyebrow.textContent = t("accessEyebrow");
    panelTitle.textContent = t("accessTitle");
    panelContent.innerHTML = accessPanelHtml();
  } else if (overlay.view === "session") {
    const session = findSessionById(overlay.sessionId);
    panelEyebrow.textContent = t("sessionEyebrow");
    panelTitle.textContent = session?.title || t("codexSessionDefault");
    panelContent.innerHTML = sessionPanelHtml(session);
  } else if (overlay.view === "agent") {
    const agent = findAgentById(overlay.agentId || state.selectedAgentId);
    panelEyebrow.textContent = t("agentsEyebrow");
    panelTitle.textContent = agent?.label || agent?.agentId || t("agent");
    panelContent.innerHTML = agentPanelHtml(agent);
  }
}

function renderSheet() {
  const overlay = state.overlay;
  if (!overlay || overlay.kind !== "sheet") {
    return;
  }
  if (overlay.view === "pair") {
    sheetEyebrow.textContent = t("agentsEyebrow");
    sheetTitle.textContent = t("pairNewAgent");
    sheetContent.innerHTML = pairSheetHtml();
  }
}

function taskCard(task) {
  const permissions = currentPermissions();
  const needsDecision = task.status === "awaiting_approval" && permissions.approveTasks;
  const output = task.outputTail ? `<pre>${escapeHtml(task.outputTail)}</pre>` : "";
  const diff = task.diffText ? `<details><summary>Diff</summary><pre>${escapeHtml(task.diffText)}</pre></details>` : "";
  const error = task.error ? `<p class="task-summary" style="color:#c62828;">${escapeHtml(task.error)}</p>` : "";
  return `
    <article class="task-card">
      <header>
        <div>
          <strong>${escapeHtml(task.title || task.type)}</strong>
          <p>${escapeHtml(task.agentId)} · ${escapeHtml(task.status)}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDateTime(task.updatedAt))}</div>
      </header>
      ${task.prompt ? `<p class="task-body">${escapeHtml(task.prompt)}</p>` : ""}
      ${task.resumeSessionId ? `<p class="task-summary">${escapeHtml(t("sessionLabel", { session: task.resumeSessionId }))}</p>` : ""}
      ${task.sessionId ? `<p class="task-summary">${escapeHtml(t("targetSessionLabel", { session: task.sessionId }))}</p>` : ""}
      ${task.actionId ? `<p class="task-summary">${escapeHtml(t("actionLabel", { action: task.actionId }))}</p>` : ""}
      ${task.logSourceId ? `<p class="task-summary">${escapeHtml(t("logLabel", { log: task.logSourceId }))}</p>` : ""}
      ${task.summary ? `<p class="task-summary">${escapeHtml(task.summary)}</p>` : ""}
      ${error}
      ${output}
      ${diff}
      ${
        needsDecision
          ? `<div class="actions">
               <button data-approve-task="${task.taskId}" type="button">${escapeHtml(t("approve"))}</button>
               <button data-reject-task="${task.taskId}" type="button" class="secondary">${escapeHtml(t("reject"))}</button>
             </div>`
          : ""
      }
    </article>
  `;
}

function sessionRow(session) {
  const preview = (session.preview || [])
    .map((item) => `<div class="preview-line ${item.role === "assistant" ? "assistant" : "user"}"><strong>${escapeHtml(formatPreviewRole(item.role))}</strong> ${escapeHtml(item.text)}</div>`)
    .join("");
  return `
    <article class="session-swipe" data-session-id="${escapeHtml(session.sessionId)}">
      <div class="session-delete">
        <button type="button" data-delete-session="${escapeHtml(session.sessionId)}">${escapeHtml(t("delete"))}</button>
      </div>
      <div class="session-card-content" data-session-id="${escapeHtml(session.sessionId)}">
        <header>
          <div>
            <strong>${escapeHtml(session.title || t("codexSessionDefault"))}</strong>
            <p>${escapeHtml(session.cwd || ".")}</p>
          </div>
          <div class="row-meta">${escapeHtml(formatDateTime(session.updatedAt))}</div>
        </header>
        ${session.firstUserMessage ? `<p class="task-body">${escapeHtml(session.firstUserMessage)}</p>` : ""}
        <div class="preview-stack">${preview || `<div class="preview-line">${escapeHtml(t("noPreview"))}</div>`}</div>
      </div>
    </article>
  `;
}

function pairRequestCard(request) {
  const canApprove = currentPermissions().pairAgents;
  return `
    <article class="pair-card">
      <header>
        <div>
          <strong>${escapeHtml(request.label || request.agentId || t("pendingDevice"))}</strong>
          <p>${escapeHtml(t("statusPending"))} · ${escapeHtml(request.agentId)} · ${escapeHtml(request.hostname || t("unknownHost"))}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDateTime(request.createdAt))}</div>
      </header>
      ${request.note ? `<p class="task-body">${escapeHtml(request.note)}</p>` : ""}
      ${request.workspaceRootName ? `<p class="task-summary">${escapeHtml(t("workspaceLabel", { workspace: request.workspaceRootName }))}</p>` : ""}
      ${
        canApprove
          ? `<div class="actions">
               <button type="button" data-approve-pair="${request.requestId}">${escapeHtml(t("approveDevice"))}</button>
               <button type="button" class="danger-action" data-reject-pair="${request.requestId}">${escapeHtml(t("reject"))}</button>
             </div>`
          : `<p class="task-summary">${escapeHtml(t("operatorsApprovePair"))}</p>`
      }
    </article>
  `;
}

function agentCard(agent) {
  const statusLabel = agentStatusLabel(agent);
  return `
    <article class="agent-card">
      <header>
        <div>
          <strong>${escapeHtml(agent.label || agent.agentId)}</strong>
          <p>${escapeHtml(statusLabel)} · ${escapeHtml(agent.agentId)}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDateTime(agent.lastSeenAt || agent.createdAt))}</div>
      </header>
      ${agent.workspaceRootName ? `<p class="task-summary">${escapeHtml(t("workspaceLabel", { workspace: agent.workspaceRootName }))}</p>` : ""}
      <p class="task-summary">${escapeHtml(`${agent.actions?.length || 0} actions · ${agent.logSources?.length || 0} logs`)}</p>
      <div class="actions">
        <button type="button" class="secondary" data-open-agent="${escapeHtml(agent.agentId)}">${escapeHtml(t("agentDetails"))}</button>
      </div>
    </article>
  `;
}

function passkeyCard(passkey) {
  return `
    <article class="passkey-card">
      <header>
        <div>
          <strong>${escapeHtml(passkey.label || t("passkeyDefault"))}</strong>
          <p>${escapeHtml(passkey.displayId || passkey.passkeyId || "")}</p>
        </div>
        <div class="row-meta">${escapeHtml(passkey.lastUsedAt ? t("usedDate", { date: formatDate(passkey.lastUsedAt) }) : t("neverUsed"))}</div>
      </header>
      <p class="task-summary">${escapeHtml(t("createdAt", { date: formatDateTime(passkey.createdAt) }))}</p>
      ${
        (passkey.transports || []).length
          ? `<p class="task-summary">${escapeHtml(t("transportsLabel", { transports: passkey.transports.join(", ") }))}</p>`
          : ""
      }
      <div class="actions">
        <button type="button" class="secondary" data-revoke-passkey="${escapeHtml(passkey.passkeyId)}">${escapeHtml(t("revoke"))}</button>
      </div>
    </article>
  `;
}

function memberCard(member) {
  return `
    <article class="agent-card">
      <header>
        <div>
          <strong>${escapeHtml(member.displayName)}</strong>
          <p>${escapeHtml(formatRoleLabel(member.role))}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDate(member.createdAt))}</div>
      </header>
      ${
        currentPermissions().manageMembers || currentPermissions().manageRelayUsers
          ? `<div class="actions"><button type="button" class="secondary" data-revoke-membership="${escapeHtml(member.membershipId)}">${escapeHtml(t("removeMember"))}</button></div>`
          : ""
      }
    </article>
  `;
}

function invitationCard(invitation) {
  const title =
    invitation.type === "account"
      ? t("accountInviteCardTitle")
      : t("workspaceInviteCardTitle", { role: formatRoleLabel(invitation.role) });
  const summary =
    invitation.type === "workspace" && invitation.workspaceName
      ? t("workspaceLabel", { workspace: invitation.workspaceName })
      : t("accountInviteCardHint");
  return `
    <article class="agent-card">
      <header>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(invitation.createdByDisplayName || t("owner"))}</p>
        </div>
        <div class="row-meta">${escapeHtml(`${t("expiresLabel")} ${formatDateTime(invitation.expiresAt)}`)}</div>
      </header>
      <p class="task-summary">${escapeHtml(summary)}</p>
      ${invitation.note ? `<p class="task-body">${escapeHtml(invitation.note)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-revoke-invite="${escapeHtml(invitation.inviteId)}">${escapeHtml(t("revoke"))}</button>
      </div>
    </article>
  `;
}

function userCard(user) {
  const statuses = [];
  if (user.isRelayOwner) {
    statuses.push(t("relayOwnerBadge"));
  }
  if (user.disabledAt) {
    statuses.push(t("disabledUser"));
  } else if (user.passkeyCount === 0) {
    statuses.push(t("passkeySetupPending"));
  } else {
    statuses.push(t("activeUser"));
  }
  const memberships = Array.isArray(user.memberships) ? user.memberships : [];
  const membershipHtml = memberships.length
    ? memberships
        .map(
          (membership) => `
            <div class="membership-row">
              <span>${escapeHtml(t("membershipSummary", { workspace: membership.name, role: formatRoleLabel(membership.role) }))}</span>
              <button type="button" class="secondary" data-revoke-membership="${escapeHtml(membership.membershipId)}">${escapeHtml(t("removeMember"))}</button>
            </div>
          `
        )
        .join("")
    : `<p class="hint">${escapeHtml(t("noMemberships"))}</p>`;
  return `
    <article class="user-card">
      <header>
        <div>
          <strong>${escapeHtml(user.displayName)}</strong>
          <p>${escapeHtml(user.userId)}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDate(user.createdAt))}</div>
      </header>
      <p class="task-summary">${escapeHtml(statuses.join(" · "))}</p>
      <p class="task-summary">${escapeHtml(t("passkeysCountLabel", { count: user.passkeyCount }))} · ${escapeHtml(t("sessionsCountLabel", { count: user.activeSessionCount }))}</p>
      ${user.lastWorkspaceName ? `<p class="task-summary">${escapeHtml(t("lastWorkspaceLabel", { workspace: user.lastWorkspaceName }))}</p>` : ""}
      ${user.activeRecovery ? `<p class="task-summary">${escapeHtml(t("activeRecoveryUntil", { expires: formatDateTime(user.activeRecovery.expiresAt) }))}</p>` : ""}
      <div class="member-list">${membershipHtml}</div>
      <div class="actions">
        ${user.disabledAt ? `<button type="button" data-enable-user="${escapeHtml(user.userId)}">${escapeHtml(t("enableUser"))}</button>` : `<button type="button" data-create-user-recovery="${escapeHtml(user.userId)}">${escapeHtml(t("createRecoveryCode"))}</button>`}
        <button type="button" class="secondary" data-revoke-user-sessions="${escapeHtml(user.userId)}">${escapeHtml(t("revokeSessions"))}</button>
        ${user.disabledAt || user.isRelayOwner ? "" : `<button type="button" class="secondary" data-disable-user="${escapeHtml(user.userId)}">${escapeHtml(t("disableUser"))}</button>`}
        ${!user.isRelayOwner && user.passkeyCount === 0 && memberships.length === 0 ? `<button type="button" class="secondary" data-delete-user="${escapeHtml(user.userId)}">${escapeHtml(t("deleteUser"))}</button>` : ""}
      </div>
    </article>
  `;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function workspacePanelHtml() {
  const auth = state.data?.auth || {};
  const permissions = currentPermissions();
  const members = state.data?.members || [];
  const invitations = state.data?.invitations || [];
  return `
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("workspaceSetupEyebrow"))}</p>
          <h3>${escapeHtml(t("spaces"))}</h3>
        </div>
      </div>
      ${permissions.createWorkspaces ? `
        <form id="workspace-form" class="stack-form">
          <label>
            <span>${escapeHtml(t("createWorkspace"))}</span>
            <input id="workspace-name" type="text" maxlength="80" placeholder="${escapeHtml(t("workspaceNamePlaceholder"))}">
          </label>
          <button type="submit">${escapeHtml(t("createWorkspace"))}</button>
        </form>
      ` : ""}
      <form id="join-workspace-form" class="stack-form" style="margin-top:14px;">
        <label>
          <span>${escapeHtml(t("joinWorkspaceWithInvite"))}</span>
          <input id="join-invite-code" type="text" autocomplete="off" placeholder="ABCD-EFGH-IJKL">
        </label>
        <button type="submit" class="secondary">${escapeHtml(t("joinWorkspaceButton"))}</button>
      </form>
      <p class="hint" style="margin-top:12px;">${escapeHtml(t("joinWorkspaceHint"))}</p>
    </section>

    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("membersEyebrow"))}</p>
          <h3>${escapeHtml(t("peopleAndInvites"))}</h3>
        </div>
      </div>
      <div>${permissions.manageMembers && currentWorkspace() ? (members.length ? members.map(memberCard).join("") : emptyState(t("noMembers"))) : emptyState(t("ownersManageMembers"))}</div>
      ${(permissions.manageMembers || permissions.createAccountInvites) ? `
        <form id="invite-form" class="stack-form" style="margin-top:16px;">
          <label>
            <span>${escapeHtml(t("inviteType"))}</span>
            <select id="invite-type">
              <option value="account" ${state.inviteType === "account" ? "selected" : ""}>${escapeHtml(t("accountInvite"))}</option>
              <option value="workspace" ${state.inviteType === "workspace" ? "selected" : ""}>${escapeHtml(t("workspaceInvite"))}</option>
            </select>
          </label>
          <p id="invite-type-summary" class="hint">${escapeHtml(state.inviteType === "workspace" ? t("inviteTypeSummaryWorkspace") : t("inviteTypeSummaryAccount"))}</p>
          <label ${state.inviteType === "workspace" ? "" : 'class="hidden"'}>
            <span>${escapeHtml(t("role"))}</span>
            <select id="invite-role">
              <option value="viewer">${escapeHtml(t("viewer"))}</option>
              <option value="operator">${escapeHtml(t("operator"))}</option>
              <option value="owner">${escapeHtml(t("owner"))}</option>
            </select>
          </label>
          <label>
            <span>${escapeHtml(t("note"))}</span>
            <input id="invite-note" type="text" maxlength="120" placeholder="${escapeHtml(t("inviteNotePlaceholder"))}">
          </label>
          <label>
            <span>${escapeHtml(t("ttlSeconds"))}</span>
            <input id="invite-ttl" type="number" min="300" max="604800" value="86400">
          </label>
          <button type="submit">${escapeHtml(state.inviteType === "workspace" ? t("createWorkspaceInvite") : t("createAccountInvite"))}</button>
        </form>
      ` : ""}
      ${state.inviteResultText ? `<pre class="result-box" style="margin-top:14px;">${escapeHtml(state.inviteResultText)}</pre>` : ""}
      <div style="margin-top:14px;">${permissions.manageMembers && currentWorkspace() ? (invitations.length ? invitations.map(invitationCard).join("") : emptyState(t("noInvites"))) : ""}</div>
    </section>
  `;
}

function accessPanelHtml() {
  const auth = state.data?.auth || {};
  const permissions = currentPermissions();
  const passkeys = auth.passkeys || [];
  const users = state.data?.users || [];
  const supported = webauthnAvailable();
  const passkeySummary = auth.needsPasskeyEnrollment
    ? t("passkeyEnrollRequired")
    : auth.passkeysEnabled
      ? t("passkeysSummary", { count: auth.passkeyCount || 0 })
      : t("passkeysUnavailable");
  return `
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("accessEyebrow"))}</p>
          <h3>${escapeHtml(t("security"))}</h3>
        </div>
      </div>
      <p class="hint">${escapeHtml(passkeySummary)}</p>
      ${auth.passkeysEnabled && supported ? `
        <form id="passkey-form" class="stack-form">
          <label>
            <span>${escapeHtml(t("newPasskeyLabel"))}</span>
            <input id="passkey-label" type="text" maxlength="80" placeholder="${escapeHtml(t("passkeyLabelPlaceholder"))}">
          </label>
          <button type="submit">${escapeHtml(t("addPasskey"))}</button>
        </form>
      ` : ""}
      <div style="margin-top:14px;">${passkeys.length ? passkeys.map(passkeyCard).join("") : emptyState(t("noPasskeys"))}</div>
    </section>
    ${
      permissions.manageRelayUsers
        ? `
          <section class="card">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">${escapeHtml(t("relayUsersEyebrow"))}</p>
                <h3>${escapeHtml(t("relayUsers"))}</h3>
              </div>
            </div>
            <p class="hint">${escapeHtml(t("relayUsersHint"))}</p>
            ${state.userAdminResultText ? `<pre class="result-box" style="margin-top:14px;">${escapeHtml(state.userAdminResultText)}</pre>` : ""}
            <div style="margin-top:14px;">${users.length ? users.map(userCard).join("") : emptyState(t("noUsers"))}</div>
          </section>
        `
        : ""
    }
  `;
}

function sessionPanelHtml(session) {
  if (!session) {
    return emptyState(t("noSessions"));
  }
  const canContinue = currentPermissions().createTasks;
  const canReadConversation = currentPermissions().createTasks;
  const readTask = latestSessionReadTask(session.sessionId);
  const preview = (session.preview || [])
    .map((item) => `<div class="preview-line ${item.role === "assistant" ? "assistant" : "user"}"><strong>${escapeHtml(formatPreviewRole(item.role))}</strong> ${escapeHtml(item.text)}</div>`)
    .join("");
  const messages = Array.isArray(readTask?.result?.messages) ? readTask.result.messages : [];
  const conversationHtml =
    readTask?.status === "queued" || readTask?.status === "running"
      ? `<div class="empty-state">${escapeHtml(t("loadingConversation"))}</div>`
      : messages.length
        ? `
            <section class="card" style="margin-top:12px;">
              <div class="section-head compact">
                <div>
                  <p class="eyebrow">${escapeHtml(t("sessionEyebrow"))}</p>
                  <h3>${escapeHtml(t("conversationMessages", { count: messages.length }))}</h3>
                </div>
              </div>
              <div class="preview-stack">
                ${messages
                  .map(
                    (item) =>
                      `<div class="preview-line ${item.role === "assistant" ? "assistant" : "user"}"><strong>${escapeHtml(formatPreviewRole(item.role))}</strong> ${escapeHtml(item.text)}</div>`
                  )
                  .join("")}
              </div>
            </section>
          `
        : "";
  return `
    <section class="card session-detail-card">
      <header>
        <div>
          <strong>${escapeHtml(session.title || t("codexSessionDefault"))}</strong>
          <p>${escapeHtml(session.sessionId)} · ${escapeHtml(session.cwd || ".")}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDateTime(session.updatedAt))}</div>
      </header>
      ${session.firstUserMessage ? `<p class="task-body">${escapeHtml(session.firstUserMessage)}</p>` : ""}
      <div class="preview-stack">${preview || `<div class="preview-line">${escapeHtml(t("noPreview"))}</div>`}</div>
      ${
        canContinue || canReadConversation
          ? `<div class="actions">
               ${canContinue ? `<button type="button" data-continue-session="${escapeHtml(session.sessionId)}">${escapeHtml(t("continueHere"))}</button>` : ""}
               ${canReadConversation ? `<button type="button" class="secondary" data-read-session="${escapeHtml(session.sessionId)}">${escapeHtml(t("loadConversation"))}</button>` : ""}
               <button type="button" class="danger-action" data-delete-session="${escapeHtml(session.sessionId)}">${escapeHtml(t("delete"))}</button>
             </div>`
          : `<p class="task-summary">${escapeHtml(t("operatorsContinueDelete"))}</p>`
      }
    </section>
    ${conversationHtml}
  `;
}

function agentPanelHtml(agent) {
  if (!agent) {
    return emptyState(t("noAgents"));
  }
  const canRevoke = currentPermissions().revokeAgents && !agent.revokedAt;
  const actions = agent.actions?.length
    ? agent.actions.map((action) => `<div class="membership-row"><span>${escapeHtml(action.label || action.id)}</span><span>${escapeHtml(action.id)}</span></div>`).join("")
    : `<p class="hint">${escapeHtml(t("taskTypeAction"))}: 0</p>`;
  const logs = agent.logSources?.length
    ? agent.logSources.map((source) => `<div class="membership-row"><span>${escapeHtml(source.label || source.id)}</span><span>${escapeHtml(source.id)}</span></div>`).join("")
    : `<p class="hint">${escapeHtml(t("taskTypeLog"))}: 0</p>`;
  return `
    <section class="card">
      <header>
        <div>
          <strong>${escapeHtml(agent.label || agent.agentId)}</strong>
          <p>${escapeHtml(agentStatusLabel(agent))} · ${escapeHtml(agent.agentId)}</p>
        </div>
        <div class="row-meta">${escapeHtml(formatDateTime(agent.lastSeenAt || agent.createdAt))}</div>
      </header>
      ${agent.workspaceRootName ? `<p class="task-summary">${escapeHtml(t("workspaceLabel", { workspace: agent.workspaceRootName }))}</p>` : ""}
      <p class="task-summary">${escapeHtml(`Actions ${agent.actions?.length || 0} · Logs ${agent.logSources?.length || 0}`)}</p>
      ${canRevoke ? `<div class="actions"><button type="button" class="danger-action" data-revoke-agent="${escapeHtml(agent.agentId)}">${escapeHtml(t("revokeAgent"))}</button></div>` : ""}
    </section>
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("taskTypeAction"))}</p>
          <h3>${escapeHtml(t("action"))}</h3>
        </div>
      </div>
      ${actions}
    </section>
    <section class="card">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">${escapeHtml(t("taskTypeLog"))}</p>
          <h3>${escapeHtml(t("logSource"))}</h3>
        </div>
      </div>
      ${logs}
    </section>
  `;
}

function pairSheetHtml() {
  const result = state.pairingResult;
  return `
    <form id="pair-form" class="stack-form">
      <label>
        <span>${escapeHtml(t("note"))}</span>
        <input id="pair-note" type="text" maxlength="120" placeholder="${escapeHtml(t("pairNotePlaceholder"))}">
      </label>
      <label>
        <span>${escapeHtml(t("ttlSeconds"))}</span>
        <input id="pair-ttl" type="number" min="60" max="1800" value="300">
      </label>
      <button type="submit">${escapeHtml(t("pairNewAgent"))}</button>
    </form>
    ${
      result
        ? `
          <pre class="result-box" style="margin-top:14px;">${escapeHtml(`${t("shortPairCodeLabel")}: ${result.pairingCode}\n${t("expiresLabel")}: ${result.expiresAt}\n${t("pairResultHint")}`)}</pre>
          <div class="card" style="margin-top:12px;">
            <label class="stack-form">
              <span>${escapeHtml(t("suggestedPairCommand"))}</span>
              <textarea id="pair-command" rows="3" readonly>${escapeHtml(buildPairCommand(result.pairingCode))}</textarea>
            </label>
            <div class="actions">
              <button type="button" class="secondary" data-copy-pair-command>${escapeHtml(t("copyPairCommand"))}</button>
            </div>
          </div>
        `
        : ""
    }
  `;
}

function findSessionById(sessionId) {
  const agent = selectedAgent();
  return (agent?.codexSessions || []).find((session) => session.sessionId === sessionId) || null;
}

function findAgentById(agentId) {
  return (state.data?.agents || []).find((agent) => agent.agentId === agentId) || null;
}

function latestSessionReadTask(sessionId) {
  return (state.data?.tasks || [])
    .filter((task) => task.type === "read_session" && task.sessionId === sessionId && task.agentId === state.selectedAgentId)
    .sort((left, right) => Date.parse(right.updatedAt || right.createdAt || "") - Date.parse(left.updatedAt || left.createdAt || ""))[0] || null;
}

function removeSessionFromLocalState(agentId, sessionId) {
  if (state.sessionCache[agentId]?.sessions) {
    state.sessionCache[agentId].sessions = state.sessionCache[agentId].sessions.filter((item) => item.sessionId !== sessionId);
    persistSessionCache();
  }
  if (state.data?.agents) {
    state.data.agents = state.data.agents.map((agent) =>
      agent.agentId === agentId
        ? {
            ...agent,
            codexSessions: (agent.codexSessions || []).filter((item) => item.sessionId !== sessionId)
          }
        : agent
    );
  }
}

function updateKeyboardState() {
  const narrow = window.matchMedia("(max-width: 820px)").matches;
  const focusInsideComposer =
    narrow &&
    state.authenticated &&
    state.activeTab === "ask" &&
    taskForm.contains(document.activeElement) &&
    ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "");
  document.body.classList.toggle("keyboard-active", focusInsideComposer);
}

function startSwipe(event) {
  const content = event.target.closest(".session-card-content");
  if (!content || event.target.closest("button")) {
    return;
  }
  const sessionId = content.dataset.sessionId;
  gesture = {
    pointerId: event.pointerId,
    sessionId,
    content,
    startX: event.clientX,
    currentOffset: sessionId === state.swipedSessionId ? -92 : 0,
    moved: false
  };
  content.setPointerCapture?.(event.pointerId);
}

function moveSwipe(event) {
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  const delta = event.clientX - gesture.startX;
  if (Math.abs(delta) > 8) {
    gesture.moved = true;
  }
  if (!gesture.moved) {
    return;
  }
  const offset = Math.min(0, Math.max(-92, gesture.currentOffset + delta));
  gesture.content.style.transition = "none";
  gesture.content.style.transform = `translateX(${offset}px)`;
}

function endSwipe(event) {
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return;
  }
  const content = gesture.content;
  const transform = content.style.transform || "";
  const match = transform.match(/-?\d+/);
  const offset = match ? Number(match[0]) : 0;
  state.swipedSessionId = offset <= -46 ? gesture.sessionId : "";
  content.style.transition = "";
  content.style.transform = "";
  gesture = null;
  renderOverlay();
}

async function handleDeleteSession(sessionId) {
  const session = findSessionById(sessionId);
  const label = session ? `${session.title} (${session.sessionId})` : sessionId;
  if (!confirm(t("deleteSessionConfirm", { label }))) {
    return;
  }
  await submitTask({
    agentId: state.selectedAgentId,
    type: "delete_session",
    title: t("delete"),
    sessionId
  });
  removeSessionFromLocalState(state.selectedAgentId, sessionId);
  if (state.selectedSessionId === sessionId) {
    clearSelectedSession();
  }
  state.swipedSessionId = "";
  render();
}

function bindGlobalEvents() {
  document.querySelector("#lang-en").addEventListener("click", () => setLocale("en"));
  document.querySelector("#lang-zh").addEventListener("click", () => setLocale("zh"));

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await login(document.querySelector("#bootstrap-token").value.trim());
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  inviteLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await redeemInvite(document.querySelector("#invite-code").value.trim(), document.querySelector("#invite-display-name").value.trim());
      document.querySelector("#invite-code").value = "";
      document.querySelector("#invite-display-name").value = "";
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  userRecoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await redeemRecoveryCode(document.querySelector("#user-recovery-code").value.trim());
      document.querySelector("#user-recovery-code").value = "";
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  passkeyLoginButton.addEventListener("click", async () => {
    try {
      await loginWithPasskey();
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  refreshButton.addEventListener("click", () => {
    refresh().catch((error) => alert(String(error.message || error)));
  });
  logoutButton.addEventListener("click", () => {
    logout().catch(() => {});
  });

  taskTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.taskType = button.dataset.taskType;
      if (state.taskType !== "codex_exec") {
        clearSelectedSession();
      }
      syncTaskFields();
    });
  });

  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const type = state.taskType;
      const body = {
        agentId: state.selectedAgentId,
        type,
        title: type === "codex_exec" ? t("taskTypeCodex") : type === "run_action" ? t("taskTypeAction") : t("taskTypeLog")
      };
      if (type === "codex_exec") {
        body.prompt = taskPrompt.value;
        body.cwd = taskCwd.value || ".";
        body.writeAccess = state.selectedSessionId ? false : taskWrite.checked;
        if (state.selectedSessionId) {
          body.resumeSessionId = state.selectedSessionId;
          body.title = t("continuingSession");
        }
      } else if (type === "run_action") {
        body.actionId = actionSelect.value;
        body.title = t("actionLabel", { action: actionSelect.value });
      } else if (type === "read_log") {
        body.logSourceId = logSelect.value;
        body.title = t("logLabel", { log: logSelect.value });
      }
      await submitTask(body);
      render();
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  clearSessionSelectionButton.addEventListener("click", () => {
    clearSelectedSession();
    render();
  });

  document.addEventListener("click", (event) => {
    const panelTrigger = event.target.closest("[data-open-panel]");
    if (panelTrigger) {
      const target = panelTrigger.dataset.openPanel;
      if (target === "workspace" || target === "access" || target === "context" || target === "sessions" || target === "control") {
        openPanel(target);
        return;
      }
      if (target === "agent-current") {
        openPanel("agent", { agentId: state.selectedAgentId });
        return;
      }
    }
    const sheetTrigger = event.target.closest("[data-open-sheet]");
    if (sheetTrigger?.dataset.openSheet === "pair") {
      openSheet("pair");
    }
  });

  tasksEl.addEventListener("click", async (event) => {
    const approveId = event.target.getAttribute("data-approve-task");
    const rejectId = event.target.getAttribute("data-reject-task");
    try {
      if (approveId) {
        await api(`/api/admin/tasks/${approveId}/approve`, { method: "POST" });
        await refresh();
      } else if (rejectId) {
        await api(`/api/admin/tasks/${rejectId}/reject`, { method: "POST" });
        await refresh();
      }
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  priorityEventsEl.addEventListener("click", async (event) => {
    const approveId = event.target.getAttribute("data-approve-pair");
    const rejectId = event.target.getAttribute("data-reject-pair");
    try {
      if (approveId) {
        await api(`/api/admin/pair-requests/${approveId}/approve`, { method: "POST" });
        await refresh();
      } else if (rejectId) {
        await api(`/api/admin/pair-requests/${rejectId}/reject`, { method: "POST" });
        await refresh();
      }
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  panelContent.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      if (event.target.id === "workspace-form") {
        await createWorkspace(event.target.querySelector("#workspace-name").value.trim());
        event.target.reset();
      } else if (event.target.id === "join-workspace-form") {
        await redeemInvite(event.target.querySelector("#join-invite-code").value.trim());
      } else if (event.target.id === "invite-form") {
        const type = event.target.querySelector("#invite-type").value;
        await createInvite(
          type,
          event.target.querySelector("#invite-role")?.value || "viewer",
          Number(event.target.querySelector("#invite-ttl").value || 86400),
          event.target.querySelector("#invite-note").value.trim()
        );
      } else if (event.target.id === "passkey-form") {
        await registerPasskey(event.target.querySelector("#passkey-label").value.trim());
      }
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  panelContent.addEventListener("change", (event) => {
    if (event.target.id === "invite-type") {
      state.inviteType = event.target.value;
      renderOverlay();
    } else if (event.target.id === "panel-session-filter") {
      state.sessionFilter = event.target.value;
      renderOverlay();
    } else if (event.target.id === "context-agent-id") {
      state.selectedAgentId = event.target.value;
      clearSelectedSession();
      render();
    } else if (event.target.id === "context-workspace-id" && event.target.value) {
      switchWorkspace(event.target.value).catch((error) => alert(String(error.message || error)));
    }
  });

  panelContent.addEventListener("click", async (event) => {
    try {
      const sessionContent = event.target.closest(".session-card-content");
      const continueSessionId = event.target.getAttribute("data-continue-session");
      const readSessionId = event.target.getAttribute("data-read-session");
      const deleteSessionId = event.target.getAttribute("data-delete-session");
      const revokeAgentId = event.target.getAttribute("data-revoke-agent");
      const revokePasskeyId = event.target.getAttribute("data-revoke-passkey");
      const revokeInviteId = event.target.getAttribute("data-revoke-invite");
      const recoveryUserId = event.target.getAttribute("data-create-user-recovery");
      const disableUserId = event.target.getAttribute("data-disable-user");
      const enableUserId = event.target.getAttribute("data-enable-user");
      const revokeSessionsUserId = event.target.getAttribute("data-revoke-user-sessions");
      const deleteUserId = event.target.getAttribute("data-delete-user");
      const membershipId = event.target.getAttribute("data-revoke-membership");
      const approvePairId = event.target.getAttribute("data-approve-pair");
      const rejectPairId = event.target.getAttribute("data-reject-pair");
      const openAgentId = event.target.getAttribute("data-open-agent");
      const setLocaleValue = event.target.getAttribute("data-set-locale");
      const wantsClearCache = event.target.hasAttribute("data-clear-cache");

      if (setLocaleValue) {
        setLocale(setLocaleValue);
        renderOverlay();
        return;
      }
      if (sessionContent && state.overlay?.view === "sessions") {
        const sessionId = sessionContent.dataset.sessionId;
        if (state.swipedSessionId === sessionId) {
          state.swipedSessionId = "";
          renderOverlay();
          return;
        }
        if (gesture?.moved) {
          return;
        }
        openPanel("session", { sessionId });
        return;
      }
      if (wantsClearCache) {
        state.taskCache = {};
        state.sessionCache = {};
        clearLegacySensitiveStorage();
        sessionStorage.removeItem(taskCacheKey);
        sessionStorage.removeItem(sessionCacheKey);
        render();
        renderOverlay();
        return;
      }
      if (approvePairId) {
        await api(`/api/admin/pair-requests/${approvePairId}/approve`, { method: "POST" });
        await refresh();
        return;
      }
      if (rejectPairId) {
        await api(`/api/admin/pair-requests/${rejectPairId}/reject`, { method: "POST" });
        await refresh();
        return;
      }
      if (openAgentId) {
        openPanel("agent", { agentId: openAgentId });
        return;
      }

      if (continueSessionId) {
        state.selectedSessionId = continueSessionId;
        state.taskType = "codex_exec";
        state.overlay = null;
        render();
        taskPrompt.focus();
        return;
      }
      if (readSessionId) {
        await submitTask({
          agentId: state.selectedAgentId,
          type: "read_session",
          title: t("loadConversation"),
          sessionId: readSessionId
        });
        renderOverlay();
        return;
      }
      if (deleteSessionId) {
        await handleDeleteSession(deleteSessionId);
        return;
      }
      if (revokeAgentId) {
        if (!confirm(t("revokeAgentConfirm"))) {
          return;
        }
        await revokeAgent(revokeAgentId);
        return;
      }
      if (revokePasskeyId) {
        if (!confirm(t("revokePasskeyConfirm"))) {
          return;
        }
        await revokePasskey(revokePasskeyId);
        return;
      }
      if (revokeInviteId) {
        if (!confirm(t("revokeInviteConfirm"))) {
          return;
        }
        await revokeInvite(revokeInviteId);
        return;
      }
      if (recoveryUserId) {
        await createUserRecoveryCode(recoveryUserId);
        return;
      }
      if (disableUserId) {
        if (!confirm(t("disableUserConfirm"))) {
          return;
        }
        await disableUser(disableUserId);
        return;
      }
      if (enableUserId) {
        if (!confirm(t("enableUserConfirm"))) {
          return;
        }
        await enableUser(enableUserId);
        return;
      }
      if (revokeSessionsUserId) {
        if (!confirm(t("revokeSessionsConfirm"))) {
          return;
        }
        await revokeUserSessions(revokeSessionsUserId);
        return;
      }
      if (deleteUserId) {
        if (!confirm(t("deleteUserConfirm"))) {
          return;
        }
        await deleteUser(deleteUserId);
        return;
      }
      if (membershipId) {
        if (!confirm(t("removeMembershipConfirm"))) {
          return;
        }
        await revokeMembership(membershipId);
      }
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  panelContent.addEventListener("pointerdown", (event) => {
    if (state.overlay?.view === "sessions") {
      startSwipe(event);
    }
  });
  panelContent.addEventListener("pointermove", (event) => {
    if (state.overlay?.view === "sessions") {
      moveSwipe(event);
    }
  });
  panelContent.addEventListener("pointerup", (event) => {
    if (state.overlay?.view === "sessions") {
      endSwipe(event);
    }
  });
  panelContent.addEventListener("pointercancel", (event) => {
    if (state.overlay?.view === "sessions") {
      endSwipe(event);
    }
  });

  sheetContent.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      if (event.target.id === "pair-form") {
        await createPairing(
          event.target.querySelector("#pair-note").value.trim(),
          Number(event.target.querySelector("#pair-ttl").value || 300)
        );
      }
    } catch (error) {
      alert(String(error.message || error));
    }
  });

  sheetContent.addEventListener("click", async (event) => {
    if (event.target.hasAttribute("data-copy-pair-command")) {
      const textarea = sheetContent.querySelector("#pair-command");
      if (!textarea) {
        return;
      }
      try {
        await navigator.clipboard.writeText(textarea.value);
        alert(t("copied"));
      } catch {
        textarea.focus();
        textarea.select();
        alert(t("copyFailed"));
      }
    }
  });

  closePanelButton.addEventListener("click", () => closeOverlay());
  closeSheetButton.addEventListener("click", () => closeOverlay());
  backdrop.addEventListener("click", () => closeOverlay());

  document.addEventListener("focusin", () => {
    updateKeyboardState();
    if (document.body.classList.contains("keyboard-active")) {
      taskForm.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });
  document.addEventListener("focusout", () => {
    setTimeout(updateKeyboardState, 40);
  });
  window.visualViewport?.addEventListener("resize", updateKeyboardState);

  window.addEventListener("popstate", (event) => {
    const route = normalizeRoute(event.state?.route || { tab: state.activeTab, overlay: null });
    applyRoute(route, { fromPop: true });
  });
}

setLocale(state.locale);
applyStaticLocale();
bindGlobalEvents();
showDashboard(false);
syncTaskFields();

refreshAuthStatus()
  .catch(() => {})
  .finally(() => {
    refresh().catch(() => {
      clearAuthenticatedState();
      showDashboard(false);
    });
  });
