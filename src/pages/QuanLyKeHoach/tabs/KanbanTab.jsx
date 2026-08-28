import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AutoComplete,
    Card,
    Empty,
    Input,
    Button,
    Space,
    Tag,
    Typography,
    Tooltip,
    Alert,
    Popover,
    Popconfirm,
    Modal,
    Form,
    Radio,
    DatePicker,
    message,
    Spin,
    Divider,
    Select,
    Tabs
} from 'antd';
import dayjs from 'dayjs';
import {
    Search,
    RefreshCw,
    Plus,
    Users,
    CheckCircle2,
    ListTodo,
    Settings,
    MessageSquare,
    History,
    FileSpreadsheet,
    Lock,
    Unlock,
    GripVertical,
    Clock,
    UserCheck,
    Star,
    Smile,
    Flag,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Check,
    Edit3,
    Trash2
} from 'lucide-react';
import { execCRUD, getCurrentUser } from '../../../services/apiServices';
import SelectNhanVien from '../../../components/DropDown/SelectNhanVien';
import SelectCongViec from '../../../components/DropDown/SelectCongViec';
import styles from '../QuanLyKeHoach.module.css';

const { Text, Title, Paragraph } = Typography;

// ── HELPERS ────────────────────────────────────────────────────────────────
const formatDate = (val, format = 'DD/MM/YYYY') => {
    if (!val || val === '1900-01-01' || val === '1900-01-01 00:00:00' || val === '0000-00-00') return '';
    const d = dayjs(val);
    return d.isValid() ? d.format(format) : val;
};

const getAvatarClass = (userColor) => {
    switch (userColor) {
        case 'luxury-gradient': return styles.luxuryGradient1;
        case 'luxury-gradient-2': return styles.luxuryGradient2;
        case 'luxury-gradient-3': return styles.luxuryGradient3;
        case 'luxury-gradient-4': return styles.luxuryGradient4;
        case 'luxury-gradient-5': return styles.luxuryGradient5;
        default: return styles.defaultAvatar;
    }
};

const getPriorityLabel = (priority) => {
    const p = String(priority);
    if (p === '3') return { label: 'Ưu tiên 2', color: 'volcano' };
    if (p === '2') return { label: 'Ưu tiên 1', color: 'warning' };
    return { label: 'Bình thường', color: 'default' };
};

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const diffMs = new Date() - new Date(dateString);
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'vài giây trước';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} ngày trước`;
    const diffMonth = Math.floor(diffDay / 30);
    return `${diffMonth} tháng trước`;
};

const KanbanTab = ({ detailData, onRefresh }) => {
    const projectId = detailData?.plan?.lv501;
    const planId = detailData?.plan?.lv001;

    // ── STATE ──────────────────────────────────────────────────────────────
    const [boardData, setBoardData] = useState({ users: [], columns: [], evaluation_icons: [] });
    const [currentUser, setCurrentUser] = useState({ id: 'SOF001', name: 'Admin' });
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [currentView, setCurrentView] = useState('kanban'); // 'kanban' | 'gantt'
    const [ganttTimeScale, setGanttTimeScale] = useState('weeks'); // 'days' | 'weeks' | 'months'
    const [ganttWorklogs, setGanttWorklogs] = useState({});

    // Column Pagination State
    const [colPages, setColPages] = useState({});

    const handleNext = useCallback((columnId, totalPages, currentPage) => {
        if (currentPage < totalPages) {
            setColPages(prev => ({ ...prev, [columnId]: currentPage + 1 }));
        }
    }, []);

    const handlePrev = useCallback((columnId, currentPage) => {
        if (currentPage > 1) {
            setColPages(prev => ({ ...prev, [columnId]: currentPage - 1 }));
        }
    }, []);

    // Gantt Year Filter State (default to current year)
    const [ganttYearFilter, setGanttYearFilter] = useState(() => dayjs().year().toString());

    // Color themes for Kanban columns
    const COLUMN_THEMES = useMemo(() => [
        { bg: 'rgba(241, 245, 249, 0.55)', border: 'rgba(203, 213, 225, 0.5)', text: '#334155', badgeBg: 'rgba(203, 213, 225, 0.7)', badgeText: '#1e293b', accent: '#64748b' }, // Slate
        { bg: 'rgba(238, 242, 255, 0.55)', border: 'rgba(199, 210, 254, 0.5)', text: '#4f46e5', badgeBg: 'rgba(199, 210, 254, 0.7)', badgeText: '#3730a3', accent: '#6366f1' }, // Indigo
        { bg: 'rgba(209, 250, 229, 0.45)', border: 'rgba(167, 243, 208, 0.5)', text: '#065f46', badgeBg: 'rgba(167, 243, 208, 0.7)', badgeText: '#064e3b', accent: '#10b981' }, // Emerald
        { bg: 'rgba(254, 243, 199, 0.45)', border: 'rgba(253, 230, 138, 0.5)', text: '#92400e', badgeBg: 'rgba(253, 230, 138, 0.7)', badgeText: '#78350f', accent: '#f59e0b' }, // Amber
        { bg: 'rgba(252, 231, 243, 0.45)', border: 'rgba(251, 207, 232, 0.5)', text: '#9d174d', badgeBg: 'rgba(251, 207, 232, 0.7)', badgeText: '#831843', accent: '#ec4899' }, // Pink
        { bg: 'rgba(204, 251, 241, 0.45)', border: 'rgba(153, 246, 228, 0.5)', text: '#075985', badgeBg: 'rgba(153, 246, 228, 0.7)', badgeText: '#0c4a6e', accent: '#14b8a6' }, // Teal
        { bg: 'rgba(243, 232, 255, 0.45)', border: 'rgba(233, 213, 252, 0.5)', text: '#6b21a8', badgeBg: 'rgba(233, 213, 252, 0.7)', badgeText: '#581c87', accent: '#a855f7' }  // Purple
    ], []);

    // Get all available years dynamically from task dates
    const availableYears = useMemo(() => {
        const yearsSet = new Set();
        yearsSet.add(dayjs().year());

        boardData.columns.forEach(col => {
            (col.tasks || []).forEach(t => {
                if (t.startDate) {
                    const y = dayjs(t.startDate).year();
                    if (!isNaN(y)) yearsSet.add(y);
                }
                if (t.endDate) {
                    const y = dayjs(t.endDate).year();
                    if (!isNaN(y)) yearsSet.add(y);
                }
            });
        });

        return Array.from(yearsSet).sort((a, b) => b - a); // Descending order
    }, [boardData.columns]);

    // Drag and Drop Column state
    const [draggedColumnId, setDraggedColumnId] = useState(null);
    // Drag and Drop Task state
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [draggedTaskSourceColId, setDraggedTaskSourceColId] = useState(null);

    // Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [activeTask, setActiveTask] = useState(null);
    const [detailActiveTab, setDetailActiveTab] = useState('overview');
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Task Creation/Assignment Modal State
    const [taskModalVisible, setTaskModalVisible] = useState(false);
    const [taskModalMode, setTaskModalMode] = useState('create'); // 'create' | 'assign'
    const [taskModalColumnId, setTaskModalColumnId] = useState(null);
    const [taskForm] = Form.useForm();
    const [workTypes, setWorkTypes] = useState([]);
    const [projectTaskItems, setProjectTaskItems] = useState([]);

    // Edit Task Modal State
    const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editTaskForm] = Form.useForm();

    // Column Modal State
    const [columnModalVisible, setColumnModalVisible] = useState(false);
    const [columnActiveTab, setColumnActiveTab] = useState('new'); // 'new' | 'existing'
    const [availableColumns, setAvailableColumns] = useState([]);
    const [columnForm] = Form.useForm();

    // ── FETCH CURRENT USER ──────────────────────────────────────────────────
    useEffect(() => {
        const loadUser = async () => {
            try {
                const res = await getCurrentUser();
                if (res && res.id) {
                    setCurrentUser(res);
                    console.log("Người dùng hiện tại (loadUser):", res);
                }
            } catch (e) {
                console.warn('[KanbanTab] getCurrentUser error:', e.message);
            }
        };
        loadUser();
    }, []);

    // ── FETCH BOARD DATA ────────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        const loadWorkTypes = async () => {
            try {
                const res = await execCRUD('kanban_board', 'get_work_types');
                const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
                if (isMounted) {
                    setWorkTypes(Array.isArray(parsed?.data)
                        ? parsed.data.map((item) => ({ ...item, value: String(item.value) }))
                        : []);
                }
            } catch (e) {
                console.warn('[KanbanTab] get_work_types error:', e);
                if (isMounted) setWorkTypes([]);
            }
        };
        loadWorkTypes();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (!projectId || projectId === '0') {
            setProjectTaskItems([]);
            return;
        }

        let isMounted = true;
        const loadProjectTaskItems = async () => {
            try {
                const res = await execCRUD('kanban_board', 'get_project_task_items', { projectId });
                const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
                if (isMounted) {
                    setProjectTaskItems(Array.isArray(parsed?.data) ? parsed.data : []);
                }
            } catch (e) {
                console.warn('[KanbanTab] get_project_task_items error:', e);
                if (isMounted) setProjectTaskItems([]);
            }
        };
        loadProjectTaskItems();
        return () => { isMounted = false; };
    }, [projectId]);

    const fetchBoard = useCallback(async (showIndicator = true) => {
        if (!projectId || projectId === '0') return;
        if (showIndicator) setLoading(true);
        try {
            const res = await execCRUD('kanban_board', 'get_board', { project_id: projectId });
            const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
            if (parsed) {
                setBoardData({
                    users: parsed.users || [],
                    columns: parsed.columns || [],
                    evaluation_icons: parsed.evaluation_icons || []
                });
            }
        } catch (e) {
            console.error('[KanbanTab] Fetch board error:', e);
            message.error('Không thể tải dữ liệu bảng Kanban');
        } finally {
            if (showIndicator) setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchBoard(true);
    }, [fetchBoard]);

    // ── FETCH WORKLOGS FOR GANTT ─────────────────────────────────────────────
    const fetchGanttWorklogsData = useCallback(async (columnsList) => {
        const tasksList = [];
        (columnsList || []).forEach(col => {
            (col.tasks || []).forEach(t => {
                if (t.startDate && t.endDate) {
                    tasksList.push(t);
                }
            });
        });

        if (tasksList.length === 0) return;

        const logsMap = {};
        await Promise.all(tasksList.map(async (t) => {
            try {
                const res = await execCRUD('kanban_board', 'get_work_log_for_timeline', { taskId: t.id });
                const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
                logsMap[t.id] = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                logsMap[t.id] = [];
            }
        }));
        setGanttWorklogs(logsMap);
    }, []);

    useEffect(() => {
        if (currentView === 'gantt' && boardData.columns.length > 0) {
            fetchGanttWorklogsData(boardData.columns);
        }
    }, [currentView, boardData.columns, fetchGanttWorklogsData]);

    // ── FETCH COMMENTS ──────────────────────────────────────────────────────
    const fetchComments = async (taskId) => {
        setCommentsLoading(true);
        try {
            const res = await execCRUD('kanban_board', 'get_comments', { taskId });
            const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
            setComments(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
            console.warn('[KanbanTab] Fetch comments error:', e);
        } finally {
            setCommentsLoading(false);
        }
    };

    // ── DRAG AND DROP COLUMN ─────────────────────────────────────────────────
    const handleColumnDragStart = (columnId) => {
        setDraggedColumnId(columnId);
    };

    const handleColumnDrop = async (targetColumnId) => {
        if (!draggedColumnId || draggedColumnId === targetColumnId) return;

        const activeCols = [...boardData.columns];
        const dragIndex = activeCols.findIndex(c => c.id === draggedColumnId);
        const dropIndex = activeCols.findIndex(c => c.id === targetColumnId);

        if (dragIndex === -1 || dropIndex === -1) return;

        // Reorder local state immediately
        const [removed] = activeCols.splice(dragIndex, 1);
        activeCols.splice(dropIndex, 0, removed);

        setBoardData(prev => ({ ...prev, columns: activeCols }));
        setDraggedColumnId(null);

        // Sync to Server
        try {
            const orderedIds = activeCols.map(c => c.id);
            await execCRUD('kanban_board', 'update_column_order', { order: orderedIds, projectId: projectId });
            message.success('Đã cập nhật thứ tự các giai đoạn');
        } catch (e) {
            console.error('Update column order failed:', e);
            message.error('Không thể lưu thứ tự giai đoạn');
            fetchBoard(false);
        }
    };

    // ── DRAG AND DROP TASK ───────────────────────────────────────────────────
    const handleTaskDragStart = (taskId, sourceColId) => {
        setDraggedTaskId(taskId);
        setDraggedTaskSourceColId(sourceColId);
    };

    const handleTaskDrop = async (targetColId) => {
        if (!draggedTaskId || !draggedTaskSourceColId || draggedTaskSourceColId === targetColId) return;

        const sourceCol = boardData.columns.find(c => c.id === draggedTaskSourceColId);
        const targetCol = boardData.columns.find(c => c.id === targetColId);
        if (!sourceCol || !targetCol) return;

        const taskIndex = sourceCol.tasks.findIndex(t => t.id === draggedTaskId);
        if (taskIndex === -1) return;

        // Check if task is fully completed (cannot drag)
        const task = sourceCol.tasks[taskIndex];
        const total = parseInt(task.total_dept_count, 10) || 0;
        const completed = parseInt(task.completed_dept_count, 10) || 0;
        if (total > 0 && completed === total) {
            message.warning('Công việc đã hoàn thành toàn bộ, không thể di chuyển.');
            return;
        }

        // Reorder locally
        const [movedTask] = sourceCol.tasks.splice(taskIndex, 1);
        movedTask.columnId = targetColId;
        targetCol.tasks.push(movedTask);

        setBoardData({ ...boardData });

        const prevDraggedTaskId = draggedTaskId;
        const prevDraggedTaskSourceColId = draggedTaskSourceColId;

        setDraggedTaskId(null);
        setDraggedTaskSourceColId(null);

        // API Call
        try {
            await execCRUD('kanban_board', 'move_task', {
                taskId: prevDraggedTaskId,
                kanbanTaskId: movedTask.kanban_task_id || '',
                newColumnId: targetColId,
                projectId: projectId
            });
            message.success(`Đã di chuyển công việc sang "${targetCol.title}"`);
            fetchBoard(false);
        } catch (e) {
            console.error('Move task failed:', e);
            message.error('Không thể cập nhật cột công việc');
            fetchBoard(false);
        }
    };

    // ── INLINE USER ASSIGNMENT ────────────────────────────────────────────────
    const handleAssignUser = async (taskId, userCode) => {
        try {
            await execCRUD('kanban_board', 'assign_user', { taskId, newUserId: userCode });
            message.success('Đã cập nhật người chịu trách nhiệm');
            fetchBoard(false);
        } catch (e) {
            message.error('Giao việc thất bại');
        }
    };

    // ── QUALITY EVALUATION ICON TOGGLE ────────────────────────────────────────
    const handleToggleEvaluation = async (task, iconStatus) => {
        const currentStatus = task.evaluation_status;
        const nextStatus = currentStatus === iconStatus ? 'none' : iconStatus;

        // Optimistic UI update
        task.evaluation_status = nextStatus;
        setBoardData({ ...boardData });

        try {
            await execCRUD('kanban_board', 'set_evaluation', { taskId: task.id, status: nextStatus });
        } catch (e) {
            message.error('Lưu đánh giá thất bại');
            fetchBoard(false);
        }
    };

    // ── ADD COLUMN (MODAL) ────────────────────────────────────────────────────
    const openColumnModal = async () => {
        setColumnModalVisible(true);
        setColumnActiveTab('new');
        columnForm.resetFields();

        try {
            const res = await execCRUD('kanban_board', 'get_available_columns', { projectId });
            const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
            setAvailableColumns(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
            console.warn('[KanbanTab] get_available_columns error:', e);
        }
    };

    const handleCreateColumn = async (values) => {
        try {
            if (columnActiveTab === 'new') {
                const res = await execCRUD('kanban_board', 'create_column', {
                    name: values.name.trim(),
                    userId: currentUser?.id || 'SOF001'
                });
                const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
                if (parsed?.success) {
                    message.success(parsed.message || 'Tạo giai đoạn mới thành công');
                    // Add newly created column link to project
                    if (parsed.newId) {
                        await execCRUD('kanban_board', 'add_existing_column', {
                            projectId,
                            stageId: parsed.newId
                        });
                    }
                }
            } else {
                await execCRUD('kanban_board', 'add_existing_column', {
                    projectId,
                    stageId: values.existingColumnId
                });
                message.success('Thêm giai đoạn thành công');
            }
            setColumnModalVisible(false);
            fetchBoard(true);
        } catch (e) {
            message.error('Thực hiện thất bại');
        }
    };

    // ── CREATE OR ASSIGN TASK (MODAL) ─────────────────────────────────────────
    const parseMutationResult = (res) => {
        const parsed = typeof res === 'string' ? JSON.parse(res.trim()) : res;
        if (!parsed || parsed.success === false) {
            throw new Error(parsed?.message || 'Máy chủ không thể lưu thay đổi.');
        }
        return parsed;
    };

    const handleTaskCodeSelect = (taskCode) => {
        const selectedItem = projectTaskItems.find((item) => item.value === taskCode);
        if (!selectedItem) return;

        taskForm.setFieldsValue({
            taskCode: selectedItem.value,
            title: selectedItem.title || '',
            description: selectedItem.description || '',
            columnId: selectedItem.columnId || undefined,
            priority: selectedItem.priority ? String(selectedItem.priority) : '2',
            dateRange: selectedItem.startDate && selectedItem.endDate
                ? [dayjs(selectedItem.startDate), dayjs(selectedItem.endDate)]
                : undefined
        });
    };

    const openTaskModal = (colId, mode) => {
        setTaskModalColumnId(colId);
        setTaskModalMode(mode);
        setTaskModalVisible(true);
        taskForm.resetFields();
        taskForm.setFieldsValue({
            columnId: colId,
            priority: '2'
        });
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setEditTaskModalVisible(true);
        editTaskForm.resetFields();
        editTaskForm.setFieldsValue({
            taskCode: task.taskId || '',
            lv049: String(task.lv049 ?? task.workType ?? '') || undefined,
            title: task.title || '',
            description: task.description || '',
            columnId: task.columnId,
            assigneeId: task.assigneeId || undefined,
            supporterId: task.supporterId || undefined,
            managerId: task.managerId || undefined,
            priority: task.priority ? String(task.priority) : '2',
            dateRange: [
                task.startDate ? dayjs(task.startDate) : null,
                task.endDate ? dayjs(task.endDate) : null
            ].filter(Boolean).length === 2
                ? [dayjs(task.startDate), dayjs(task.endDate)]
                : undefined
        });
    };

    const handleEditTaskSubmit = async (values) => {
        if (!editingTask) return;
        try {
            const payload = {
                taskId: editingTask.id,
                lv049: String(values.lv049 ?? '').trim(),
                title: values.title.trim(),
                description: values.description?.trim() || '',
                columnId: values.columnId,
                assigneeId: values.assigneeId || null,
                supporterId: values.supporterId || null,
                managerId: values.managerId || null,
                priority: parseInt(values.priority, 10),
                startDate: values.dateRange?.[0] ? values.dateRange[0].format('YYYY-MM-DD HH:mm:ss') : null,
                endDate: values.dateRange?.[1] ? values.dateRange[1].format('YYYY-MM-DD HH:mm:ss') : null,
                projectId: projectId,
                planId: planId,
                userId: currentUser?.id || ''
            };
            parseMutationResult(await execCRUD('kanban_board', 'update_task', payload));
            message.success('Cập nhật công việc thành công');
            setEditTaskModalVisible(false);
            setEditingTask(null);
            fetchBoard(true);
        } catch (e) {
            message.error(e.message || 'Cập nhật công việc thất bại');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            parseMutationResult(await execCRUD('kanban_board', 'delete_task', {
                taskId,
                projectId,
                planId,
                userId: currentUser?.id || ''
            }));
            message.success('Đã xóa phân công công việc');
            fetchBoard(true);
        } catch (e) {
            message.error(e.message || 'Xóa công việc thất bại');
        }
    };

    const handleCreateOrAssignTaskSubmit = async (values) => {
        try {
            const payload = {
                taskCode: values.taskCode.trim(),
                lv049: String(values.lv049 ?? '').trim(),
                title: values.title.trim(),
                description: values.description?.trim() || '',
                columnId: values.columnId,
                assigneeId: values.assigneeId || null,
                supporterId: values.supporterId || null,
                managerId: values.managerId || null,
                priority: parseInt(values.priority, 10),
                startDate: values.dateRange?.[0] ? values.dateRange[0].format('YYYY-MM-DD HH:mm:ss') : null,
                endDate: values.dateRange?.[1] ? values.dateRange[1].format('YYYY-MM-DD HH:mm:ss') : null,
                projectId: projectId,
                planId: planId,
                userId: currentUser?.id || ''
            };

            parseMutationResult(await execCRUD('kanban_board', 'create_task', payload));
            message.success(taskModalMode === 'create' ? 'Tạo công việc thành công' : 'Giao việc thành công');
            setTaskModalVisible(false);
            fetchBoard(true);
        } catch (e) {
            message.error(e.message || 'Lưu công việc thất bại');
        }
    };

    // ── COMMENTS MANAGEMENT ──────────────────────────────────────────────────
    const handlePostComment = async () => {
        const text = newCommentText.trim();
        if (!text || !activeTask) return;

        setPostingComment(true);
        try {
            await execCRUD('kanban_board', 'post_comment', {
                taskId: activeTask.id,
                userId: currentUser?.id || 'SOF001',
                commentText: text

            });
            console.log("Người dùng hiện tại (post_comment):", currentUser);
            setNewCommentText('');
            message.success('Đã đăng bình luận');
            fetchComments(activeTask.id);
        } catch (e) {
            message.error('Lỗi khi gửi bình luận');
        } finally {
            setPostingComment(false);
        }
    };

    // ── FILTER TASKS BY SEARCH ───────────────────────────────────────────────
    const filteredColumns = useMemo(() => {
        const kw = searchText.trim().toLowerCase();
        if (!kw) return boardData.columns;

        return boardData.columns.map(col => {
            const filteredTasks = (col.tasks || []).filter(task => {
                const assignee = boardData.users.find(u => u.id === task.assigneeId) || {};
                return (
                    String(task.title || '').toLowerCase().includes(kw) ||
                    String(task.taskId || '').toLowerCase().includes(kw) ||
                    String(assignee.name || '').toLowerCase().includes(kw)
                );
            });
            return { ...col, tasks: filteredTasks };
        });
    }, [boardData.columns, boardData.users, searchText]);

    // ── GANTT CHART MATRIX RENDER ───────────────────────────────────────────
    const ganttMatrix = useMemo(() => {
        if (currentView !== 'gantt') return null;

        let allGanttTasks = [];
        boardData.columns.forEach(col => {
            (col.tasks || []).forEach(t => {
                if (t.startDate && t.endDate) {
                    const startYear = dayjs(t.startDate).year();
                    const endYear = dayjs(t.endDate).year();
                    const filterYr = ganttYearFilter !== 'all' ? parseInt(ganttYearFilter, 10) : null;

                    if (!filterYr || (startYear <= filterYr && endYear >= filterYr)) {
                        allGanttTasks.push({
                            ...t,
                            columnName: col.title,
                        });
                    }
                }
            });
        });

        if (allGanttTasks.length === 0) return { tasks: [], timeline: [] };

        allGanttTasks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        let minDate, maxDate;
        if (ganttYearFilter === 'all') {
            const dates = allGanttTasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
            minDate = new Date(Math.min(...dates));
            maxDate = new Date(Math.max(...dates));
        } else {
            const yr = parseInt(ganttYearFilter, 10);
            minDate = new Date(yr, 0, 1);
            maxDate = new Date(yr, 11, 31);
        }

        // Generate timeline headers
        const timeline = [];
        let current = new Date(minDate);
        let idx = 0;

        const totalDays = Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
        let finalScale = ganttTimeScale;
        if (finalScale === 'days' && totalDays > 31) {
            finalScale = 'weeks';
        }

        if (finalScale === 'days') {
            while (current <= maxDate) {
                timeline.push({
                    date: new Date(current),
                    width: 65,
                    label: dayjs(current).format('DD/MM'),
                    subLabel: dayjs(current).format('YYYY'),
                    idx: idx++
                });
                current.setDate(current.getDate() + 1);
            }
        } else if (finalScale === 'weeks') {
            // Monday start
            current.setDate(current.getDate() - (current.getDay() || 7) + 1);
            while (current <= maxDate) {
                timeline.push({
                    date: new Date(current),
                    width: 100,
                    label: `Tuần ${dayjs(current).week()}`,
                    subLabel: dayjs(current).format('YYYY'),
                    idx: idx++
                });
                current.setDate(current.getDate() + 7);
            }
        } else {
            // Months
            current.setDate(1);
            while (current <= maxDate) {
                timeline.push({
                    date: new Date(current),
                    width: 150,
                    label: dayjs(current).format('MM/YYYY'),
                    idx: idx++
                });
                current.setMonth(current.getMonth() + 1);
            }
        }

        return { tasks: allGanttTasks, timeline, minDate, maxDate };
    }, [currentView, boardData.columns, ganttTimeScale, ganttYearFilter]);

    // ── DISPLAY RENDER ──────────────────────────────────────────────────────
    if (!projectId || projectId === '0') {
        return (
            <Card style={{ margin: '16px 0', borderRadius: 12 }}>
                <Alert
                    message="Kế hoạch chưa liên kết dự án"
                    description={
                        <div>
                            <Paragraph>Kanban yêu cầu kế hoạch này phải liên kết với một dự án trong cơ sở dữ liệu.</Paragraph>
                            <Paragraph>Vui lòng cập nhật trường <b>Dự án (lv501)</b> của kế hoạch này trước khi tiếp tục.</Paragraph>
                        </div>
                    }
                    type="warning"
                    showIcon
                />
            </Card>
        );
    }

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>

            {/* ACTION TOOLBAR */}
            <div className={styles.toolbarRow}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap size={16}>
                        {/* View toggle group */}
                        <div className={styles.viewToggleGroup}>
                            <Button
                                className={`${styles.viewToggleBtn} ${currentView === 'kanban' ? styles.viewToggleBtnActive : ''}`}
                                onClick={() => setCurrentView('kanban')}
                            >
                                <ListTodo size={15} style={{ marginRight: 6 }} />
                                Bảng Kanban
                            </Button>
                            <Button
                                className={`${styles.viewToggleBtn} ${currentView === 'gantt' ? styles.viewToggleBtnActive : ''}`}
                                onClick={() => setCurrentView('gantt')}
                            >
                                <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
                                Biểu đồ Gantt
                            </Button>
                        </div>

                        {currentView === 'gantt' && (
                            <Space size={8}>
                                <Select
                                    value={ganttYearFilter}
                                    onChange={setGanttYearFilter}
                                    style={{ width: 140 }}
                                    placeholder="Chọn năm"
                                >
                                    {availableYears.map(yr => (
                                        <Select.Option key={yr} value={yr.toString()}>{`Năm ${yr}`}</Select.Option>
                                    ))}
                                    <Select.Option value="all">Tất cả các năm</Select.Option>
                                </Select>
                                <Radio.Group
                                    value={ganttTimeScale}
                                    onChange={(e) => setGanttTimeScale(e.target.value)}
                                    optionType="button"
                                    buttonStyle="solid"
                                    size="small"
                                >
                                    <Radio.Button value="days">Ngày</Radio.Button>
                                    <Radio.Button value="weeks">Tuần</Radio.Button>
                                    <Radio.Button value="months">Tháng</Radio.Button>
                                </Radio.Group>
                            </Space>
                        )}
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                            {boardData.columns.reduce((acc, col) => acc + (col.tasks?.length || 0), 0)} công việc
                        </Text>
                    </Space>
                    <Space wrap>
                        <Input
                            allowClear
                            prefix={<Search size={15} style={{ color: '#94a3b8' }} />}
                            placeholder="Tìm kiếm công việc, mã hoặc nhân viên..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 280, borderRadius: 8 }}
                        />
                        <Button
                            icon={<RefreshCw size={14} />}
                            onClick={() => fetchBoard(true)}
                            loading={loading}
                            style={{ borderRadius: 8 }}
                        >
                            Tải lại
                        </Button>
                    </Space>
                </Space>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 80 }}>
                    <Spin size="large" tip="Đang nạp bảng công việc..." />
                </div>
            ) : (
                <>
                    {/* KANBAN BOARD VIEW */}
                    {currentView === 'kanban' && (
                        <div className={styles.kanbanBoardContainer}>
                            <div className={styles.kanbanBoard}>
                                {filteredColumns.map((column, colIdx) => {
                                    // Check if all tasks in column are completed
                                    const hasTasks = column.tasks && column.tasks.length > 0;
                                    const allCompleted = hasTasks && column.tasks.every(t => {
                                        const total = parseInt(t.total_dept_count, 10) || 0;
                                        const completed = parseInt(t.completed_dept_count, 10) || 0;
                                        return total > 0 && completed === total;
                                    });

                                    // Dynamic styling theme for the column
                                    const colTheme = allCompleted
                                        ? { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b', badgeBg: '#cbd5e1', badgeText: '#475569', accent: '#94a3b8' }
                                        : COLUMN_THEMES[(colIdx + 1) % COLUMN_THEMES.length];

                                    // Calculate pagination for this column
                                    const totalTasks = column.tasks?.length || 0;
                                    const totalPages = Math.ceil(totalTasks / 5) || 1;
                                    const currentPage = colPages[column.id] || 1;
                                    const activePage = Math.min(currentPage, totalPages);
                                    const paginatedTasks = column.tasks?.slice((activePage - 1) * 5, activePage * 5) || [];

                                    return (
                                        <div
                                            className={`${styles.kanbanColumn} ${allCompleted ? styles.kanbanColumnCompleted : ''}`}
                                            key={column.id}
                                            draggable
                                            onDragStart={() => handleColumnDragStart(column.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleColumnDrop(column.id)}
                                            style={{
                                                backgroundColor: colTheme.bg,
                                                borderColor: colTheme.border,
                                                borderTopColor: colTheme.accent
                                            }}
                                        >
                                            <div className={styles.kanbanColumnHeader} style={{ borderBottomColor: colTheme.border }}>
                                                <Space size={6}>
                                                    <div className={styles.columnDragHandle} style={{ color: colTheme.accent }}>
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <Text strong style={{ fontSize: 13, color: colTheme.text, textTransform: 'uppercase' }}>
                                                        {column.title}
                                                    </Text>
                                                </Space>
                                                <Tag style={{ borderRadius: 10, fontWeight: 700, border: 'none', backgroundColor: colTheme.badgeBg, color: colTheme.badgeText }}>
                                                    {totalTasks}
                                                </Tag>
                                            </div>

                                            <div
                                                className={styles.columnDropZone}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    e.stopPropagation();
                                                    handleTaskDrop(column.id);
                                                }}
                                            >
                                                <div className={styles.tasksContainer}>
                                                    {paginatedTasks.map((task) => {
                                                        const assignee = boardData.users.find(u => u.id === task.assigneeId) || {
                                                            id: task.assigneeId,
                                                            name: task.assigneeId ? `Mã: ${task.assigneeId}` : 'Chưa gán',
                                                            initials: '?',
                                                            color: 'default'
                                                        };

                                                        // Completion status
                                                        const total = parseInt(task.total_dept_count, 10) || 0;
                                                        const completed = parseInt(task.completed_dept_count, 10) || 0;
                                                        const isFullyCompleted = total > 0 && completed === total;
                                                        const isPartiallyCompleted = total > 1 && completed > 0 && completed < total;

                                                        // Avatar content with inline popover
                                                        const avatarContent = (
                                                            <Tooltip title={assignee.name}>
                                                                <div className={`${styles.userAvatar} ${getAvatarClass(assignee.color)}`}>
                                                                    {assignee.initials}
                                                                </div>
                                                            </Tooltip>
                                                        );

                                                        const isCardDraggable = !isFullyCompleted;

                                                        return (
                                                            <Card
                                                                key={task.id}
                                                                size="small"
                                                                className={`${styles.kanbanCard} ${isFullyCompleted ? styles.kanbanCardCompleted : ''}`}
                                                                draggable={isCardDraggable}
                                                                onDragStart={() => handleTaskDragStart(task.id, column.id)}
                                                            >
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className={styles.kanbanCardInner}>

                                                                    {/* Edit/Delete action buttons — visible on hover */}
                                                                    {!isFullyCompleted && (
                                                                        <div className={styles.cardActions}>
                                                                            <Tooltip title="Sửa công việc">
                                                                                <button
                                                                                    className={styles.cardActionBtn}
                                                                                    onClick={(e) => { e.stopPropagation(); openEditModal({ ...task, columnId: column.id }); }}
                                                                                >
                                                                                    <Edit3 size={13} />
                                                                                </button>
                                                                            </Tooltip>
                                                                            <Popconfirm
                                                                                title="Xóa công việc này?"
                                                                                description="Hành động này không thể hoàn tác."
                                                                                okText="Xóa"
                                                                                cancelText="Hủy"
                                                                                okButtonProps={{ danger: true }}
                                                                                onConfirm={(e) => { e?.stopPropagation(); handleDeleteTask(task.id); }}
                                                                            >
                                                                                <button
                                                                                    className={`${styles.cardActionBtn} ${styles.cardActionBtnDelete}`}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            </Popconfirm>
                                                                        </div>
                                                                    )}

                                                                    {/* Status & Priority indicators */}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Space size={6}>
                                                                            <Text
                                                                                className={styles.detailLink}
                                                                                onClick={() => {
                                                                                    setActiveTask({ ...task, columnName: column.title });
                                                                                    setDetailActiveTab('overview');
                                                                                    setDetailModalVisible(true);
                                                                                    fetchComments(task.id);
                                                                                }}
                                                                                style={{ fontSize: 12, fontWeight: 700 }}
                                                                            >
                                                                                {task.taskId}
                                                                            </Text>
                                                                            {task.priority && (
                                                                                <Tag color={getPriorityLabel(task.priority).color} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                                                                                    {getPriorityLabel(task.priority).label}
                                                                                </Tag>
                                                                            )}
                                                                            {task.workTypeLabel && (
                                                                                <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                                                                                    {task.workTypeLabel}
                                                                                </Tag>
                                                                            )}
                                                                        </Space>

                                                                        {isFullyCompleted && (
                                                                            <Tooltip title={`Đã hoàn thành bởi tất cả ${total} phòng ban`}>
                                                                                <CheckCircle2 size={16} style={{ color: '#52c41a' }} />
                                                                            </Tooltip>
                                                                        )}
                                                                        {isPartiallyCompleted && (
                                                                            <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                                                                                {completed}/{total} xong
                                                                            </Tag>
                                                                        )}
                                                                    </div>

                                                                    <Text strong style={{ fontSize: 13.5, color: '#1e293b', cursor: 'pointer' }} onClick={() => {
                                                                        setActiveTask({ ...task, columnName: column.title });
                                                                        setDetailActiveTab('overview');
                                                                        setDetailModalVisible(true);
                                                                        fetchComments(task.id);
                                                                    }}>
                                                                        {task.title}
                                                                    </Text>

                                                                    {task.description && (
                                                                        <Text type="secondary" style={{ fontSize: 11.5, color: '#64748b' }} ellipsis={{ tooltip: task.description }}>
                                                                            {task.description}
                                                                        </Text>
                                                                    )}

                                                                    {(task.startDate || task.endDate) && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 10.5 }}>
                                                                            <Calendar size={12} />
                                                                            <span>{task.startDate ? formatDate(task.startDate, 'DD/MM/YYYY HH:mm') : '—'}</span>
                                                                            <span>→</span>
                                                                            <span>{task.endDate ? formatDate(task.endDate, 'DD/MM/YYYY HH:mm') : '—'}</span>
                                                                        </div>
                                                                    )}

                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                                        {/* Evaluation Icons */}
                                                                        <div className={styles.evaluationIcons}>
                                                                            {boardData.evaluation_icons.map((opt) => {
                                                                                const isActive = task.evaluation_status === opt.status;

                                                                                let LucideIcon = Star;
                                                                                if (opt.icon.includes('smile')) LucideIcon = Smile;
                                                                                else if (opt.icon.includes('flag')) LucideIcon = Flag;

                                                                                return (
                                                                                    <Tooltip key={opt.status} title={opt.text}>
                                                                                        <LucideIcon
                                                                                            size={14}
                                                                                            onClick={() => {
                                                                                                if (!isFullyCompleted) handleToggleEvaluation(task, opt.status);
                                                                                            }}
                                                                                            style={{ color: opt.color || '#94a3b8', cursor: isFullyCompleted ? 'not-allowed' : 'pointer' }}
                                                                                            className={`${styles.evaluationIcon} ${isActive ? styles.evaluationIconActive : ''}`}
                                                                                        />
                                                                                    </Tooltip>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Assignee select popover */}
                                                                        {isFullyCompleted ? (
                                                                            avatarContent
                                                                        ) : (
                                                                            <Popover
                                                                                trigger="click"
                                                                                placement="bottomRight"
                                                                                content={
                                                                                    <div style={{ minWidth: 200, padding: '4px 0' }}>
                                                                                        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                                                                            Gán công việc cho:
                                                                                        </Text>
                                                                                        <SelectNhanVien
                                                                                            style={{ width: '100%' }}
                                                                                            value={task.assigneeId}
                                                                                            onChange={(val) => handleAssignUser(task.id, val)}
                                                                                        />
                                                                                    </div>
                                                                                }
                                                                            >
                                                                                {avatarContent}
                                                                            </Popover>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        );
                                                    })}

                                                    {/* Liquid Navigation Buttons (Absolute Positioned inside tasksContainer) */}
                                                    {totalPages > 1 && (
                                                        <>
                                                            <button
                                                                className={`${styles.liquidNavBtn} ${styles.liquidNavBtnPrev}`}
                                                                disabled={activePage === 1}
                                                                onClick={() => handlePrev(column.id, activePage)}
                                                                title="Trang trước"
                                                            >
                                                                <span className={styles.blob}></span>
                                                                <ChevronLeft className={styles.btnIcon} size={20} />
                                                            </button>
                                                            <button
                                                                className={`${styles.liquidNavBtn} ${styles.liquidNavBtnNext}`}
                                                                disabled={activePage === totalPages}
                                                                onClick={() => handleNext(column.id, totalPages, activePage)}
                                                                title="Trang sau"
                                                            >
                                                                <span className={styles.blob}></span>
                                                                <ChevronRight className={styles.btnIcon} size={20} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Column Pagination Controls (Info Text Only) */}
                                                {totalPages > 1 && (
                                                    <div className={styles.columnPagination}>
                                                        <Text className={styles.paginationText}>
                                                            Trang {activePage}/{totalPages}
                                                        </Text>
                                                    </div>
                                                )}

                                                {/* Column Add Task buttons */}
                                                {!allCompleted && (
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                        <Button
                                                            size="small"
                                                            type="dashed"
                                                            icon={<Plus size={12} />}
                                                            style={{ flex: 1, fontSize: 11, borderRadius: 8 }}
                                                            onClick={() => openTaskModal(column.id, 'create')}
                                                        >
                                                            Tạo CV
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            type="dashed"
                                                            icon={<UserCheck size={12} />}
                                                            style={{ flex: 1, fontSize: 11, borderRadius: 8 }}
                                                            onClick={() => openTaskModal(column.id, 'assign')}
                                                        >
                                                            Giao việc
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Column/Phase Button */}
                                <div style={{ width: 290, flexShrink: 0 }}>
                                    <Button
                                        type="dashed"
                                        block
                                        style={{
                                            height: 48,
                                            borderRadius: 16,
                                            border: '2px dashed #cbd5e1',
                                            fontWeight: 600,
                                            fontSize: 14,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            color: '#64748b'
                                        }}
                                        onClick={openColumnModal}
                                    >
                                        <Plus size={18} />
                                        Thêm giai đoạn
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GANTT CHART VIEW */}
                    {currentView === 'gantt' && ganttMatrix && (
                        <div className={styles.ganttContainer}>
                            {ganttMatrix.tasks.length === 0 ? (
                                <Empty description="Không có công việc nào trùng khớp với bộ lọc thời gian để vẽ biểu đồ Gantt" style={{ padding: 40 }} />
                            ) : (
                                <div className={styles.ganttScroll}>
                                    {/* Timeline Header Row */}
                                    <div className={styles.ganttHeaderRow}>
                                        <div className={styles.ganttTaskColumn} style={{ fontWeight: 700 }}>
                                            Giai đoạn / Công việc
                                        </div>
                                        <div className={styles.ganttTimelineHeader}>
                                            {ganttMatrix.timeline.map((period, i) => (
                                                <div key={i} className={styles.ganttPeriod} style={{ width: period.width }}>
                                                    <span>{period.label}</span>
                                                    {period.subLabel && <span style={{ fontSize: 9, opacity: 0.6 }}>{period.subLabel}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Group Tasks by column */}
                                    {boardData.columns.map(col => {
                                        // Filter tasks shown in Gantt by the selected year filter
                                        const colTasks = (col.tasks || []).filter(t => {
                                            if (!t.startDate || !t.endDate) return false;
                                            if (ganttYearFilter === 'all') return true;
                                            const startYear = dayjs(t.startDate).year();
                                            const endYear = dayjs(t.endDate).year();
                                            const filterYr = parseInt(ganttYearFilter, 10);
                                            return startYear <= filterYr && endYear >= filterYr;
                                        });

                                        if (colTasks.length === 0) return null;

                                        return (
                                            <React.Fragment key={col.id}>
                                                {/* Phase separator row */}
                                                <div className={styles.ganttPhaseRow}>
                                                    <div className={styles.ganttTaskColumn} style={{ background: '#f8fafc', fontWeight: 700, borderBottom: '1px solid #cbd5e1' }}>
                                                        {col.title}
                                                    </div>
                                                    <div className={styles.ganttTimelineRow} style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }} />
                                                </div>

                                                {/* Task bars rows */}
                                                {colTasks.map(task => {
                                                    const s = new Date(task.startDate);
                                                    const e = new Date(task.endDate);

                                                    // Clamp display start/end relative to the timeline boundaries (minDate, maxDate)
                                                    const displayStart = (ganttMatrix.minDate && s < ganttMatrix.minDate) ? ganttMatrix.minDate : s;
                                                    const displayEnd = (ganttMatrix.maxDate && e > ganttMatrix.maxDate) ? ganttMatrix.maxDate : e;

                                                    // Find position of start date and end date
                                                    let startIdx = 0;
                                                    let endIdx = 0;

                                                    for (let i = 0; i < ganttMatrix.timeline.length; i++) {
                                                        if (displayStart >= ganttMatrix.timeline[i].date) startIdx = i;
                                                        if (displayEnd >= ganttMatrix.timeline[i].date) endIdx = i;
                                                    }

                                                    const left = ganttMatrix.timeline.slice(0, startIdx).reduce((sum, t) => sum + t.width, 0);
                                                    const width = ganttMatrix.timeline.slice(startIdx, endIdx + 1).reduce((sum, t) => sum + t.width, 0);

                                                    const total = parseInt(task.total_dept_count, 10) || 0;
                                                    const completed = parseInt(task.completed_dept_count, 10) || 0;
                                                    const isFullyCompleted = total > 0 && completed === total;

                                                    // Find Assignee details
                                                    const assignee = boardData.users.find(u => u.id === task.assigneeId) || {
                                                        id: task.assigneeId,
                                                        name: task.assigneeId ? `Mã: ${task.assigneeId}` : 'Chưa gán',
                                                        initials: '?',
                                                        color: 'default'
                                                    };

                                                    // Calculate progress bar from worklogs
                                                    const logs = ganttWorklogs[task.id] || [];
                                                    let worklogBar = null;

                                                    if (logs.length > 0) {
                                                        const worklogEndDate = new Date(logs[0].execution_datetime);
                                                        const displayWorklogEnd = (ganttMatrix.maxDate && worklogEndDate > ganttMatrix.maxDate) ? ganttMatrix.maxDate : worklogEndDate;

                                                        let worklogEndIdx = startIdx;
                                                        for (let i = 0; i < ganttMatrix.timeline.length; i++) {
                                                            if (displayWorklogEnd >= ganttMatrix.timeline[i].date) worklogEndIdx = i;
                                                        }
                                                        const progressWidth = ganttMatrix.timeline.slice(startIdx, worklogEndIdx + 1).reduce((sum, t) => sum + t.width, 0);
                                                        const progressColor = isFullyCompleted ? '#52c41a' : '#faad14';

                                                        worklogBar = (
                                                            <div
                                                                className={styles.ganttActualBar}
                                                                style={{
                                                                    left: `${left}px`,
                                                                    width: `${Math.max(progressWidth, 12)}px`,
                                                                    background: progressColor
                                                                }}
                                                                title={`Tiến trình thực tế: ${formatDate(task.startDate)} - ${formatDate(worklogEndDate)}`}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <div key={task.id} className={styles.ganttTaskRow}>
                                                            <div className={styles.ganttTaskColumn}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div className={`${styles.userAvatar} ${getAvatarClass(assignee.color)}`} style={{ width: 24, height: 24, minWidth: 24, fontSize: 9, border: '1px solid #e2e8f0', cursor: 'default' }}>
                                                                        {assignee.initials}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                                        <Text strong style={{ fontSize: 12, color: '#1e293b' }} ellipsis={{ tooltip: task.title }}>
                                                                            {task.title}
                                                                        </Text>
                                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                                            {formatDate(task.startDate)} - {formatDate(task.endDate)}
                                                                        </Text>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={styles.ganttTimelineRow}>
                                                                {/* Plan background bar */}
                                                                <div
                                                                    className={styles.ganttTaskBar}
                                                                    style={{
                                                                        left: `${left}px`,
                                                                        width: `${Math.max(width, 24)}px`
                                                                    }}
                                                                />

                                                                {/* Worklog actual progress bar */}
                                                                {worklogBar}

                                                                <span className={styles.ganttTaskLabel} style={{ left: `${left + Math.max(width, 24) + 8}px` }}>
                                                                    {isFullyCompleted ? '✓ Đã xong' : `${completed}/${total} pb`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* TASK DETAIL & COMMENT MODAL */}
            <Modal
                title={
                    <Space size={8}>
                        <Tag color="blue">{activeTask?.taskId}</Tag>
                        <span>{activeTask?.title}</span>
                    </Space>
                }
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={800}
                bodyStyle={{ padding: '12px 0' }}
            >
                <Tabs
                    activeKey={detailActiveTab}
                    onChange={setDetailActiveTab}
                    tabBarStyle={{ paddingLeft: 24 }}
                    items={[
                        {
                            key: 'overview',
                            label: (
                                <Space>
                                    <Clock size={14} />
                                    <span>Tổng hợp</span>
                                </Space>
                            ),
                            children: (
                                <div style={{ padding: '0 24px' }}>
                                    <Divider style={{ margin: '12px 0' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <Text type="secondary">Giai đoạn:</Text>
                                            <Paragraph strong>{activeTask?.columnName}</Paragraph>
                                        </div>
                                        <div>
                                            <Text type="secondary">Độ ưu tiên:</Text>
                                            <Paragraph>
                                                {activeTask && (
                                                    <Tag color={getPriorityLabel(activeTask.priority).color}>
                                                        {getPriorityLabel(activeTask.priority).label}
                                                    </Tag>
                                                )}
                                            </Paragraph>
                                        </div>
                                        <div>
                                            <Text type="secondary">Loại công việc:</Text>
                                            <Paragraph strong>{activeTask?.workTypeLabel || '—'}</Paragraph>
                                        </div>
                                        <div>
                                            <Text type="secondary">Ngày bắt đầu:</Text>
                                            <Paragraph strong>{activeTask?.startDate ? formatDate(activeTask.startDate) : '—'}</Paragraph>
                                        </div>
                                        <div>
                                            <Text type="secondary">Ngày hoàn thành:</Text>
                                            <Paragraph strong>{activeTask?.endDate ? formatDate(activeTask.endDate, 'DD/MM/YYYY HH:mm') : '—'}</Paragraph>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <Text type="secondary">Mô tả công việc:</Text>
                                            <Paragraph style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                {activeTask?.description || 'Chưa có mô tả công việc.'}
                                            </Paragraph>
                                        </div>
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'comments',
                            label: (
                                <Space>
                                    <MessageSquare size={14} />
                                    <span>Bình luận</span>
                                </Space>
                            ),
                            children: (
                                <div style={{ padding: '0 24px' }}>
                                    <Divider style={{ margin: '12px 0' }} />
                                    <Space direction="vertical" style={{ width: '100%' }} size={16}>

                                        {/* Create comment input */}
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                            <Input.TextArea
                                                rows={2}
                                                placeholder="Thêm bình luận mới..."
                                                value={newCommentText}
                                                onChange={(e) => setNewCommentText(e.target.value)}
                                            />
                                            <Button
                                                type="primary"
                                                loading={postingComment}
                                                onClick={handlePostComment}
                                                style={{ height: 54 }}
                                            >
                                                Gửi
                                            </Button>
                                        </div>

                                        {/* Comments list */}
                                        {commentsLoading ? (
                                            <Spin style={{ display: 'block', margin: '20px auto' }} />
                                        ) : comments.length === 0 ? (
                                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bình luận nào." />
                                        ) : (
                                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                                {comments.map((c, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                            {c.userName ? c.userName.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <Text strong>{c.userName || 'Không rõ'}</Text>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>{timeAgo(c.created_at)}</Text>
                                                            </div>
                                                            <div style={{ fontSize: 12.5, color: '#334155' }} dangerouslySetInnerHTML={{ __html: c.comment_text }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </Space>
                                        )}
                                    </Space>
                                </div>
                            )
                        }
                    ]}
                />
            </Modal>

            {/* CREATE / ASSIGN TASK MODAL */}
            <Modal
                title={taskModalMode === 'create' ? 'Tạo công việc mới' : 'Giao việc cho giai đoạn'}
                open={taskModalVisible}
                onCancel={() => setTaskModalVisible(false)}
                onOk={() => taskForm.submit()}
                destroyOnClose
            >
                <Form
                    form={taskForm}
                    layout="vertical"
                    onFinish={handleCreateOrAssignTaskSubmit}
                    style={{ marginTop: 16 }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item
                            name="taskCode"
                            label="Mã mục công việc"
                            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã mục công việc' }]}
                        >
                            <AutoComplete
                                options={projectTaskItems}
                                onSelect={handleTaskCodeSelect}
                                filterOption={(inputValue, option) =>
                                    String(option?.label || '').toLowerCase().includes(inputValue.toLowerCase())
                                }
                            >
                                <Input placeholder="Nhập mã mới hoặc chọn mục công việc đã có" maxLength={50} />
                            </AutoComplete>
                        </Form.Item>

                        <Form.Item
                            name="lv049"
                            label="Loại công việc"
                            rules={[{ required: true, message: 'Vui lòng chọn loại công việc' }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Chọn loại công việc"
                                options={workTypes}
                                notFoundContent={workTypes.length === 0 ? 'Chưa có loại công việc' : null}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="title"
                        label="Tên công việc"
                        rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}
                    >
                        <Input placeholder="Ví dụ: Lập trình API thanh toán" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả chi tiết">
                        <Input.TextArea rows={3} placeholder="Ghi chú thêm về nội dung cần thực hiện..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="columnId" label="Giai đoạn" rules={[{ required: true }]}>
                            <Select dropdownMatchSelectWidth={false} placeholder="Chọn giai đoạn">
                                {boardData.columns.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item name="assigneeId" label="Người thực hiện">
                            <SelectNhanVien style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="supporterId" label="Nhân viên hỗ trợ">
                            <SelectNhanVien style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item name="managerId" label="Người quản lý duyệt">
                            <SelectNhanVien style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="priority" label="Độ ưu tiên" rules={[{ required: true }]}>
                            <Select>
                                <Select.Option value="1">Bình thường</Select.Option>
                                <Select.Option value="2">Ưu tiên 1</Select.Option>
                                <Select.Option value="3">Ưu tiên 2</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="dateRange"
                            label="Thời gian thực hiện"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc' }]}
                        >
                            <DatePicker.RangePicker
                                style={{ width: '100%' }}
                                showTime={{ format: 'HH:mm' }}
                                format="DD/MM/YYYY HH:mm"
                                placeholder={['Bắt đầu', 'Kết thúc']}
                            />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* EDIT TASK MODAL */}
            <Modal
                title={
                    <Space size={8}>
                        <Edit3 size={16} style={{ color: '#6366f1' }} />
                        <span>Sửa công việc</span>
                    </Space>
                }
                open={editTaskModalVisible}
                onCancel={() => { setEditTaskModalVisible(false); setEditingTask(null); }}
                onOk={() => editTaskForm.submit()}
                okText="Lưu thay đổi"
                cancelText="Hủy"
                destroyOnClose
                width={600}
            >
                <Form
                    form={editTaskForm}
                    layout="vertical"
                    onFinish={handleEditTaskSubmit}
                    style={{ marginTop: 16 }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="taskCode" label="Mã mục công việc">
                            <Input disabled />
                        </Form.Item>

                        <Form.Item
                            name="lv049"
                            label="Loại công việc"
                            rules={[{ required: true, message: 'Vui lòng chọn loại công việc' }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Chọn loại công việc"
                                options={workTypes}
                                notFoundContent={workTypes.length === 0 ? 'Chưa có loại công việc' : null}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="title"
                        label="Tên công việc"
                        rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}
                    >
                        <Input placeholder="Ví dụ: Lập trình API thanh toán" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả chi tiết">
                        <Input.TextArea rows={3} placeholder="Ghi chú thêm về nội dung cần thực hiện..." />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="columnId" label="Giai đoạn" rules={[{ required: true }]}>
                            <Select dropdownMatchSelectWidth={false} placeholder="Chọn giai đoạn">
                                {boardData.columns.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item name="assigneeId" label="Người thực hiện">
                            <SelectNhanVien style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="supporterId" label="Nhân viên hỗ trợ">
                            <SelectNhanVien style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item name="managerId" label="Người quản lý duyệt">
                            <SelectNhanVien style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="priority" label="Độ ưu tiên" rules={[{ required: true }]}>
                            <Select>
                                <Select.Option value="1">Bình thường</Select.Option>
                                <Select.Option value="2">Ưu tiên 1</Select.Option>
                                <Select.Option value="3">Ưu tiên 2</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="dateRange" label="Thời gian thực hiện">
                            <DatePicker.RangePicker
                                style={{ width: '100%' }}
                                showTime={{ format: 'HH:mm' }}
                                format="DD/MM/YYYY HH:mm"
                                placeholder={['Bắt đầu', 'Kết thúc']}
                            />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* ADD COLUMN MODAL */}
            <Modal
                title="Thêm giai đoạn mới"
                open={columnModalVisible}
                onCancel={() => setColumnModalVisible(false)}
                onOk={() => columnForm.submit()}
                destroyOnClose
            >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: 12 }}>
                    <Radio.Group value={columnActiveTab} onChange={(e) => setColumnActiveTab(e.target.value)}>
                        <Radio.Button value="new">Tạo giai đoạn mới</Radio.Button>
                        <Radio.Button value="existing">Dùng giai đoạn có sẵn</Radio.Button>
                    </Radio.Group>
                </div>

                <Form
                    form={columnForm}
                    layout="vertical"
                    onFinish={handleCreateColumn}
                >
                    {columnActiveTab === 'new' ? (
                        <Form.Item
                            name="name"
                            label="Tên giai đoạn mới"
                            rules={[{ required: true, message: 'Vui lòng nhập tên giai đoạn mới' }]}
                        >
                            <Input placeholder="Ví dụ: Thiết kế giao diện" />
                        </Form.Item>
                    ) : (
                        <Form.Item
                            name="existingColumnId"
                            label="Chọn giai đoạn từ danh sách có sẵn"
                            rules={[{ required: true, message: 'Vui lòng chọn giai đoạn' }]}
                        >
                            <Select dropdownMatchSelectWidth={false} placeholder="Chọn giai đoạn có sẵn">
                                {availableColumns.map(col => (
                                    <Select.Option key={col.id} value={col.id}>{col.title}</Select.Option>
                                ))}
                                {availableColumns.length === 0 && (
                                    <Select.Option disabled value="">Không có giai đoạn nào khả dụng</Select.Option>
                                )}
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* SVG Filter for Liquid Gooey Effect */}
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ display: 'none' }}>
                <defs>
                    <filter id="liquid-goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                        <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                </defs>
            </svg>
        </Space>
    );
};

export default KanbanTab;
