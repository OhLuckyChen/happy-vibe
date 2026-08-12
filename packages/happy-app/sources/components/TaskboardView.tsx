import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { useAllMachines } from '@/sync/storage';
import { taskboardCreate, taskboardList, taskboardUpdate, type TaskboardTask, type TaskboardTaskStatus } from '@/sync/ops';
import { FAB } from './FAB';

const styles = StyleSheet.create((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.groupped.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, paddingBottom: 100, gap: 10 },
    card: { backgroundColor: theme.colors.surface, padding: 14, borderRadius: 12, gap: 8 },
    title: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
    description: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    status: { color: theme.colors.textSecondary, fontSize: 13 },
    action: { backgroundColor: theme.colors.button.primary.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    actionText: { color: theme.colors.button.primary.tint, fontSize: 13, fontWeight: '600' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '600' },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    composer: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, gap: 12 },
    input: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 8, color: theme.colors.text, padding: 10, minHeight: 42 },
    create: { alignSelf: 'flex-end', backgroundColor: theme.colors.button.primary.background, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
}));

function statusLabel(status: TaskboardTaskStatus) {
    return t(status === 'todo' ? 'taskboard.todo' : status === 'in_progress' ? 'taskboard.inProgress' : status === 'in_review' ? 'taskboard.inReview' : status === 'blocked' ? 'taskboard.blocked' : 'taskboard.done');
}

export const TaskboardView = React.memo(() => {
    const machines = useAllMachines();
    const { theme } = useUnistyles();
    const [tasks, setTasks] = React.useState<TaskboardTask[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [unavailable, setUnavailable] = React.useState(false);
    const [creating, setCreating] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const machine = machines[0];

    const load = React.useCallback(async () => {
        if (!machine) { setLoading(false); return; }
        setLoading(true);
        try {
            setTasks((await taskboardList(machine.id)).tasks);
            setUnavailable(false);
        } catch {
            setUnavailable(true);
        } finally { setLoading(false); }
    }, [machine]);
    React.useEffect(() => { void load(); }, [load]);

    const update = React.useCallback(async (task: TaskboardTask, status: TaskboardTaskStatus) => {
        if (!machine) return;
        try {
            const state = await taskboardUpdate(machine.id, task.id, { status });
            setTasks(state.tasks);
        } catch { setUnavailable(true); }
    }, [machine]);
    const create = React.useCallback(async () => {
        if (!machine || !title.trim()) return;
        setCreating(true);
        try {
            const state = await taskboardCreate(machine.id, title, description);
            setTasks(state.tasks); setTitle(''); setDescription(''); setCreating(false);
        } catch { setCreating(false); }
    }, [machine, title, description]);

    if (loading) return <View style={styles.loading}><ActivityIndicator color={theme.colors.textSecondary} /></View>;
    if (!machine || unavailable) return <View style={styles.empty}><Ionicons name="desktop-outline" size={42} color={theme.colors.textSecondary} /><Text style={styles.emptyTitle}>{t('taskboard.unavailable')}</Text></View>;

    return <View style={styles.container}>
        <FlatList data={tasks} keyExtractor={(item) => item.id} contentContainerStyle={[styles.list, tasks.length === 0 && { flex: 1 }]} onRefresh={load} refreshing={loading}
            ListEmptyComponent={<View style={styles.empty}><Ionicons name="checkbox-outline" size={48} color={theme.colors.textSecondary} /><Text style={styles.emptyTitle}>{t('taskboard.empty')}</Text><Text style={styles.emptyText}>{t('taskboard.emptyDescription')}</Text></View>}
            renderItem={({ item }) => <View style={styles.card}><Text style={styles.title}>{item.title}</Text>{item.description ? <Text style={styles.description}>{item.description}</Text> : null}<View style={styles.row}><Text style={styles.status}>{statusLabel(item.status)}</Text>{item.status === 'todo' ? <Pressable style={styles.action} onPress={() => void update(item, 'in_progress')}><Text style={styles.actionText}>{t('taskboard.claim')}</Text></Pressable> : item.status === 'in_progress' ? <Pressable style={styles.action} onPress={() => void update(item, 'in_review')}><Text style={styles.actionText}>{t('taskboard.review')}</Text></Pressable> : null}</View></View>}
        />
        {creating ? <View style={[styles.composer, { margin: 16 }]}><TextInput value={title} onChangeText={setTitle} placeholder={t('taskboard.taskTitle')} placeholderTextColor={theme.colors.textSecondary} style={styles.input} /><TextInput value={description} onChangeText={setDescription} placeholder={t('taskboard.description')} placeholderTextColor={theme.colors.textSecondary} style={[styles.input, { minHeight: 86 }]} multiline /><Pressable style={styles.create} onPress={() => void create()}><Text style={styles.actionText}>{t('taskboard.create')}</Text></Pressable></View> : <FAB onPress={() => setCreating(true)} />}
    </View>;
});
