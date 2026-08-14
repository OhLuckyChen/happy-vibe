import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { ActivityIndicator, Modal as RNModal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { machineSpawnNewSession, taskboardAddComment, taskboardComments, taskboardCreate, taskboardList, taskboardUpdate, type TaskboardComment, type TaskboardPriority, type TaskboardTask, type TaskboardTaskStatus } from '@/sync/ops';
import { useAllMachines, useSession } from '@/sync/storage';
import { t } from '@/text';

const statuses: TaskboardTaskStatus[] = ['todo', 'in_progress', 'in_review', 'blocked', 'done'];
const priorities: TaskboardPriority[] = ['none', 'urgent', 'high', 'medium', 'low'];

const statusTone: Record<TaskboardTaskStatus, string> = {
    todo: '#9e9ea1',
    in_progress: '#f0bf00',
    in_review: '#43bc58',
    blocked: '#f34e52',
    done: '#5e6ad2',
};

const priorityTone: Record<TaskboardPriority, string> = {
    none: '#b5b5b7',
    urgent: '#f34e52',
    high: '#f28b30',
    medium: '#f0bf00',
    low: '#5e6ad2',
};

const styles = StyleSheet.create((theme) => ({
    root: { flex: 1, backgroundColor: theme.colors.groupped.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.groupped.background },
    topbar: { height: 45, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
    workspaceDot: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.text },
    workspaceDotText: { color: theme.colors.surface, fontSize: 10, fontWeight: '800' },
    breadcrumb: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500' },
    screenTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
    iconButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
    tabbar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
    tab: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 6, backgroundColor: 'transparent' },
    tabSelected: { backgroundColor: theme.colors.input.background },
    tabText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500' },
    tabTextSelected: { color: theme.colors.text, fontWeight: '600' },
    searchWrap: { flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, height: 30, borderRadius: 6, backgroundColor: theme.colors.input.background },
    search: { flex: 1, color: theme.colors.text, fontSize: 12, paddingVertical: 0 },
    inlineCreate: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
    createInput: { flex: 1, color: theme.colors.text, fontSize: 13, height: 32, paddingHorizontal: 9, borderRadius: 6, backgroundColor: theme.colors.input.background },
    board: { flexGrow: 1, alignItems: 'flex-start', gap: 8, padding: 8 },
    boardCompact: { padding: 6, gap: 6 },
    column: { width: 338, minHeight: 240, borderRadius: 8, backgroundColor: theme.colors.input.background },
    columnCompact: { width: 300 },
    columnHeader: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
    columnHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
    statusMark: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
    doneMark: { alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
    columnTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },
    count: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },
    columnList: { paddingHorizontal: 8, paddingBottom: 10, gap: 8 },
    groupHeading: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2, marginBottom: 1 },
    card: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 6, padding: 10, gap: 7, backgroundColor: theme.colors.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    identifier: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },
    avatar: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ec6bb7' },
    avatarText: { color: '#fff', fontSize: 8, fontWeight: '800' },
    cardTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    preview: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
    properties: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    propertyButton: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
    priorityIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', gap: 2 },
    priorityBar: { width: 3, borderRadius: 1 },
    chip: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 5, paddingHorizontal: 6, backgroundColor: theme.colors.surface },
    chipMuted: { backgroundColor: theme.colors.input.background },
    chipSelected: { borderColor: '#5e6ad2', backgroundColor: 'rgba(94, 106, 210, 0.11)' },
    chipText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },
    chipTextSelected: { color: '#5e6ad2', fontWeight: '600' },
    emptyColumn: { minHeight: 74, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', borderColor: theme.colors.divider, borderRadius: 6 },
    emptyColumnText: { color: theme.colors.textSecondary, fontSize: 12 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 9 },
    error: { color: theme.colors.textSecondary, textAlign: 'center', maxWidth: 360, lineHeight: 19 },
    detailShell: { flex: 1, backgroundColor: theme.colors.groupped.background },
    detailTopbar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
    detailTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
    detailBody: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 18, gap: 14 },
    issueHeader: { gap: 7, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider },
    issueReference: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '500' },
    issueTitleInput: { color: theme.colors.text, fontSize: 22, fontWeight: '700', lineHeight: 28, padding: 0 },
    section: { gap: 8, paddingVertical: 2 },
    sectionTitle: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    input: { color: theme.colors.text, fontSize: 13, minHeight: 34, paddingHorizontal: 9, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 6, backgroundColor: theme.colors.surface },
    multiline: { minHeight: 110, lineHeight: 19, textAlignVertical: 'top' },
    propertyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    detailAction: { minHeight: 30, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 6, backgroundColor: theme.colors.surface },
    detailActionPrimary: { borderColor: '#5e6ad2', backgroundColor: 'rgba(94, 106, 210, 0.11)' },
    detailActionText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    detailActionTextPrimary: { color: '#5e6ad2' },
    mutedLine: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    comment: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 6, padding: 9, gap: 4, backgroundColor: theme.colors.surface },
    commentAuthor: { color: theme.colors.text, fontWeight: '600', fontSize: 12 },
    commentBody: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
}));

const statusLabel = (status: TaskboardTaskStatus) => t(status === 'todo' ? 'taskboard.todo' : status === 'in_progress' ? 'taskboard.inProgress' : status === 'in_review' ? 'taskboard.inReview' : status === 'blocked' ? 'taskboard.blocked' : 'taskboard.done');
const priorityLabel = (priority: TaskboardPriority) => t(priority === 'none' ? 'taskboard.priorityNone' : priority === 'urgent' ? 'taskboard.priorityUrgent' : priority === 'high' ? 'taskboard.priorityHigh' : priority === 'medium' ? 'taskboard.priorityMedium' : 'taskboard.priorityLow');

function descriptionPreview(description: string) {
    return description.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
}

function groupLabel(task: TaskboardTask) {
    const changed = Date.parse(task.updatedAt || task.createdAt);
    if (!Number.isFinite(changed)) return t('taskboard.today');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (changed >= today) return t('taskboard.today');
    if (changed >= today - 24 * 60 * 60 * 1000) return t('taskboard.yesterday');
    return t('taskboard.earlier');
}

function StatusMark({ status }: { status: TaskboardTaskStatus }) {
    if (status === 'done') {
        return <View style={[styles.statusMark, styles.doneMark, { backgroundColor: statusTone.done }]}><Ionicons name="checkmark" size={10} color="#fff" /></View>;
    }
    return <View style={[styles.statusMark, { borderColor: statusTone[status] }]} />;
}

function PriorityIcon({ priority }: { priority: TaskboardPriority }) {
    const color = priorityTone[priority];
    const active = priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;
    return <View style={styles.priorityIcon}>{[1, 2, 3, 4].map((level) => <View key={level} style={[styles.priorityBar, { height: 4 + level * 3, backgroundColor: level <= active ? color : '#d5d5d5' }]} />)}</View>;
}

function TaskCard({ task, onPress }: { task: TaskboardTask; onPress: () => void }) {
    const preview = descriptionPreview(task.description);
    const subIssueTotal = task.relations?.subIssues?.length ?? 0;
    const blockerTotal = task.relations?.blockedBy?.length ?? 0;
    return <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.cardTop}>
            <Text style={styles.identifier}>{task.identifier ?? task.id}</Text>
            <View style={styles.avatar}><Text style={styles.avatarText}>T</Text></View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
        {preview ? <Text style={styles.preview} numberOfLines={2}>{preview}</Text> : null}
        <View style={styles.properties}>
            <View style={styles.propertyButton}><Ionicons name="star-outline" size={14} color="#9e9ea1" /></View>
            <PriorityIcon priority={task.priority} />
            {blockerTotal > 0 ? <View style={styles.chip}><Ionicons name="alert-circle" size={12} color={statusTone.blocked} /><Text style={styles.chipText}>{blockerTotal}</Text></View> : null}
            {subIssueTotal > 0 ? <View style={styles.chip}><Ionicons name="git-branch-outline" size={12} color="#9e9ea1" /><Text style={styles.chipText}>{subIssueTotal}</Text></View> : null}
            {task.labels.slice(0, 2).map((label) => <View key={label} style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>)}
            {task.labels.length > 2 ? <View style={styles.chip}><Text style={styles.chipText}>+{task.labels.length - 2}</Text></View> : null}
            {task.dueDate ? <View style={styles.chip}><Ionicons name="calendar-outline" size={12} color="#9e9ea1" /><Text style={styles.chipText}>{task.dueDate}</Text></View> : null}
            {task.threadId ? <View style={styles.propertyButton}><Ionicons name="chatbubble-outline" size={13} color="#5e6ad2" /></View> : null}
        </View>
    </Pressable>;
}

function TaskDetail({ initialTask, machineId, workspacePath, onClose, onChange }: { initialTask: TaskboardTask; machineId: string; workspacePath?: string | null; onClose: () => void; onChange: () => void }) {
    const { theme } = useUnistyles();
    const navigateToSession = useNavigateToSession();
    const [task, setTask] = React.useState(initialTask);
    const linkedSession = useSession(task.threadId ?? '');
    const [comments, setComments] = React.useState<TaskboardComment[]>([]);
    const [comment, setComment] = React.useState('');
    const [title, setTitle] = React.useState(initialTask.title);
    const [description, setDescription] = React.useState(initialTask.description);
    const [labelsInput, setLabelsInput] = React.useState(initialTask.labels.join(', '));
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const refresh = React.useCallback(async () => {
        setComments(await taskboardComments(machineId, initialTask.id));
    }, [initialTask.id, machineId]);

    React.useEffect(() => {
        void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : t('taskboard.unavailable')));
    }, [refresh]);

    const update = async (change: Parameters<typeof taskboardUpdate>[2]) => {
        setBusy(true);
        setError(null);
        try {
            const state = await taskboardUpdate(machineId, task.id, change);
            const freshTask = state.tasks.find((item) => item.id === task.id);
            setTask(freshTask ?? ((value) => ({ ...value, ...change })));
            onChange();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('taskboard.unavailable'));
        } finally {
            setBusy(false);
        }
    };

    const saveFields = async () => {
        const labels = labelsInput.split(',').map((item) => item.trim()).filter(Boolean);
        await update({ title: title.trim() || task.title, description, labels });
    };

    const startSession = async () => {
        if (!workspacePath) {
            setError(t('taskboard.workspaceUnavailable'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const result = await machineSpawnNewSession({ machineId, directory: workspacePath, agent: 'codex', environmentVariables: { AS_BOSS_TASKBOARD_ISSUE_ID: task.identifier ?? task.id } });
            if (result.type !== 'success') throw new Error(result.type === 'error' ? result.errorMessage : t('taskboard.workspaceUnavailable'));
            await update({ threadId: result.sessionId });
            navigateToSession(result.sessionId);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('taskboard.sessionCreateFailed'));
        } finally {
            setBusy(false);
        }
    };

    const submitComment = async () => {
        if (!comment.trim()) return;
        setBusy(true);
        setError(null);
        try {
            await taskboardAddComment(machineId, task.id, comment.trim(), task.threadId ?? undefined);
            setComment('');
            setComments(await taskboardComments(machineId, task.id));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('taskboard.unavailable'));
        } finally {
            setBusy(false);
        }
    };

    return <RNModal visible animationType="slide" onRequestClose={onClose}>
        <View style={styles.detailShell}>
            <View style={styles.detailTopbar}>
                <Pressable style={styles.iconButton} onPress={onClose}><Ionicons name="close" size={18} color={theme.colors.textSecondary} /></Pressable>
                <Text style={styles.detailTitle}>{task.identifier ?? task.id}</Text>
                <Pressable disabled={busy} style={[styles.detailAction, styles.detailActionPrimary]} onPress={() => void saveFields()}><Text style={[styles.detailActionText, styles.detailActionTextPrimary]}>{t('taskboard.saveChanges')}</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailBody}>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.issueHeader}>
                    <Text style={styles.issueReference}>{task.identifier ?? task.id}</Text>
                    <TextInput value={title} onChangeText={setTitle} multiline style={styles.issueTitleInput} />
                </View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('profile.status')}</Text><View style={styles.propertyGrid}>{statuses.map((value) => <Pressable key={value} disabled={busy} onPress={() => void update({ status: value })} style={[styles.chip, task.status === value && styles.chipSelected]}><StatusMark status={value} /><Text style={[styles.chipText, task.status === value && styles.chipTextSelected]}>{statusLabel(value)}</Text></Pressable>)}</View></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.priority')}</Text><View style={styles.propertyGrid}>{priorities.map((value) => <Pressable key={value} disabled={busy} onPress={() => void update({ priority: value })} style={[styles.chip, task.priority === value && styles.chipSelected]}><PriorityIcon priority={value} /><Text style={[styles.chipText, task.priority === value && styles.chipTextSelected]}>{priorityLabel(value)}</Text></Pressable>)}</View></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.description')}</Text><TextInput value={description} onChangeText={setDescription} multiline style={[styles.input, styles.multiline]} placeholder={t('taskboard.description')} placeholderTextColor={theme.colors.textSecondary} /></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.labels')}</Text><TextInput value={labelsInput} onChangeText={setLabelsInput} style={styles.input} placeholder={t('taskboard.labelsPlaceholder')} placeholderTextColor={theme.colors.textSecondary} /></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.schedule')}</Text><Text style={styles.mutedLine}>{t('taskboard.startDate')}: {task.startDate || '-'}</Text><Text style={styles.mutedLine}>{t('taskboard.dueDate')}: {task.dueDate || '-'}</Text></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.relations')}</Text><Text style={styles.mutedLine}>{t('taskboard.subtasks')}: {task.relations?.subIssues?.length ?? 0} · {t('taskboard.blockedBy')}: {task.relations?.blockedBy?.length ?? 0} · {t('taskboard.blocks')}: {task.relations?.blocks?.length ?? 0}</Text></View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.happySession')}</Text>{linkedSession ? <View style={styles.propertyGrid}><Pressable style={[styles.detailAction, styles.detailActionPrimary]} onPress={() => navigateToSession(linkedSession.id)}><Ionicons name="chatbubble-outline" size={15} color="#5e6ad2" /><Text style={[styles.detailActionText, styles.detailActionTextPrimary]}>{linkedSession.metadata?.name || t('tabs.sessions')}</Text></Pressable><Pressable disabled={busy} style={styles.detailAction} onPress={() => void update({ threadId: null })}><Text style={styles.detailActionText}>{t('taskboard.unlinkSession')}</Text></Pressable></View> : <Pressable disabled={busy || !workspacePath} style={[styles.detailAction, styles.detailActionPrimary]} onPress={() => void startSession()}><Ionicons name="add" size={15} color="#5e6ad2" /><Text style={[styles.detailActionText, styles.detailActionTextPrimary]}>{t('taskboard.createHappySession')}</Text></Pressable>}</View>
                <View style={styles.section}><Text style={styles.sectionTitle}>{t('taskboard.activity')}</Text>{comments.map((item) => <View key={item.id} style={styles.comment}><Text style={styles.commentAuthor}>{item.authorName}</Text><Text style={styles.commentBody}>{item.body}</Text></View>)}<TextInput value={comment} onChangeText={setComment} multiline placeholder={t('common.message')} placeholderTextColor={theme.colors.textSecondary} style={styles.input} /><Pressable disabled={busy} style={[styles.detailAction, styles.detailActionPrimary]} onPress={() => void submitComment()}><Text style={[styles.detailActionText, styles.detailActionTextPrimary]}>{t('common.save')}</Text></Pressable></View>
            </ScrollView>
        </View>
    </RNModal>;
}

export const TaskboardView = React.memo(() => {
    const machines = useAllMachines();
    const { theme } = useUnistyles();
    const { width } = useWindowDimensions();
    const compact = width < 720;
    const [tasks, setTasks] = React.useState<TaskboardTask[]>([]);
    const [workspacePath, setWorkspacePath] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState('');
    const [activeOnly, setActiveOnly] = React.useState(false);
    const [selected, setSelected] = React.useState<TaskboardTask | null>(null);
    const [creating, setCreating] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const machine = machines[0];

    const load = React.useCallback(async () => {
        if (!machine) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const state = await taskboardList(machine.id);
            setTasks(state.tasks);
            setWorkspacePath(state.project?.workspacePath ?? null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('taskboard.unavailable'));
        } finally {
            setLoading(false);
        }
    }, [machine]);

    React.useEffect(() => { void load(); }, [load]);

    const create = async () => {
        if (!machine || !title.trim()) return;
        try {
            const state = await taskboardCreate(machine.id, title.trim(), '');
            setTasks(state.tasks);
            setTitle('');
            setCreating(false);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('taskboard.unavailable'));
        }
    };

    if (loading) return <View style={styles.loading}><ActivityIndicator color={theme.colors.textSecondary} /></View>;
    if (!machine) return <View style={styles.empty}><Text style={styles.error}>{t('taskboard.unavailable')}</Text></View>;

    const visible = tasks.filter((task) => `${task.title} ${task.identifier ?? ''} ${task.labels.join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (!activeOnly || task.status !== 'done'));

    return <View style={styles.root}>
        <View style={styles.topbar}>
            <View style={styles.titleRow}><View style={styles.workspaceDot}><Text style={styles.workspaceDotText}>L</Text></View><Text style={styles.breadcrumb}>Local</Text><Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} /><Text style={styles.screenTitle}>{t('taskboard.title')}</Text></View>
            <Pressable style={styles.iconButton} onPress={() => setCreating((value) => !value)}><Ionicons name="add" size={19} color={theme.colors.textSecondary} /></Pressable>
        </View>
        <View style={styles.tabbar}>
            <Pressable style={[styles.tab, !activeOnly && styles.tabSelected]} onPress={() => setActiveOnly(false)}><Text style={[styles.tabText, !activeOnly && styles.tabTextSelected]}>{t('taskboard.filterAll')} {tasks.length}</Text></Pressable>
            <Pressable style={[styles.tab, activeOnly && styles.tabSelected]} onPress={() => setActiveOnly(true)}><Text style={[styles.tabText, activeOnly && styles.tabTextSelected]}>{t('taskboard.filterActive')}</Text></Pressable>
            <View style={styles.searchWrap}><Ionicons name="search" size={14} color={theme.colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder={t('taskboard.search')} placeholderTextColor={theme.colors.textSecondary} style={styles.search} /></View>
            <Pressable style={styles.iconButton} onPress={() => void load()}><Ionicons name="options-outline" size={17} color={theme.colors.textSecondary} /></Pressable>
        </View>
        {creating ? <View style={styles.inlineCreate}><TextInput autoFocus value={title} onChangeText={setTitle} placeholder={t('taskboard.taskTitle')} placeholderTextColor={theme.colors.textSecondary} style={styles.createInput} /><Pressable style={styles.iconButton} onPress={() => void create()}><Ionicons name="checkmark" size={18} color="#5e6ad2" /></Pressable></View> : null}
        {error ? <View style={styles.empty}><Text style={styles.error}>{error}</Text><Pressable style={[styles.detailAction, styles.detailActionPrimary]} onPress={() => void load()}><Text style={[styles.detailActionText, styles.detailActionTextPrimary]}>{t('taskboard.refresh')}</Text></Pressable></View> : <ScrollView horizontal contentContainerStyle={[styles.board, compact && styles.boardCompact]}>{statuses.map((status) => {
            const column = visible.filter((task) => task.status === status);
            let previousGroup: string | null = null;
            return <View key={status} style={[styles.column, compact && styles.columnCompact]}>
                <View style={styles.columnHeader}><View style={styles.columnHeading}><StatusMark status={status} /><Text style={styles.columnTitle}>{statusLabel(status)}</Text><Text style={styles.count}>{column.length}</Text></View><Ionicons name="ellipsis-horizontal" size={15} color={theme.colors.textSecondary} /></View>
                <View style={styles.columnList}>{column.length === 0 ? <View style={styles.emptyColumn}><Text style={styles.emptyColumnText}>{t('taskboard.empty')}</Text></View> : column.map((task) => {
                    const group = groupLabel(task);
                    const showGroup = group !== previousGroup;
                    previousGroup = group;
                    return <View key={task.id}>{showGroup ? <Text style={styles.groupHeading}>{group}</Text> : null}<TaskCard task={task} onPress={() => setSelected(task)} /></View>;
                })}</View>
            </View>;
        })}</ScrollView>}
        {selected ? <TaskDetail initialTask={selected} machineId={machine.id} workspacePath={workspacePath} onClose={() => setSelected(null)} onChange={() => void load()} /> : null}
    </View>;
});
