const taskCacheKey = "mobileCodexTaskCache.v1";
const sessionCacheKey = "mobileCodexSessionCache.v1";
const localeStorageKey = "mobileCodexLocale";
const cachedTaskFields = ["prompt", "summary", "outputTail", "diffText", "error", "result"];
const state = {
  authenticated: false,
  data: null,
  authStatus: null,
  pollTimer: null,
  taskCache: loadTaskCache(),
  sessionCache: loadSessionCache(),
  selectedSessionId: "",
  activeView: localStorage.getItem("mobileCodexActiveView") || "workspace",
  locale: localStorage.getItem(localeStorageKey) || "en"
};

const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const viewNav = document.querySelector("#view-nav");
const viewTabs = Array.from(document.querySelectorAll("[data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const loginForm = document.querySelector("#login-form");
const inviteLoginForm = document.querySelector("#invite-login-form");
const userRecoveryForm = document.querySelector("#user-recovery-form");
const passkeyForm = document.querySelector("#passkey-form");
const taskForm = document.querySelector("#task-form");
const pairForm = document.querySelector("#pair-form");
const workspaceForm = document.querySelector("#workspace-form");
const joinWorkspaceForm = document.querySelector("#join-workspace-form");
const inviteForm = document.querySelector("#invite-form");
const tasksEl = document.querySelector("#tasks");
const statusLine = document.querySelector("#status-line");
const pairResult = document.querySelector("#pair-result");
const inviteResult = document.querySelector("#invite-result");
const workspaceSelect = document.querySelector("#workspace-id");
const agentSelect = document.querySelector("#agent-id");
const currentUserLine = document.querySelector("#current-user-line");
const taskType = document.querySelector("#task-type");
const actionSelect = document.querySelector("#task-action-id");
const logSelect = document.querySelector("#task-log-source-id");
const logoutButton = document.querySelector("#logout-button");
const clearTaskCacheButton = document.querySelector("#clear-task-cache-button");
const pairCommandBox = document.querySelector("#pair-command-box");
const pairCommand = document.querySelector("#pair-command");
const copyPairCommandButton = document.querySelector("#copy-pair-command");
const pairRequestsEl = document.querySelector("#pair-requests");
const sessionList = document.querySelector("#session-list");
const resumeSessionBanner = document.querySelector("#resume-session-banner");
const resumeSessionLabel = document.querySelector("#resume-session-label");
const clearSessionSelectionButton = document.querySelector("#clear-session-selection");
const promptLabel = document.querySelector("#codex-prompt-row span");
const passkeyLoginButton = document.querySelector("#passkey-login-button");
const passkeyLoginBox = document.querySelector("#passkey-login-box");
const passkeyLoginHint = document.querySelector("#passkey-login-hint");
const recoveryLoginBox = document.querySelector("#recovery-login-box");
const authStatusLine = document.querySelector("#auth-status-line");
const passkeyList = document.querySelector("#passkey-list");
const passkeyLabelInput = document.querySelector("#passkey-label");
const memberList = document.querySelector("#member-list");
const inviteList = document.querySelector("#invite-list");
const inviteTypeSelect = document.querySelector("#invite-type");
const inviteRoleSelect = document.querySelector("#invite-role");
const userRecoveryCodeInput = document.querySelector("#user-recovery-code");
const usersEl = document.querySelector("#user-list");
const userAdminResult = document.querySelector("#user-admin-result");
const langEnButton = document.querySelector("#lang-en");
const langZhButton = document.querySelector("#lang-zh");

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
    userRecoverySummary: "Use A User Recovery Code",
    userRecoveryCode: "Recovery Code",
    continueWithRecoveryCode: "Continue With Recovery Code",
    userRecoveryHint: "If your invite was already used but you lost the session before adding a passkey, ask the relay owner for a user recovery code.",
    displayName: "Display Name",
    joinWithInvite: "Join With Invite",
    inviteLoginHint: "An account invite creates your own user without joining someone else's workspace. A workspace invite lets you collaborate inside the current workspace.",
    controlPlane: "Control Plane",
    currentWorkspace: "Current Workspace",
    connecting: "Connecting…",
    workspace: "Workspace",
    agent: "Agent",
    signedOut: "Signed out.",
    refresh: "Refresh",
    clearCache: "Clear Cache",
    logout: "Logout",
    tabWorkspace: "Workspace",
    tabSessions: "Sessions",
    tabAgents: "Agents",
    tabSecurity: "Security",
    composeEyebrow: "Compose",
    newTask: "New Task",
    continuingSession: "Continuing Session",
    useNewSession: "Use New Session",
    taskType: "Type",
    taskTypeCodex: "Codex Task",
    taskTypeAction: "Run Action",
    taskTypeLog: "Read Log",
    prompt: "Prompt",
    continuePrompt: "Continue Prompt",
    promptPlaceholder: "Describe the coding task you want Codex to perform.",
    relativeCwd: "Relative CWD",
    allowWrites: "Allow Workspace Writes",
    action: "Action",
    logSource: "Log Source",
    submitTask: "Submit Task",
    historyEyebrow: "History",
    recentTasks: "Recent Tasks",
    sessionEyebrow: "Session Control",
    codexSessions: "Codex Sessions",
    sessionsHint: "Recent sessions from the selected agent. Previews stay on your phone and in relay memory only.",
    provisioningEyebrow: "Provisioning",
    pairAgent: "Pair Agent",
    note: "Note",
    pairNotePlaceholder: "Server or environment name",
    ttlSeconds: "TTL Seconds",
    createShortPairCode: "Create Short Pair Code",
    suggestedPairCommand: "Suggested Pair Command",
    copyPairCommand: "Copy Pair Command",
    approvalsEyebrow: "Approvals",
    pendingDevices: "Pending Devices",
    accessEyebrow: "Access",
    security: "Security",
    checkingPasskey: "Checking passkey status…",
    newPasskeyLabel: "New Passkey Label",
    passkeyLabelPlaceholder: "My iPhone",
    addPasskey: "Add This Device As A Passkey",
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
    inviteType: "Invite Type",
    accountInvite: "Account Invite",
    workspaceInvite: "Workspace Invite",
    inviteTypeSummary: "Account invites create a standalone user. Workspace invites add someone to the current workspace.",
    role: "Role",
    viewer: "Viewer",
    operator: "Operator",
    owner: "Owner",
    inviteNotePlaceholder: "Who this invite is for",
    createInvite: "Create Invite",
    createAccountInvite: "Create Account Invite",
    createWorkspaceInvite: "Create Workspace Invite",
    inviteTypeSummaryAccount: "Account invites create a standalone user. They can create their own workspace after registering a passkey.",
    inviteTypeSummaryWorkspace: "Workspace invites add someone to the current workspace with the selected role.",
    noTasks: "No tasks yet.",
    noPendingDevices: "No pending devices waiting for approval.",
    noSessions: "No Codex sessions found for this workspace yet.",
    noPasskeys: "No passkeys registered yet. Add this device before you log out.",
    noMembers: "No members yet.",
    noUsers: "No relay users found.",
    noMemberships: "No workspace memberships.",
    ownersManageMembers: "Workspace owners can manage members and invites here.",
    noInvites: "No active invites for this workspace.",
    copied: "Copied",
    copyFailed: "Copy failed. The command has been selected for manual copy.",
    shortPairCodeLabel: "Short pair code",
    expiresLabel: "Expires",
    pairResultHint: "This code is single-use and still requires phone approval.",
    inviteResultAccount: "Type: Account Invite\nThis creates a standalone user account.",
    inviteResultWorkspace: "Type: Workspace Invite",
    inviteResultRole: "Role",
    inviteResultWorkspaceLabel: "Workspace",
    noWorkspace: "No workspace",
    noRole: "no role",
    passkeyEnrollRequired: "Register a passkey on this device before running tasks or pairing agents.",
    passkeysUnavailable: "Passkeys are unavailable here. Check HTTPS/publicOrigin and passkey configuration.",
    passkeysSummary: "{count} passkey(s) on this account. Recovery token remains available only for the relay owner.",
    passkeyNoBrowser: "This browser cannot use passkeys here. Use Safari/Chrome on a secure origin, or fall back to the recovery token.",
    passkeyNoRegistered: "No passkeys registered yet.",
    statusSummary: "{workspace} · {agents} agent(s), {tasks} recent task(s)",
    usedDate: "Used {date}",
    neverUsed: "Never used",
    createdAt: "Created {date}",
    revoke: "Revoke",
    workspaceLabel: "Workspace: {workspace}",
    sessionLabel: "Session: {session}",
    targetSessionLabel: "Target Session: {session}",
    actionLabel: "Action: {action}",
    logLabel: "Log: {log}",
    accountInviteCardHint: "Creates a standalone user account. The user can create their own workspace after registering a passkey.",
    accountInviteCardTitle: "Account Invite",
    workspaceInviteCardTitle: "{role} Invite",
    approve: "Approve",
    approveDevice: "Approve Device",
    reject: "Reject",
    continueHere: "Continue Here",
    selected: "Selected",
    delete: "Delete",
    pendingDevice: "Pending Device",
    unknownHost: "unknown host",
    noPreview: "No preview available yet.",
    passkeyDefault: "Passkey",
    transportsLabel: "Transports: {transports}",
    userDefault: "User",
    currentUserSummary: "{user} · {role} · {workspace}",
    inviteCodeLabel: "Invite code",
    thisDevice: "This Device",
    codexSessionDefault: "Codex Session",
    relayOwnerBadge: "Relay Owner",
    disabledUser: "Disabled",
    activeUser: "Active",
    passkeySetupPending: "Passkey Setup Pending",
    passkeysCountLabel: "{count} passkey(s)",
    sessionsCountLabel: "{count} active session(s)",
    lastWorkspaceLabel: "Last workspace: {workspace}",
    membershipSummary: "{workspace} · {role}",
    removeMember: "Remove",
    revokeSessions: "Revoke Sessions",
    disableUser: "Disable User",
    enableUser: "Enable User",
    createRecoveryCode: "Create Recovery Code",
    deleteUser: "Delete User",
    activeRecoveryUntil: "Active recovery code until {expires}",
    recoveryCodeIssued: "Recovery code for {user}",
    recoveryCodeUseHint: "Ask the user to open the relay and use the recovery code once, then register a passkey immediately.",
    disableUserConfirm: "Disable this user and revoke all active sessions?",
    enableUserConfirm: "Re-enable this user?",
    revokeSessionsConfirm: "Revoke all active sessions for this user?",
    removeMembershipConfirm: "Remove this user from the workspace?",
    deleteUserConfirm: "Delete this user permanently? This only works for users with no memberships and no passkeys.",
    operatorsContinueDelete: "Workspace operators can continue or delete sessions.",
    operatorsApprovePair: "Workspace operators can approve or reject this device.",
    deleteSessionConfirm: "Delete this Codex session from the agent?\n\n{label}\n\nThis cannot be undone.",
    revokePasskeyConfirm: "Revoke this passkey?",
    revokeInviteConfirm: "Revoke this invite?"
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
    userRecoverySummary: "使用用户恢复码",
    userRecoveryCode: "恢复码",
    continueWithRecoveryCode: "使用恢复码继续",
    userRecoveryHint: "如果邀请码已经用过，但用户还没绑定 passkey 就丢失了会话，请向 relay owner 申请一个用户恢复码。",
    displayName: "显示名称",
    joinWithInvite: "使用邀请码加入",
    inviteLoginHint: "账号邀请只会创建你自己的用户，不会自动加入别人的 workspace。工作区邀请才会把你加入当前 workspace 进行协作。",
    controlPlane: "控制平面",
    currentWorkspace: "当前工作区",
    connecting: "连接中…",
    workspace: "工作区",
    agent: "Agent",
    signedOut: "未登录。",
    refresh: "刷新",
    clearCache: "清空缓存",
    logout: "退出登录",
    tabWorkspace: "工作区",
    tabSessions: "会话",
    tabAgents: "Agent",
    tabSecurity: "安全",
    composeEyebrow: "提交",
    newTask: "新任务",
    continuingSession: "继续当前会话",
    useNewSession: "改用新会话",
    taskType: "任务类型",
    taskTypeCodex: "Codex 任务",
    taskTypeAction: "执行动作",
    taskTypeLog: "读取日志",
    prompt: "提示词",
    continuePrompt: "继续提示词",
    promptPlaceholder: "描述你希望 Codex 执行的编码任务。",
    relativeCwd: "相对工作目录",
    allowWrites: "允许写入工作区",
    action: "动作",
    logSource: "日志源",
    submitTask: "提交任务",
    historyEyebrow: "历史",
    recentTasks: "最近任务",
    sessionEyebrow: "会话控制",
    codexSessions: "Codex 会话",
    sessionsHint: "显示当前所选 agent 的最近会话。预览只保留在你的手机和 relay 内存中。",
    provisioningEyebrow: "配对",
    pairAgent: "配对 Agent",
    note: "备注",
    pairNotePlaceholder: "服务器名或环境名",
    ttlSeconds: "有效期（秒）",
    createShortPairCode: "生成短配对码",
    suggestedPairCommand: "建议执行的配对命令",
    copyPairCommand: "复制配对命令",
    approvalsEyebrow: "审批",
    pendingDevices: "待批准设备",
    accessEyebrow: "访问控制",
    security: "安全",
    checkingPasskey: "正在检查 Passkey 状态…",
    newPasskeyLabel: "新 Passkey 标签",
    passkeyLabelPlaceholder: "我的 iPhone",
    addPasskey: "把当前设备注册为 Passkey",
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
    inviteType: "邀请类型",
    accountInvite: "账号邀请",
    workspaceInvite: "工作区邀请",
    inviteTypeSummary: "账号邀请只创建独立用户。工作区邀请会把对方加入当前 workspace。",
    role: "角色",
    viewer: "查看者",
    operator: "操作员",
    owner: "所有者",
    inviteNotePlaceholder: "给这次邀请写个备注",
    createInvite: "创建邀请",
    createAccountInvite: "创建账号邀请",
    createWorkspaceInvite: "创建工作区邀请",
    inviteTypeSummaryAccount: "账号邀请只创建独立用户。对方注册 passkey 后可以自己创建 workspace。",
    inviteTypeSummaryWorkspace: "工作区邀请会把对方加入当前 workspace，并使用所选角色。",
    noTasks: "还没有任务。",
    noPendingDevices: "当前没有待批准设备。",
    noSessions: "当前工作区下还没有可显示的 Codex 会话。",
    noPasskeys: "当前账号还没有注册 passkey。建议先为这台设备补绑一个。",
    noMembers: "还没有成员。",
    noUsers: "当前没有可管理的 relay 用户。",
    noMemberships: "当前没有工作区成员关系。",
    ownersManageMembers: "只有工作区 owner 才能在这里管理成员和邀请。",
    noInvites: "当前工作区没有有效邀请。",
    copied: "已复制",
    copyFailed: "复制失败，已自动选中内容，请手动复制。",
    shortPairCodeLabel: "短配对码",
    expiresLabel: "过期时间",
    pairResultHint: "该配对码一次性有效，且仍然需要手机端批准。",
    inviteResultAccount: "类型：账号邀请\n这会创建一个独立用户账号。",
    inviteResultWorkspace: "类型：工作区邀请",
    inviteResultRole: "角色",
    inviteResultWorkspaceLabel: "工作区",
    noWorkspace: "未选择工作区",
    noRole: "无角色",
    passkeyEnrollRequired: "请先在这台设备上注册 passkey，再执行任务或批准配对。",
    passkeysUnavailable: "当前环境无法使用 passkey，请检查 HTTPS/publicOrigin 和 passkey 配置。",
    passkeysSummary: "当前账号已有 {count} 个 passkey。Bootstrap Token 仅保留给 relay owner 作为恢复入口。",
    passkeyNoBrowser: "当前浏览器无法在这里使用 passkey。请使用安全来源下的 Safari/Chrome，或暂时改用恢复口令。",
    passkeyNoRegistered: "当前还没有可用的 passkey。",
    statusSummary: "{workspace} · {agents} 个 agent，{tasks} 个最近任务",
    usedDate: "最近使用：{date}",
    neverUsed: "从未使用",
    createdAt: "创建于 {date}",
    revoke: "撤销",
    workspaceLabel: "工作区：{workspace}",
    sessionLabel: "会话：{session}",
    targetSessionLabel: "目标会话：{session}",
    actionLabel: "动作：{action}",
    logLabel: "日志：{log}",
    accountInviteCardHint: "这会创建一个独立用户。对方注册 passkey 后可以自己创建 workspace。",
    accountInviteCardTitle: "账号邀请",
    workspaceInviteCardTitle: "{role} 邀请",
    approve: "批准",
    approveDevice: "批准设备",
    reject: "拒绝",
    continueHere: "在这里继续",
    selected: "已选择",
    delete: "删除",
    pendingDevice: "待批准设备",
    unknownHost: "未知主机",
    noPreview: "当前还没有可显示的预览。",
    passkeyDefault: "Passkey",
    transportsLabel: "传输方式：{transports}",
    userDefault: "用户",
    currentUserSummary: "{user} · {role} · {workspace}",
    inviteCodeLabel: "邀请码",
    thisDevice: "当前设备",
    codexSessionDefault: "Codex 会话",
    relayOwnerBadge: "Relay Owner",
    disabledUser: "已禁用",
    activeUser: "正常",
    passkeySetupPending: "等待绑定 Passkey",
    passkeysCountLabel: "{count} 个 passkey",
    sessionsCountLabel: "{count} 个活动会话",
    lastWorkspaceLabel: "最近工作区：{workspace}",
    membershipSummary: "{workspace} · {role}",
    removeMember: "移除成员",
    revokeSessions: "注销会话",
    disableUser: "禁用用户",
    enableUser: "恢复用户",
    createRecoveryCode: "生成恢复码",
    deleteUser: "删除用户",
    activeRecoveryUntil: "恢复码有效至 {expires}",
    recoveryCodeIssued: "{user} 的恢复码",
    recoveryCodeUseHint: "让用户打开 relay，使用该恢复码登录一次，然后立刻补绑 passkey。",
    disableUserConfirm: "要禁用这个用户并撤销其所有活动会话吗？",
    enableUserConfirm: "要恢复这个用户吗？",
    revokeSessionsConfirm: "要撤销这个用户的所有活动会话吗？",
    removeMembershipConfirm: "要把这个用户移出该工作区吗？",
    deleteUserConfirm: "要永久删除这个用户吗？只有没有成员关系且没有 passkey 的用户才能删除。",
    operatorsContinueDelete: "只有 workspace 的 operator 或 owner 才能继续或删除会话。",
    operatorsApprovePair: "只有 workspace 的 operator 或 owner 才能批准或拒绝这台设备。",
    deleteSessionConfirm: "要从 agent 上删除这个 Codex 会话吗？\n\n{label}\n\n该操作无法撤销。",
    revokePasskeyConfirm: "要撤销这个 passkey 吗？",
    revokeInviteConfirm: "要撤销这个邀请吗？"
  }
};

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

function loadTaskCache() {
  try {
    return JSON.parse(localStorage.getItem(taskCacheKey) || "{}");
  } catch {
    return {};
  }
}

function loadSessionCache() {
  try {
    return JSON.parse(localStorage.getItem(sessionCacheKey) || "{}");
  } catch {
    return {};
  }
}

function persistTaskCache() {
  const entries = Object.entries(state.taskCache)
    .sort((left, right) => String(right[1]?.cachedAt || "").localeCompare(String(left[1]?.cachedAt || "")))
    .slice(0, 100);
  state.taskCache = Object.fromEntries(entries);
  localStorage.setItem(taskCacheKey, JSON.stringify(state.taskCache));
}

function persistSessionCache() {
  const entries = Object.entries(state.sessionCache)
    .sort((left, right) => String(right[1]?.cachedAt || "").localeCompare(String(left[1]?.cachedAt || "")))
    .slice(0, 30);
  state.sessionCache = Object.fromEntries(entries);
  localStorage.setItem(sessionCacheKey, JSON.stringify(state.sessionCache));
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
  if (role === "owner" || role === "operator" || role === "viewer") {
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

function setLocale(locale) {
  state.locale = locale === "zh" ? "zh" : "en";
  localStorage.setItem(localeStorageKey, state.locale);
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  document.title = t("appTitle");
  langEnButton?.classList.toggle("active", state.locale === "en");
  langZhButton?.classList.toggle("active", state.locale === "zh");
  applyStaticLocale();
  if (state.data) {
    renderState(state.data);
  } else {
    renderAuthStatus(state.authStatus);
  }
}

function applyStaticLocale() {
  const bindings = [
    [".hero .eyebrow", "heroEyebrow"],
    [".hero h1", "appTitle"],
    [".hero .subhead", "heroSubhead"],
    ["#login-panel .eyebrow", "signInEyebrow"],
    ["#login-panel h2", "signInTitle"],
    ["#login-panel > .auth-card > .hint", "signInHint"],
    ["#passkey-login-button", "passkeyLogin"],
    ["#recovery-login-box summary", "recoverySummary"],
    ["#login-form label span", "bootstrapToken"],
    ["#login-form button", "unlockRecovery"],
    ["#login-form + .hint", "recoveryHint"],
    ["#invite-login-box summary", "inviteSummary"],
    ["#invite-login-form label span", "inviteCode"],
    ["#invite-login-form label + label span", "displayName"],
    ["#invite-login-form button", "joinWithInvite"],
    ["#invite-login-form + .hint", "inviteLoginHint"],
    ["#user-recovery-box summary", "userRecoverySummary"],
    ["#user-recovery-form label span", "userRecoveryCode"],
    ["#user-recovery-form button", "continueWithRecoveryCode"],
    ["#user-recovery-form + .hint", "userRecoveryHint"],
    [".masthead-card .eyebrow", "controlPlane"],
    [".masthead-card h2", "currentWorkspace"],
    ["#status-line", "connecting"],
    [".utility-card label span", "workspace"],
    [".utility-card label + label span", "agent"],
    ["#refresh-button", "refresh"],
    ["#clear-task-cache-button", "clearCache"],
    ["#logout-button", "logout"],
    ['[data-view-target="workspace"]', "tabWorkspace"],
    ['[data-view-target="sessions"]', "tabSessions"],
    ['[data-view-target="agents"]', "tabAgents"],
    ['[data-view-target="security"]', "tabSecurity"],
    ['[data-view-panel="workspace"] .section-head .eyebrow', "composeEyebrow"],
    ['[data-view-panel="workspace"] .section-head h3', "newTask"],
    ["#resume-session-banner strong", "continuingSession"],
    ["#clear-session-selection", "useNewSession"],
    ['#task-form label span', "taskType"],
    ['#codex-prompt-row span', "prompt"],
    ['#cwd-row span', "relativeCwd"],
    ['#write-row span', "allowWrites"],
    ['#action-row span', "action"],
    ['#log-row span', "logSource"],
    ['#task-form button[type="submit"]', "submitTask"],
    ['[data-view-panel="workspace"] .section-panel + .section-panel .section-head .eyebrow', "historyEyebrow"],
    ['[data-view-panel="workspace"] .section-panel + .section-panel .section-head h3', "recentTasks"],
    ['[data-view-panel="sessions"] .section-head .eyebrow', "sessionEyebrow"],
    ['[data-view-panel="sessions"] .section-head h3', "codexSessions"],
    ['[data-view-panel="sessions"] .section-head .hint', "sessionsHint"],
    ['[data-view-panel="agents"] .section-panel .section-head .eyebrow', "provisioningEyebrow"],
    ['[data-view-panel="agents"] .section-panel .section-head h3', "pairAgent"],
    ['#pair-form label span', "note"],
    ['#pair-form label + label span', "ttlSeconds"],
    ['#pair-form button[type="submit"]', "createShortPairCode"],
    ['#pair-command-box label span', "suggestedPairCommand"],
    ["#copy-pair-command", "copyPairCommand"],
    ['[data-view-panel="agents"] .section-panel + .section-panel .section-head .eyebrow', "approvalsEyebrow"],
    ['[data-view-panel="agents"] .section-panel + .section-panel .section-head h3', "pendingDevices"],
    ['[data-view-panel="security"] .section-panel .section-head .eyebrow', "accessEyebrow"],
    ['[data-view-panel="security"] .section-panel .section-head h3', "security"],
    ["#auth-status-line", "checkingPasskey"],
    ['#passkey-form label span', "newPasskeyLabel"],
    ["#passkey-register-button", "addPasskey"],
    ['[data-view-panel="security"] .section-panel:nth-of-type(2) .section-head .eyebrow', "workspaceSetupEyebrow"],
    ['[data-view-panel="security"] .section-panel:nth-of-type(2) .section-head h3', "spaces"],
    ['#workspace-form label span', "createWorkspace"],
    ["#workspace-create-button", "createWorkspace"],
    ['#join-workspace-form label span', "joinWorkspaceWithInvite"],
    ["#join-workspace-button", "joinWorkspaceButton"],
    ["#join-workspace-hint", "joinWorkspaceHint"],
    ['[data-view-panel="security"] .section-panel:nth-of-type(3) .section-head .eyebrow', "membersEyebrow"],
    ['[data-view-panel="security"] .section-panel:nth-of-type(3) .section-head h3', "peopleAndInvites"],
    ['#invite-form label span', "inviteType"],
    ['#invite-form label:nth-of-type(2) span', "role"],
    ['#invite-form label:nth-of-type(3) span', "note"],
    ['#invite-form label:nth-of-type(4) span', "ttlSeconds"],
    ["#invite-type-summary", "inviteTypeSummary"],
    ["#invite-create-button", "createInvite"],
    ['#relay-users-panel .section-head .eyebrow', "relayUsersEyebrow"],
    ['#relay-users-panel .section-head h3', "relayUsers"],
    ["#relay-users-hint", "relayUsersHint"]
  ];

  for (const [selector, key] of bindings) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = t(key);
    }
  }

  const multiBindings = [
    ["#task-type option[value='codex_exec']", "taskTypeCodex"],
    ["#task-type option[value='run_action']", "taskTypeAction"],
    ["#task-type option[value='read_log']", "taskTypeLog"],
    ["#invite-type option[value='account']", "accountInvite"],
    ["#invite-type option[value='workspace']", "workspaceInvite"],
    ["#invite-role option[value='viewer']", "viewer"],
    ["#invite-role option[value='operator']", "operator"],
    ["#invite-role option[value='owner']", "owner"]
  ];
  for (const [selector, key] of multiBindings) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = t(key);
    }
  }

  const placeholders = [
    ["#invite-code", "inviteCode"],
    ["#user-recovery-code", "userRecoveryCode"],
    ["#invite-display-name", "displayName"],
    ["#task-prompt", "promptPlaceholder"],
    ["#pair-note", "pairNotePlaceholder"],
    ["#passkey-label", "passkeyLabelPlaceholder"],
    ["#workspace-name", "workspaceNamePlaceholder"],
    ["#join-invite-code", "inviteCode"],
    ["#invite-note", "inviteNotePlaceholder"]
  ];
  for (const [selector, key] of placeholders) {
    const element = document.querySelector(selector);
    if (element) {
      element.placeholder = t(key);
    }
  }
  syncInviteFields();
}

function setActiveView(viewName) {
  const nextView = viewPanels.some((panel) => panel.dataset.viewPanel === viewName) ? viewName : "workspace";
  state.activeView = nextView;
  localStorage.setItem("mobileCodexActiveView", nextView);
  for (const tab of viewTabs) {
    tab.classList.toggle("active", tab.dataset.viewTarget === nextView);
  }
  for (const panel of viewPanels) {
    panel.classList.toggle("active", panel.dataset.viewPanel === nextView);
  }
}

function webauthnAvailable() {
  return typeof window.PublicKeyCredential !== "undefined" && !!navigator.credentials && window.isSecureContext;
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
        sessions: agent.codexSessions.slice(0, 20)
      };
    }
  }
  persistSessionCache();
}

function getCurrentAuth() {
  return state.data?.auth || state.authStatus || null;
}

function currentPermissions() {
  return getCurrentAuth()?.permissions || {};
}

function findSelectedAgent() {
  return (state.data?.agents || []).find((agent) => agent.agentId === agentSelect.value) || null;
}

function findSelectedSession(agent = findSelectedAgent()) {
  if (!agent || !state.selectedSessionId) {
    return null;
  }
  return (agent.codexSessions || []).find((session) => session.sessionId === state.selectedSessionId) || null;
}

function clearSelectedSession() {
  state.selectedSessionId = "";
  syncTaskFields();
}

function authNeedsPasskeyEnrollment() {
  return !!getCurrentAuth()?.needsPasskeyEnrollment;
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
  return `'${String(value).replaceAll("'", `'\"'\"'`)}'`;
}

function buildPairCommand(pairingCode) {
  const configPathHint = state.data?.web?.pairCommandConfigPathHint || "config/agent.local.json";
  return `npm run agent:pair -- --config ${shellEscape(configPathHint)} --pair-code ${shellEscape(pairingCode)}`;
}

function showDashboard(visible) {
  loginPanel.classList.toggle("hidden", visible);
  dashboard.classList.toggle("hidden", !visible);
  if (visible) {
    setActiveView(state.activeView);
  }
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

function taskCard(task) {
  const permissions = currentPermissions();
  const needsDecision = task.status === "awaiting_approval" && permissions.approveTasks;
  const output = task.outputTail ? `<pre>${escapeHtml(task.outputTail)}</pre>` : "";
  const diff = task.diffText ? `<details><summary>Diff</summary><pre>${escapeHtml(task.diffText)}</pre></details>` : "";
  const error = task.error ? `<p class="error">${escapeHtml(task.error)}</p>` : "";
  return `
    <article class="task-card">
      <header>
        <div>
          <strong>${escapeHtml(task.title || task.type)}</strong>
          <p>${escapeHtml(task.agentId)} · ${escapeHtml(task.status)}</p>
        </div>
        <div class="task-meta">${escapeHtml(formatDateTime(task.updatedAt))}</div>
      </header>
      ${task.prompt ? `<p class="task-body">${escapeHtml(task.prompt)}</p>` : ""}
      ${task.resumeSessionId ? `<p class="task-body">${escapeHtml(t("sessionLabel", { session: task.resumeSessionId }))}</p>` : ""}
      ${task.sessionId ? `<p class="task-body">${escapeHtml(t("targetSessionLabel", { session: task.sessionId }))}</p>` : ""}
      ${task.actionId ? `<p class="task-body">${escapeHtml(t("actionLabel", { action: task.actionId }))}</p>` : ""}
      ${task.logSourceId ? `<p class="task-body">${escapeHtml(t("logLabel", { log: task.logSourceId }))}</p>` : ""}
      ${task.summary ? `<p class="task-summary">${escapeHtml(task.summary)}</p>` : ""}
      ${error}
      ${output}
      ${diff}
      ${
        needsDecision
          ? `<div class="actions">
               <button data-approve="${task.taskId}" type="button">${escapeHtml(t("approve"))}</button>
               <button data-reject="${task.taskId}" type="button" class="secondary">${escapeHtml(t("reject"))}</button>
             </div>`
          : ""
      }
    </article>
  `;
}

function pairRequestCard(request) {
  const canApprove = currentPermissions().pairAgents;
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(request.label || request.agentId || t("pendingDevice"))}</strong>
          <p>${escapeHtml(request.agentId)} · ${escapeHtml(request.hostname || t("unknownHost"))}</p>
        </div>
        <div class="task-meta">${escapeHtml(formatDateTime(request.createdAt))}</div>
      </header>
      ${request.note ? `<p class="task-body">${escapeHtml(request.note)}</p>` : ""}
      ${request.workspaceRootName ? `<p class="task-summary">${escapeHtml(t("workspaceLabel", { workspace: request.workspaceRootName }))}</p>` : ""}
      ${
        canApprove
          ? `<div class="actions">
               <button type="button" data-approve-pair="${request.requestId}">${escapeHtml(t("approveDevice"))}</button>
               <button type="button" class="secondary" data-reject-pair="${request.requestId}">${escapeHtml(t("reject"))}</button>
             </div>`
          : `<p class='hint'>${escapeHtml(t("operatorsApprovePair"))}</p>`
      }
    </article>
  `;
}

function sessionCard(session, selected) {
  const preview = (session.preview || [])
    .map(
      (item) =>
        `<p class="session-preview ${item.role === "assistant" ? "assistant" : "user"}"><strong>${escapeHtml(formatPreviewRole(item.role))}</strong> ${escapeHtml(item.text)}</p>`
    )
    .join("");
  const canContinue = currentPermissions().createTasks;
  return `
    <article class="session-card ${selected ? "selected" : ""}">
      <header>
        <div>
          <strong>${escapeHtml(session.title || t("codexSessionDefault"))}</strong>
          <p>${escapeHtml(session.sessionId)} · ${escapeHtml(session.cwd || ".")}</p>
        </div>
        <div class="task-meta">${escapeHtml(formatDateTime(session.updatedAt))}</div>
      </header>
      ${session.firstUserMessage ? `<p class="task-body">${escapeHtml(session.firstUserMessage)}</p>` : ""}
      ${preview || `<p class='hint'>${escapeHtml(t("noPreview"))}</p>`}
      ${
        canContinue
          ? `<div class="actions">
               <button type="button" data-use-session="${escapeHtml(session.sessionId)}">${escapeHtml(selected ? t("selected") : t("continueHere"))}</button>
               <button type="button" class="secondary" data-delete-session="${escapeHtml(session.sessionId)}">${escapeHtml(t("delete"))}</button>
             </div>`
          : `<p class='hint'>${escapeHtml(t("operatorsContinueDelete"))}</p>`
      }
    </article>
  `;
}

function passkeyCard(passkey) {
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(passkey.label || t("passkeyDefault"))}</strong>
          <p>${escapeHtml(passkey.displayId || passkey.passkeyId || "")}</p>
        </div>
        <div class="task-meta">${escapeHtml(passkey.lastUsedAt ? t("usedDate", { date: formatDate(passkey.lastUsedAt) }) : t("neverUsed"))}</div>
      </header>
      <p class="task-body">${escapeHtml(t("createdAt", { date: formatDateTime(passkey.createdAt) }))}</p>
      ${
        (passkey.transports || []).length
          ? `<p class="task-summary">${escapeHtml(t("transportsLabel", { transports: passkey.transports.join(", ") }))}</p>`
          : ""
      }
      <div class="actions">
        <button type="button" class="secondary" data-revoke-passkey="${encodeURIComponent(passkey.passkeyId)}">${escapeHtml(t("revoke"))}</button>
      </div>
    </article>
  `;
}

function memberCard(member) {
  const canRemove = currentPermissions().manageMembers || currentPermissions().manageRelayUsers;
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(member.displayName)}</strong>
          <p>${escapeHtml(formatRoleLabel(member.role))}</p>
        </div>
        <div class="task-meta">${escapeHtml(formatDate(member.createdAt))}</div>
      </header>
      ${
        canRemove
          ? `<div class="actions">
               <button type="button" class="secondary" data-revoke-membership="${member.membershipId}">${escapeHtml(t("removeMember"))}</button>
             </div>`
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
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(invitation.createdByDisplayName || t("owner"))}</p>
        </div>
        <div class="task-meta">${escapeHtml(t("expiresLabel"))} ${escapeHtml(formatDateTime(invitation.expiresAt))}</div>
      </header>
      <p class="task-summary">${escapeHtml(summary)}</p>
      ${invitation.note ? `<p class="task-body">${escapeHtml(invitation.note)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-revoke-invite="${invitation.inviteId}">${escapeHtml(t("revoke"))}</button>
      </div>
    </article>
  `;
}

function userCard(user) {
  const statusBadges = [];
  if (user.isRelayOwner) {
    statusBadges.push(t("relayOwnerBadge"));
  }
  if (user.disabledAt) {
    statusBadges.push(t("disabledUser"));
  } else if (user.passkeyCount === 0) {
    statusBadges.push(t("passkeySetupPending"));
  } else {
    statusBadges.push(t("activeUser"));
  }
  const memberships = Array.isArray(user.memberships) ? user.memberships : [];
  const membershipsHtml = memberships.length
    ? memberships
        .map(
          (membership) => `
            <div class="membership-row">
              <span>${escapeHtml(t("membershipSummary", { workspace: membership.name, role: formatRoleLabel(membership.role) }))}</span>
              <button type="button" class="secondary" data-revoke-membership="${membership.membershipId}">${escapeHtml(t("removeMember"))}</button>
            </div>
          `
        )
        .join("")
    : `<p class="hint">${escapeHtml(t("noMemberships"))}</p>`;
  const lastWorkspace = user.lastWorkspaceName ? `<p class="task-summary">${escapeHtml(t("lastWorkspaceLabel", { workspace: user.lastWorkspaceName }))}</p>` : "";
  const activeRecovery = user.activeRecovery
    ? `<p class="task-summary">${escapeHtml(t("activeRecoveryUntil", { expires: formatDateTime(user.activeRecovery.expiresAt) }))}</p>`
    : "";
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(user.displayName)}</strong>
          <p>${escapeHtml(user.userId)}</p>
        </div>
        <div class="task-meta">${escapeHtml(formatDate(user.createdAt))}</div>
      </header>
      <p class="task-summary">${escapeHtml(statusBadges.join(" · "))}</p>
      <p class="task-summary">${escapeHtml(t("passkeysCountLabel", { count: user.passkeyCount }))} · ${escapeHtml(t("sessionsCountLabel", { count: user.activeSessionCount }))}</p>
      ${lastWorkspace}
      ${activeRecovery}
      <div class="membership-list">${membershipsHtml}</div>
      <div class="actions">
        ${user.disabledAt ? `<button type="button" data-enable-user="${user.userId}">${escapeHtml(t("enableUser"))}</button>` : `<button type="button" data-create-user-recovery="${user.userId}">${escapeHtml(t("createRecoveryCode"))}</button>`}
        <button type="button" class="secondary" data-revoke-user-sessions="${user.userId}">${escapeHtml(t("revokeSessions"))}</button>
        ${user.disabledAt || user.isRelayOwner ? "" : `<button type="button" class="secondary" data-disable-user="${user.userId}">${escapeHtml(t("disableUser"))}</button>`}
        ${!user.isRelayOwner && user.passkeyCount === 0 && memberships.length === 0 ? `<button type="button" class="secondary" data-delete-user="${user.userId}">${escapeHtml(t("deleteUser"))}</button>` : ""}
      </div>
    </article>
  `;
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

function renderSessionList(agent) {
  const sessions = agent?.codexSessions || [];
  const selectedSession = findSelectedSession(agent);
  resumeSessionBanner.classList.toggle("hidden", !selectedSession);
  resumeSessionLabel.textContent = selectedSession
    ? `${selectedSession.title} · ${selectedSession.sessionId} · ${selectedSession.cwd || "."}`
    : "";
  sessionList.innerHTML = sessions.length
    ? sessions.map((session) => sessionCard(session, session.sessionId === state.selectedSessionId)).join("")
    : `<p class='hint'>${escapeHtml(t("noSessions"))}</p>`;
}

function renderAuthStatus(auth) {
  state.authStatus = auth || null;
  const passkeysEnabled = !!auth?.passkeysEnabled;
  const hasPasskeys = !!auth?.hasPasskeys;
  const supported = webauthnAvailable();

  passkeyLoginBox.classList.toggle("hidden", !passkeysEnabled || !hasPasskeys);
  passkeyLoginButton.disabled = !supported;
  recoveryLoginBox.open = !passkeysEnabled || !hasPasskeys;
  passkeyLoginHint.textContent = !supported
    ? t("passkeyNoBrowser")
    : hasPasskeys
      ? t("passkeyLoginDefaultHint")
      : t("passkeyNoRegistered");

  if (!state.authenticated || !auth) {
    currentUserLine.textContent = t("signedOut");
    return;
  }

  const workspaceLabel = auth.workspaces?.find((workspace) => workspace.workspaceId === auth.currentWorkspaceId)?.name || t("noWorkspace");
  currentUserLine.textContent = t("currentUserSummary", {
    user: auth.currentUser?.displayName || t("userDefault"),
    role: auth.currentRole ? formatRoleLabel(auth.currentRole) : t("noRole"),
    workspace: workspaceLabel
  });
  if (auth.needsPasskeyEnrollment) {
    authStatusLine.textContent = t("passkeyEnrollRequired");
  } else if (passkeysEnabled) {
    authStatusLine.textContent = t("passkeysSummary", { count: auth.passkeyCount });
  } else {
    authStatusLine.textContent = t("passkeysUnavailable");
  }
  passkeyForm.classList.toggle("hidden", !passkeysEnabled || !supported);
  passkeyList.innerHTML = (auth.passkeys || []).length
    ? auth.passkeys.map(passkeyCard).join("")
    : `<p class='hint'>${escapeHtml(t("noPasskeys"))}</p>`;
}

function renderWorkspaceSelect(auth) {
  const previousValue = workspaceSelect.value;
  workspaceSelect.innerHTML = "";
  const workspaces = auth?.workspaces || [];
  if (!workspaces.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("noWorkspace");
    workspaceSelect.append(option);
    workspaceSelect.disabled = true;
    return;
  }
  workspaceSelect.disabled = false;
  for (const workspace of workspaces) {
    const option = document.createElement("option");
    option.value = workspace.workspaceId;
    option.textContent = `${workspace.name} (${formatRoleLabel(workspace.role)})`;
    workspaceSelect.append(option);
  }
  workspaceSelect.value = auth.currentWorkspaceId || previousValue || workspaces[0].workspaceId;
}

function renderSecurityPanels(data) {
  const auth = data.auth || getCurrentAuth() || {};
  const permissions = auth.permissions || {};
  const relayUsersPanel = document.querySelector("#relay-users-panel");
  workspaceForm.classList.toggle("hidden", !permissions.createWorkspaces);
  joinWorkspaceForm.classList.toggle("hidden", !state.authenticated);
  inviteForm.classList.toggle("hidden", !(permissions.manageMembers || permissions.createAccountInvites));
  relayUsersPanel?.classList.toggle("hidden", !permissions.manageRelayUsers);
  memberList.innerHTML =
    permissions.manageMembers && data.currentWorkspace
      ? (data.members || []).map(memberCard).join("") || `<p class='hint'>${escapeHtml(t("noMembers"))}</p>`
      : `<p class='hint'>${escapeHtml(t("ownersManageMembers"))}</p>`;
  inviteList.innerHTML =
    permissions.manageMembers && data.currentWorkspace
      ? (data.invitations || []).length
        ? data.invitations.map(invitationCard).join("")
        : `<p class='hint'>${escapeHtml(t("noInvites"))}</p>`
      : "";
  usersEl.innerHTML =
    permissions.manageRelayUsers
      ? (data.users || []).map(userCard).join("") || `<p class='hint'>${escapeHtml(t("noUsers"))}</p>`
      : "";
  if (!permissions.manageRelayUsers) {
    userAdminResult.textContent = "";
  }
}

function renderState(data) {
  const agents = (data.agents || []).map(mergeAgentSessionsFromCache);
  updateSessionCache(agents);
  const tasks = (data.tasks || []).map(mergeTaskFromCache);
  updateTaskCache(tasks);
  state.data = {
    ...data,
    agents,
    tasks
  };
  renderAuthStatus(state.data.auth || state.authStatus);
  renderWorkspaceSelect(state.data.auth || {});
  renderSecurityPanels(state.data);

  const permissions = currentPermissions();
  const currentAgentId = agentSelect.value;
  agentSelect.innerHTML = "";
  actionSelect.innerHTML = "";
  logSelect.innerHTML = "";

  for (const agent of state.data.agents || []) {
    const option = document.createElement("option");
    option.value = agent.agentId;
    option.textContent = `${agent.label || agent.agentId} (${agent.agentId})`;
    agentSelect.append(option);
  }

  const selectedAgentId = (state.data.agents || []).some((agent) => agent.agentId === currentAgentId)
    ? currentAgentId
    : state.data.agents?.[0]?.agentId || "";
  if (selectedAgentId) {
    agentSelect.value = selectedAgentId;
  }
  const selectedAgent = (state.data.agents || []).find((agent) => agent.agentId === selectedAgentId) || null;
  if (state.selectedSessionId && !(selectedAgent?.codexSessions || []).some((session) => session.sessionId === state.selectedSessionId)) {
    state.selectedSessionId = "";
  }

  for (const action of selectedAgent?.actions || []) {
    const option = document.createElement("option");
    option.value = action.id;
    option.textContent = action.label || action.id;
    actionSelect.append(option);
  }
  for (const source of selectedAgent?.logSources || []) {
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.label || source.id;
    logSelect.append(option);
  }

  const workspaceName = state.data.currentWorkspace?.name || t("noWorkspace");
  statusLine.textContent = t("statusSummary", {
    workspace: workspaceName,
    agents: (state.data.agents || []).length,
    tasks: (state.data.tasks || []).length
  });
  tasksEl.innerHTML = (state.data.tasks || []).map(taskCard).join("") || `<p class='hint'>${escapeHtml(t("noTasks"))}</p>`;
  pairRequestsEl.innerHTML = (state.data.pendingPairRequests || []).length
    ? state.data.pendingPairRequests.map(pairRequestCard).join("")
    : `<p class='hint'>${escapeHtml(t("noPendingDevices"))}</p>`;
  renderSessionList(selectedAgent);

  taskForm.classList.toggle("hidden", !permissions.createTasks || !state.data.currentWorkspace);
  pairForm.classList.toggle("hidden", !permissions.pairAgents || !state.data.currentWorkspace);

  if (authNeedsPasskeyEnrollment()) {
    setActiveView("security");
  }
  syncTaskFields();
}

function syncTaskFields() {
  const type = taskType.value;
  const isResume = Boolean(state.selectedSessionId);
  const relayFeatures = state.data?.features || {};
  document.querySelector("#codex-prompt-row").classList.toggle("hidden", type !== "codex_exec");
  document.querySelector("#cwd-row").classList.toggle("hidden", type !== "codex_exec" || isResume);
  document.querySelector("#write-row").classList.toggle("hidden", type !== "codex_exec" || isResume || !relayFeatures.codexExecWrite);
  document.querySelector("#action-row").classList.toggle("hidden", type !== "run_action");
  document.querySelector("#log-row").classList.toggle("hidden", type !== "read_log");
  promptLabel.textContent = isResume ? t("continuePrompt") : t("prompt");
}

function syncInviteFields() {
  const inviteType = inviteTypeSelect?.value || "account";
  const roleLabel = inviteRoleSelect?.closest("label");
  if (roleLabel) {
    roleLabel.classList.toggle("hidden", inviteType !== "workspace");
  }
  const summary = document.querySelector("#invite-type-summary");
  if (summary) {
    summary.textContent = inviteType === "workspace" ? t("inviteTypeSummaryWorkspace") : t("inviteTypeSummaryAccount");
  }
  const button = document.querySelector("#invite-create-button");
  if (button) {
    button.textContent = inviteType === "workspace" ? t("createWorkspaceInvite") : t("createAccountInvite");
  }
}

async function refreshAuthStatus() {
  try {
    const body = await api("/api/auth/status");
    state.authenticated = !!body.authenticated;
    renderAuthStatus(body.auth);
  } catch {
    state.authenticated = false;
    renderAuthStatus(null);
  }
}

async function refresh() {
  const data = await api("/api/admin/state");
  state.authenticated = true;
  showDashboard(true);
  renderState(data);
  const desiredInterval = Number(data.web?.pollIntervalMs || 2500);
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
  }, desiredInterval);
}

async function login(bootstrapToken) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: { bootstrapToken }
  });
  state.authenticated = true;
  showDashboard(true);
  renderAuthStatus(data.auth || state.authStatus);
  await refresh();
}

async function redeemInvite(inviteCode, displayName = "") {
  const data = await api("/api/auth/invitations/redeem", {
    method: "POST",
    body: {
      inviteCode,
      displayName
    }
  });
  state.authenticated = true;
  showDashboard(true);
  renderAuthStatus(data.auth || state.authStatus);
  await refresh();
}

async function redeemRecoveryCode(recoveryCode) {
  const data = await api("/api/auth/recovery/redeem", {
    method: "POST",
    body: {
      recoveryCode
    }
  });
  state.authenticated = true;
  showDashboard(true);
  renderAuthStatus(data.auth || state.authStatus);
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
  showDashboard(true);
  renderAuthStatus(verified.auth || state.authStatus);
  await refresh();
}

async function registerPasskey() {
  if (!webauthnAvailable()) {
    throw new Error("passkeys-unavailable-in-this-browser");
  }
  const label = passkeyLabelInput.value.trim() || t("thisDevice");
  const options = await api("/api/auth/passkeys/register/options", {
    method: "POST",
    body: { label }
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
  renderAuthStatus(verified.auth || state.authStatus);
  passkeyLabelInput.value = "";
  await refresh();
}

function clearAuthenticatedState() {
  state.authenticated = false;
  state.data = null;
  state.selectedSessionId = "";
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout transport failures and clear local UI state anyway.
  }
  clearAuthenticatedState();
  showDashboard(false);
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

async function createInvite(role, ttlSec, note) {
  const type = inviteTypeSelect?.value || "account";
  const result = await api("/api/admin/invitations", {
    method: "POST",
    body: {
      type,
      role,
      ttlSec,
      note
    }
  });
  inviteResult.textContent =
    result.invitation.type === "account"
      ? `${t("inviteCodeLabel")}: ${result.inviteCode}\n${t("inviteResultAccount")}\n${t("expiresLabel")}: ${result.invitation.expiresAt}`
      : `${t("inviteCodeLabel")}: ${result.inviteCode}\n${t("inviteResultWorkspace")}\n${t("inviteResultRole")}: ${formatRoleLabel(result.invitation.role)}\n${t("inviteResultWorkspaceLabel")}: ${result.invitation.workspaceName || t("currentWorkspace")}\n${t("expiresLabel")}: ${result.invitation.expiresAt}`;
  await refresh();
}

async function createUserRecoveryCode(userId) {
  const result = await api(`/api/admin/users/${encodeURIComponent(userId)}/recovery-codes`, {
    method: "POST",
    body: {
      ttlSec: 3600
    }
  });
  userAdminResult.textContent = `${t("recoveryCodeIssued", { user: result.user.displayName })}\n${t("userRecoveryCode")}: ${result.recoveryCode}\n${t("expiresLabel")}: ${result.recovery.expiresAt}\n${t("recoveryCodeUseHint")}`;
  await refresh();
}

async function disableUser(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/disable`, {
    method: "POST"
  });
  await refresh();
}

async function enableUser(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/enable`, {
    method: "POST"
  });
  await refresh();
}

async function revokeUserSessions(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke`, {
    method: "POST"
  });
  await refresh();
}

async function deleteUser(userId) {
  await api(`/api/admin/users/${encodeURIComponent(userId)}/delete`, {
    method: "POST"
  });
  await refresh();
}

async function revokeMembership(membershipId) {
  await api(`/api/admin/memberships/${encodeURIComponent(membershipId)}/revoke`, {
    method: "POST"
  });
  await refresh();
}

langEnButton?.addEventListener("click", () => setLocale("en"));
langZhButton?.addEventListener("click", () => setLocale("zh"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const token = document.querySelector("#bootstrap-token").value.trim();
    await login(token);
  } catch (error) {
    alert(String(error.message || error));
  }
});

inviteLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const inviteCode = document.querySelector("#invite-code").value.trim();
    const displayName = document.querySelector("#invite-display-name").value.trim();
    await redeemInvite(inviteCode, displayName);
    document.querySelector("#invite-code").value = "";
    document.querySelector("#invite-display-name").value = "";
  } catch (error) {
    alert(String(error.message || error));
  }
});

userRecoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await redeemRecoveryCode(userRecoveryCodeInput.value.trim());
    userRecoveryCodeInput.value = "";
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

passkeyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await registerPasskey();
  } catch (error) {
    alert(String(error.message || error));
  }
});

workspaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const input = document.querySelector("#workspace-name");
    await createWorkspace(input.value.trim());
    input.value = "";
    setActiveView("workspace");
  } catch (error) {
    alert(String(error.message || error));
  }
});

joinWorkspaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const input = document.querySelector("#join-invite-code");
    await redeemInvite(input.value.trim());
    input.value = "";
    setActiveView("workspace");
  } catch (error) {
    alert(String(error.message || error));
  }
});

inviteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createInvite(
      document.querySelector("#invite-role").value,
      Number(document.querySelector("#invite-ttl").value || 86400),
      document.querySelector("#invite-note").value.trim()
    );
  } catch (error) {
    alert(String(error.message || error));
  }
});

viewNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-target]");
  if (!button) {
    return;
  }
  setActiveView(button.dataset.viewTarget);
});

inviteTypeSelect?.addEventListener("change", syncInviteFields);
workspaceSelect.addEventListener("change", async () => {
  if (!workspaceSelect.value) {
    return;
  }
  try {
    await switchWorkspace(workspaceSelect.value);
  } catch (error) {
    alert(String(error.message || error));
  }
});

taskType.addEventListener("change", syncTaskFields);
agentSelect.addEventListener("change", () => {
  clearSelectedSession();
  renderState(state.data || { agents: [], tasks: [] });
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const type = taskType.value;
    const body = {
      agentId: agentSelect.value,
      type,
      title: type === "codex_exec" ? t("taskTypeCodex") : type === "run_action" ? t("taskTypeAction") : t("taskTypeLog")
    };
    if (type === "codex_exec") {
      body.prompt = document.querySelector("#task-prompt").value;
      body.cwd = document.querySelector("#task-cwd").value || ".";
      body.writeAccess = state.selectedSessionId ? false : document.querySelector("#task-write").checked;
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
    await api("/api/admin/tasks", {
      method: "POST",
      body
    });
    await refresh();
  } catch (error) {
    alert(String(error.message || error));
  }
});

pairForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setActiveView("agents");
    const body = await api("/api/admin/pairings", {
      method: "POST",
      body: {
        note: document.querySelector("#pair-note").value,
        ttlSec: Number(document.querySelector("#pair-ttl").value || 300)
      }
    });
    pairResult.textContent = `${t("shortPairCodeLabel")}: ${body.pairingCode}\n${t("expiresLabel")}: ${body.expiresAt}\n${t("pairResultHint")}`;
    pairCommand.value = buildPairCommand(body.pairingCode);
    pairCommandBox.classList.remove("hidden");
  } catch (error) {
    alert(String(error.message || error));
  }
});

copyPairCommandButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(pairCommand.value);
    copyPairCommandButton.textContent = t("copied");
    setTimeout(() => {
      copyPairCommandButton.textContent = t("copyPairCommand");
    }, 1200);
  } catch {
    pairCommand.focus();
    pairCommand.select();
    alert(t("copyFailed"));
  }
});

document.querySelector("#refresh-button").addEventListener("click", refresh);
logoutButton.addEventListener("click", () => {
  logout().catch(() => {});
});
clearTaskCacheButton.addEventListener("click", () => {
  state.taskCache = {};
  state.sessionCache = {};
  localStorage.removeItem(taskCacheKey);
  localStorage.removeItem(sessionCacheKey);
  if (state.data) {
    renderState(state.data);
  }
});
clearSessionSelectionButton.addEventListener("click", () => {
  clearSelectedSession();
  renderState(state.data || { agents: [], tasks: [] });
});

tasksEl.addEventListener("click", async (event) => {
  const approveId = event.target.getAttribute("data-approve");
  const rejectId = event.target.getAttribute("data-reject");
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

pairRequestsEl.addEventListener("click", async (event) => {
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

sessionList.addEventListener("click", (event) => {
  const sessionId = event.target.getAttribute("data-use-session");
  const deleteSessionId = event.target.getAttribute("data-delete-session");
  if (sessionId) {
    state.selectedSessionId = sessionId;
    taskType.value = "codex_exec";
    setActiveView("workspace");
    syncTaskFields();
    renderState(state.data || { agents: [], tasks: [] });
    document.querySelector("#task-prompt").focus();
    return;
  }
  if (!deleteSessionId) {
    return;
  }
  const selectedAgent = findSelectedAgent();
  const session = findSelectedSession(selectedAgent) && state.selectedSessionId === deleteSessionId
    ? findSelectedSession(selectedAgent)
    : (selectedAgent?.codexSessions || []).find((item) => item.sessionId === deleteSessionId);
  const label = session ? `${session.title} (${session.sessionId})` : deleteSessionId;
  if (!confirm(t("deleteSessionConfirm", { label }))) {
    return;
  }
  api("/api/admin/tasks", {
    method: "POST",
    body: {
      agentId: agentSelect.value,
      type: "delete_session",
      title: t("delete"),
      sessionId: deleteSessionId
    }
  })
    .then(async () => {
      removeSessionFromLocalState(agentSelect.value, deleteSessionId);
      if (state.selectedSessionId === deleteSessionId) {
        clearSelectedSession();
      }
      if (state.data) {
        renderState(state.data);
      }
      await refresh();
    })
    .catch((error) => {
      alert(String(error.message || error));
    });
});

passkeyList.addEventListener("click", async (event) => {
  const passkeyId = event.target.getAttribute("data-revoke-passkey");
  if (!passkeyId) {
    return;
  }
  if (!confirm(t("revokePasskeyConfirm"))) {
    return;
  }
  try {
    const result = await api(`/api/admin/passkeys/${passkeyId}/revoke`, {
      method: "POST"
    });
    renderAuthStatus(result.auth || state.authStatus);
    await refresh();
  } catch (error) {
    alert(String(error.message || error));
  }
});

inviteList.addEventListener("click", async (event) => {
  const inviteId = event.target.getAttribute("data-revoke-invite");
  if (!inviteId) {
    return;
  }
  if (!confirm(t("revokeInviteConfirm"))) {
    return;
  }
  try {
    await api(`/api/admin/invitations/${inviteId}/revoke`, {
      method: "POST"
    });
    await refresh();
  } catch (error) {
    alert(String(error.message || error));
  }
});

memberList.addEventListener("click", async (event) => {
  const membershipId = event.target.getAttribute("data-revoke-membership");
  if (!membershipId) {
    return;
  }
  if (!confirm(t("removeMembershipConfirm"))) {
    return;
  }
  try {
    await revokeMembership(membershipId);
  } catch (error) {
    alert(String(error.message || error));
  }
});

usersEl.addEventListener("click", async (event) => {
  const recoveryUserId = event.target.getAttribute("data-create-user-recovery");
  const disableUserId = event.target.getAttribute("data-disable-user");
  const enableUserId = event.target.getAttribute("data-enable-user");
  const revokeSessionsUserId = event.target.getAttribute("data-revoke-user-sessions");
  const deleteUserId = event.target.getAttribute("data-delete-user");
  const membershipId = event.target.getAttribute("data-revoke-membership");
  try {
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

setLocale(state.locale);
syncTaskFields();
syncInviteFields();
setActiveView(state.activeView);
showDashboard(false);

refreshAuthStatus()
  .catch(() => {})
  .finally(() => {
    refresh().catch(() => {
      clearAuthenticatedState();
      showDashboard(false);
    });
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
