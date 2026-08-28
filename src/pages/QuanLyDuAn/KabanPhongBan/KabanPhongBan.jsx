import { Breadcrumb, Button, Card, DatePicker, Empty, Form, Input, Modal, Progress, Select, Space, Spin, Tag, Tooltip, Typography, message } from 'antd';
import { CheckCircle2, ClipboardList, FolderKanban, MessageSquare, PlayCircle, Plus, RefreshCw, UserCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { callApi, getCurrentUser as fetchCurrentUser } from '../../../services/apiServices';
import sharedStyles from '../../NhanVien/styles.module.css';
import styles from './KabanPhongBan.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;
const TABLE = 'kanban_board';

const api = (func, payload = {}) => callApi(TABLE, func, payload);

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('pmbh_user');
    if (!raw) return {};
    const user = JSON.parse(raw);
    return {
      accountId: user.id || user.userCode || user.taiKhoan || user.username || '',
      id: user.maNhanVien || user.employeeId || user.lv001 || '',
      name: user.hoTen || user.name || user.username || user.id || '',
      role: user.role || user.right || user.vaiTro || '',
      right: user.right || user.role || user.vaiTro || '',
      taiKhoan: user.taiKhoan || user.username || user.id || user.userCode || '',
      departmentId: user.phongBanId || user.departmentId || user.lv029 || '',
      departmentName: user.phongBanTen || user.departmentName || '',
    };
  } catch (_) {
    return {};
  }
};

const isSuccess = (res) => res && res.success !== false;
const toArray = (value) => (Array.isArray(value) ? value : []);
const normalizeId = (value) => String(value ?? '');
const getUserRoleText = (user) => String(user?.role || user?.right || user?.vaiTro || '').trim().toLowerCase();
const isAdminRole = (user) => getUserRoleText(user) === 'admin';
const isManagerRole = (user) => {
  const role = getUserRoleText(user);
  return role === 'admin' || role === 'manager' || role.includes('quan');
};
const getInitials = (name) => {
  const text = String(name || '').trim();
  if (!text) return '?';
  const parts = text.split(/\s+/);
  return `${parts[0]?.[0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
};

function KabanPhongBan() {
  const storedUser = useMemo(getStoredUser, []);
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [taskLimit, setTaskLimit] = useState(5);
  const [taskCount, setTaskCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState();
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [activeView, setActiveView] = useState('project');
  const [kanbanData, setKanbanData] = useState({ columns: [], users: [], evaluation_icons: [] });
  const [overviewData, setOverviewData] = useState({ columns: [], users: [], evaluation_icons: [] });
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedTaskSourceColId, setDraggedTaskSourceColId] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [createDefaultColumnId, setCreateDefaultColumnId] = useState(null);

  const departmentId = currentUser?.departmentId || '';
  const currentUserId = currentUser?.id || '';
  const canManage = isManagerRole(currentUser);
  const canSkipLimit = isAdminRole(currentUser);

  const loadTaskLimit = useCallback(async () => {
    const res = await api('get_jo_lv0016_lv007');
    const limit = parseInt(res?.data?.[0], 10);
    setTaskLimit(Number.isFinite(limit) && limit > 0 ? limit : 5);
  }, []);

  const loadTaskCount = useCallback(async (userId = currentUserId, deptId = departmentId) => {
    if (!userId || !deptId) return;
    const res = await api('get_user_task_count', { userId, departmentId: deptId });
    setTaskCount(parseInt(res?.count, 10) || 0);
  }, [currentUserId, departmentId]);

  const loadProjects = useCallback(async (deptId) => {
    if (!deptId) return;
    const list = await api('get_projects_by_department', { departmentId: deptId });
    const nextProjects = toArray(list);
    setProjects(nextProjects);
    if (!selectedProjectId && nextProjects.length > 0) {
      setSelectedProjectId(nextProjects[0].id);
      setSelectedProjectName(nextProjects[0].name);
    }
  }, [selectedProjectId]);

  const loadCurrentUser = useCallback(async () => {
    let user = null;
    try {
      const res = await fetchCurrentUser();
      if (res?.success !== false) user = res;
    } catch (_) {
      user = null;
    }

    const employeeId = user?.lv001 || user?.maNhanVien || user?.employeeId || user?.id || storedUser.id || '';
    let roleInfo = null;
    if (employeeId) {
      try {
        const roleRes = await api('get_user_role', { userId: employeeId });
        if (roleRes?.success !== false) roleInfo = roleRes;
      } catch (_) {
        roleInfo = null;
      }
    }

    const merged = {
      ...storedUser,
      ...(user || {}),
      accountId: storedUser.accountId || storedUser.taiKhoan || '',
      id: employeeId,
      name: user?.hoTen || user?.name || storedUser.name || storedUser.accountId || '',
      departmentId: user?.phongBanId || user?.departmentId || user?.lv029 || storedUser.departmentId || '',
      departmentName: user?.phongBanTen || user?.departmentName || storedUser.departmentName || '',
      role: roleInfo?.role || user?.role || user?.right || storedUser.role || 'user',
      right: roleInfo?.role || storedUser.right || user?.right || storedUser.role || '',
    };
    setCurrentUser(merged);
    return merged;
  }, [storedUser]);

  const loadProjectBoard = useCallback(async () => {
    if (!selectedProjectId || !departmentId) return;
    setLoading(true);
    try {
      const res = await api('get_filtered_board', {
        projectId: selectedProjectId,
        departmentId,
        userId: currentUserId,
        user_role: currentUser?.role,
      });
      setKanbanData({ columns: toArray(res?.columns), users: toArray(res?.users), evaluation_icons: toArray(res?.evaluation_icons) });
    } catch (error) {
      message.error('Không thể tải bảng Kanban theo dự án');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, departmentId, currentUserId, currentUser?.role]);

  const loadOverview = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const res = await api('get_department_overview', {
        departmentId,
        userId: currentUserId,
        user_role: currentUser?.role,
      });
      setOverviewData({ columns: toArray(res?.columns), users: toArray(res?.users), evaluation_icons: toArray(res?.evaluation_icons) });
    } catch (error) {
      message.error('Không thể tải tổng quan phòng ban');
    } finally {
      setLoading(false);
    }
  }, [departmentId, currentUserId, currentUser?.role]);

  const refresh = useCallback(async () => {
    await Promise.all([loadTaskCount(), activeView === 'project' ? loadProjectBoard() : loadOverview()]);
  }, [activeView, loadOverview, loadProjectBoard, loadTaskCount]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const user = await loadCurrentUser();
        await loadTaskLimit();
        await loadProjects(user?.departmentId);
        await loadTaskCount(user?.id, user?.departmentId);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCurrentUser, loadProjects, loadTaskCount, loadTaskLimit]);

  useEffect(() => {
    if (activeView === 'project') loadProjectBoard();
    if (activeView === 'overview') loadOverview();
  }, [activeView, loadOverview, loadProjectBoard]);

  const boardData = activeView === 'project' ? kanbanData : overviewData;
  const allTasks = useMemo(() => boardData.columns.flatMap((column) => toArray(column.tasks).map((task) => ({ ...task, columnId: column.id }))), [boardData]);
  const users = boardData.users || [];
  const evalOptions = boardData.evaluation_icons || [];

  const findUser = (id) => users.find((user) => normalizeId(user.id) === normalizeId(id)) || { id, name: id ? `ID: ${id}` : 'Chưa gán', initials: id ? getInitials(id) : '?', color: 'avatarMuted' };
  const findTask = (kanbanTaskId) => allTasks.find((task) => normalizeId(task.kanbanTaskId) === normalizeId(kanbanTaskId) || normalizeId(task.id) === normalizeId(kanbanTaskId));

  const assertWorkLimit = async (task) => {
    if (canSkipLimit) return true;
    const alreadyAssigned = task?.assigneeId && normalizeId(task.assigneeId) === normalizeId(currentUserId);
    if (alreadyAssigned) return true;
    const res = await api('get_user_task_count', { userId: currentUserId, departmentId });
    const count = parseInt(res?.count, 10) || 0;
    setTaskCount(count);
    if (count >= taskLimit) {
      message.warning(`Bạn đã đạt giới hạn ${taskLimit} công việc. Không thể nhận thêm công việc.`);
      return false;
    }
    return true;
  };

  const handleTakeTask = async (task) => {
    if (!task || !currentUserId || !departmentId) return;
    if (!(await assertWorkLimit(task))) return;
    setMoving(true);
    try {
      const res = await api('take_task_web', {
        data: {
          taskId: task.id,
          kanbanTaskId: task.kanbanTaskId,
          userId: currentUserId,
          departmentId,
          stageId: task.columnId,
        },
      });
      if (!isSuccess(res)) throw new Error(res?.message || 'Không thể nhận việc');
      message.success('Đã nhận việc');
      await refresh();
    } catch (error) {
      message.error(error.message || 'Không thể nhận việc');
    } finally {
      setMoving(false);
    }
  };

  const executeMoveTask = async (task, oldColumnId, newColumnId) => {
    if (!task || !task.kanbanTaskId || normalizeId(oldColumnId) === normalizeId(newColumnId)) return;
    const targetColumn = boardData.columns.find((column) => normalizeId(column.id) === normalizeId(newColumnId));
    const inProgress = Number(targetColumn?.is_done_column) === 2;
    const done = Number(targetColumn?.is_done_column) === 1 || normalizeId(newColumnId) === '7';

    if ((inProgress || done) && !(await assertWorkLimit(task))) return;

    setMoving(true);
    try {
      const projectId = activeView === 'project' ? selectedProjectId : task?.projectId;
      const payload = inProgress
        ? { kanbanTaskId: task.kanbanTaskId, oldColumnId, newColumnId, departmentId, projectId, userId: currentUserId, user_role: currentUser?.role }
        : { kanbanTaskId: task.kanbanTaskId, oldColumnId, newColumnId, departmentId, projectId, userId: currentUserId };
      const res = await api(inProgress ? 'move_to_in_progress' : 'move_task_for_user', payload);
      if (!isSuccess(res)) throw new Error(res?.message || 'Cập nhật thất bại');
      message.success(inProgress ? 'Đã chuyển sang đang thực hiện và nhận việc' : 'Đã cập nhật giai đoạn công việc');
      await refresh();
    } catch (error) {
      message.error(error.message || 'Cập nhật thất bại');
      await refresh();
    } finally {
      setMoving(false);
    }
  };

  const moveTask = async (kanbanTaskId, oldColumnId, newColumnId) => {
    if (!kanbanTaskId || normalizeId(oldColumnId) === normalizeId(newColumnId)) return;
    const task = findTask(kanbanTaskId);
    if (!task) return;
    const targetColumn = boardData.columns.find((column) => normalizeId(column.id) === normalizeId(newColumnId));
    const targetIsDone = Number(targetColumn?.is_done_column) === 1 || normalizeId(newColumnId) === '7';
    const completed = Number(task.is_completed) === 1;

    if (completed && !targetIsDone) {
      Modal.confirm({
        title: 'Hủy hoàn thành công việc?',
        content: 'Công việc này đang hoàn thành. Nếu tiếp tục, hệ thống sẽ hủy trạng thái hoàn thành và chuyển công việc sang giai đoạn mới.',
        okText: 'Đồng ý',
        cancelText: 'Hủy',
        onOk: () => executeMoveTask(task, oldColumnId, newColumnId),
      });
      return;
    }

    await executeMoveTask(task, oldColumnId, newColumnId);
  };

  const handleTaskDragStart = (kanbanTaskId, sourceColId) => {
    setDraggedTaskId(kanbanTaskId);
    setDraggedTaskSourceColId(sourceColId);
  };

  const handleTaskDrop = async (targetColId) => {
    if (!draggedTaskId || !draggedTaskSourceColId) return;
    const taskId = draggedTaskId;
    const sourceColId = draggedTaskSourceColId;
    setDraggedTaskId(null);
    setDraggedTaskSourceColId(null);
    await moveTask(taskId, sourceColId, targetColId);
  };

  const executeToggleComplete = async (task) => {
    if (!task) return;
    setMoving(true);
    try {
      const res = await api('toggle_completion_for_dept', {
        kanbanTaskId: task.kanbanTaskId,
        departmentId,
        projectId: activeView === 'project' ? selectedProjectId : task.projectId,
        isCompleted: task.is_completed ? 0 : 1,
        userId: currentUserId,
      });
      if (!isSuccess(res)) throw new Error(res?.message || 'Cập nhật hoàn thành thất bại');
      message.success(task.is_completed ? 'Đã hủy hoàn thành công việc' : 'Đã hoàn thành công việc');
      await refresh();
    } catch (error) {
      message.error(error.message || 'Cập nhật hoàn thành thất bại');
    } finally {
      setMoving(false);
    }
  };

  const toggleComplete = async (task) => {
    if (!task) return;
    Modal.confirm({
      title: task.is_completed ? 'Hủy hoàn thành công việc?' : 'Xác nhận hoàn thành công việc?',
      content: task.is_completed
        ? 'Công việc sẽ được chuyển về giai đoạn trước đó để tiếp tục xử lý.'
        : 'Công việc sẽ được đánh dấu hoàn thành cho phòng ban hiện tại.',
      okText: task.is_completed ? 'Hủy hoàn thành' : 'Hoàn thành',
      cancelText: 'Đóng',
      onOk: () => executeToggleComplete(task),
    });
  };

  const setEvaluation = async (task, status) => {
    const res = await api('set_evaluation', { taskId: task.kanbanTaskId, status });
    if (!isSuccess(res)) {
      message.error(res?.message || 'Lưu đánh giá thất bại');
      return;
    }
    await refresh();
  };

  const openCreateModal = (columnId = null) => {
    createForm.resetFields();
    const defaultProjectId = activeView === 'project' ? selectedProjectId : (projects[0]?.id ?? undefined);
    createForm.setFieldsValue({
      columnId: columnId ? normalizeId(columnId) : (boardData.columns[0]?.id ? normalizeId(boardData.columns[0].id) : undefined),
      projectId: defaultProjectId,
    });
    setCreateDefaultColumnId(columnId);
    setCreateModal(true);
  };

  const handleCreateTask = async (values) => {
    const projectId = activeView === 'project' ? selectedProjectId : values.projectId;
    if (!projectId) {
      message.warning('Vui lòng chọn dự án.');
      return;
    }
    setCreateLoading(true);
    try {
      const payload = {
        title: values.title?.trim(),
        description: values.description?.trim() || '',
        columnId: parseInt(values.columnId, 10),
        projectId,
        assigneeId: values.assigneeId || null,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        userId: currentUserId,
        departmentId,
      };
      const res = await api('create_task', payload);
      if (!isSuccess(res)) throw new Error(res?.message || 'Tạo công việc thất bại');
      message.success('Đã tạo công việc mới!');
      setCreateModal(false);
      createForm.resetFields();
      await refresh();
    } catch (error) {
      message.error(error.message || 'Tạo công việc thất bại');
    } finally {
      setCreateLoading(false);
    }
  };

  const openDetail = async (task) => {
    setDetailTask(task);
    setCommentText('');
    const res = await api('get_comments', { taskId: task.id });
    setComments(toArray(res));
  };

  const submitComment = async () => {
    if (!commentText.trim() || !detailTask) return;
    const res = await api('post_comment', { taskId: detailTask.id, userId: currentUserId, commentText: commentText.trim() });
    if (!isSuccess(res)) {
      message.error(res?.message || 'Không thể lưu bình luận');
      return;
    }
    setCommentText('');
    const next = await api('get_comments', { taskId: detailTask.id });
    setComments(toArray(next));
  };

  const onProjectChange = (projectId, option) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(option?.label || '');
  };

  const renderProgressStatus = () => {
    if (canSkipLimit) return <Text strong>Không áp dụng</Text>;
    const percent = taskLimit > 0 ? Math.min(100, Math.round((taskCount / taskLimit) * 100)) : 0;
    return <Progress percent={percent} size="small" status={percent >= 100 ? 'exception' : 'active'} format={() => `${taskCount}/${taskLimit}`} />;
  };

  return (
    <div className={sharedStyles.khoContainer}>
      <Breadcrumb className={sharedStyles.pageBreadcrumb} items={[{ title: 'Quản lý dự án' }, { title: 'Kanban theo phòng ban' }]} />

      <div className={sharedStyles.khoHeader}>
        <div className={sharedStyles.khoTitle}>
          <FolderKanban size={30} />
          <div>
            <Title level={3} className={sharedStyles.khoTitleText}>Kanban theo phòng ban</Title>
            <Text type="secondary">{currentUser?.departmentName || 'Phòng ban'} · {currentUser?.name || currentUserId || 'Người dùng'}</Text>
          </div>
        </div>
        <Space className={sharedStyles.khoActions} wrap>
          {canManage && (
            <Button type="primary" icon={<Plus size={16} />} onClick={() => openCreateModal()}>Tạo công việc</Button>
          )}
          <Button icon={<RefreshCw size={16} />} onClick={refresh} loading={loading || moving}>Tải lại</Button>
        </Space>
      </div>

      <Card className={`${sharedStyles.mainCard} ${styles.controlCard}`}>
        <div className={styles.toolbar}>
          <div className={styles.controlGroup}>
            <Text strong>Dự án</Text>
            <Select
              value={selectedProjectId}
              onChange={onProjectChange}
              disabled={activeView !== 'project'}
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
              placeholder="Chọn dự án"
              className={styles.projectSelect}
              showSearch
              optionFilterProp="label"
            />
          </div>
          <div className={styles.segmented}>
            <Button type={activeView === 'project' ? 'primary' : 'default'} icon={<ClipboardList size={16} />} onClick={() => setActiveView('project')}>Theo dự án</Button>
            <Button type={activeView === 'overview' ? 'primary' : 'default'} icon={<Users size={16} />} onClick={() => setActiveView('overview')}>Tổng quan phòng ban</Button>
          </div>
          <div className={styles.limitBox}>
            <Text type="secondary">Giới hạn nhận việc</Text>
            {renderProgressStatus()}
          </div>
        </div>
      </Card>

      <Card className={`${sharedStyles.mainCard} ${styles.boardCard}`}>
        <div className={styles.boardHeader}>
          <div>
            <Title level={4}>{activeView === 'project' ? `Bảng Kanban - ${selectedProjectName || 'Dự án'}` : `Tổng quan công việc của ${currentUser?.departmentName || 'phòng ban'}`}</Title>
            <Text type="secondary">Kéo thả thẻ công việc để chuyển giai đoạn, nhận việc hoặc đánh dấu hoàn thành.</Text>
          </div>
          {moving && <Tag color="processing">Đang cập nhật</Tag>}
        </div>

        <Spin spinning={loading || moving}>
          {boardData.columns.length === 0 ? (
            <Empty description="Không có dữ liệu Kanban" />
          ) : (
            <div className={styles.board}>
              {boardData.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  users={users}
                  evalOptions={evalOptions}
                  currentUser={currentUser}
                  canManage={canManage}
                  onDropTask={() => handleTaskDrop(column.id)}
                  onDragStart={handleTaskDragStart}
                  findUser={findUser}
                  onTakeTask={handleTakeTask}
                  onToggleComplete={toggleComplete}
                  onSetEvaluation={setEvaluation}
                  onOpenDetail={openDetail}
                  onCreateTask={openCreateModal}
                />
              ))}
            </div>
          )}
        </Spin>
      </Card>

      <Modal
        title="Tạo công việc mới"
        open={createModal}
        onCancel={() => { setCreateModal(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        okText="Tạo công việc"
        cancelText="Hủy"
        confirmLoading={createLoading}
        width={600}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="title" label="Tiêu đề công việc" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="Nhập tiêu đề công việc..." />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Nhập mô tả..." />
          </Form.Item>
          {activeView === 'overview' && (
            <Form.Item name="projectId" label="Dự án" rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}>
              <Select
                placeholder="Chọn dự án"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}
          <Form.Item name="columnId" label="Giai đoạn (Cột)" rules={[{ required: true, message: 'Vui lòng chọn giai đoạn' }]}>
            <Select
              placeholder="Chọn giai đoạn"
              options={boardData.columns
                .filter((c) => Number(c.is_done_column) !== 1)
                .map((c) => ({ value: normalizeId(c.id), label: c.title }))}
            />
          </Form.Item>
          <Form.Item name="assigneeId" label="Người thực hiện">
            <Select
              placeholder="Chọn người thực hiện (tùy chọn)"
              allowClear
              showSearch
              optionFilterProp="label"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item name="endDate" label="Ngày kết thúc" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        className={sharedStyles.khoModal}
        title={detailTask ? detailTask.title : 'Chi tiết công việc'}
        open={!!detailTask}
        onCancel={() => setDetailTask(null)}
        footer={null}
        width={760}
      >
        {detailTask && (
          <div className={styles.detailModal}>
            <Space wrap>
              <Tag color="blue">{detailTask.taskId}</Tag>
              {detailTask.projectName && <Tag color="purple">{detailTask.projectName}</Tag>}
              <Tag color={detailTask.is_completed ? 'green' : 'default'}>{detailTask.is_completed ? 'Hoàn thành' : 'Đang xử lý'}</Tag>
            </Space>
            <p className={styles.detailDescription}>{detailTask.description || 'Không có mô tả'}</p>
            <div className={styles.commentPanel}>
              <Title level={5}><MessageSquare size={16} /> Bình luận</Title>
              <div className={styles.commentList}>
                {comments.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bình luận" /> : comments.map((comment, index) => (
                  <div className={styles.commentItem} key={`${comment.created_at}-${index}`}>
                    <strong>{comment.userName}</strong>
                    <span>{comment.created_at}</span>
                    <div dangerouslySetInnerHTML={{ __html: comment.comment_text }} />
                  </div>
                ))}
              </div>
              <TextArea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={4} placeholder="Nhập bình luận..." />
              <div className={styles.commentActions}><Button type="primary" onClick={submitComment}>Gửi bình luận</Button></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function KanbanColumn({ column, users, evalOptions, currentUser, canManage, onDropTask, onDragStart, findUser, onTakeTask, onToggleComplete, onSetEvaluation, onOpenDetail, onCreateTask }) {
  const isInProgress = Number(column.is_done_column) === 2;
  const isDone = Number(column.is_done_column) === 1 || normalizeId(column.id) === '7';
  const visibleTasks = isInProgress
    ? toArray(column.tasks).filter((task) => normalizeId(task.assigneeId) === normalizeId(currentUser?.id))
    : toArray(column.tasks);
  return (
    <section
      className={`${styles.column} ${isInProgress ? styles.inProgressColumn : ''} ${isDone ? styles.doneColumn : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropTask();
      }}
    >
      <header className={styles.columnHeader}>
        <div>
          <Tooltip title={isDone ? 'Hoàn thành' : isInProgress ? 'Đang thực hiện' : 'Giai đoạn'}>
            {isDone ? <CheckCircle2 size={18} /> : isInProgress ? <PlayCircle size={18} /> : <ClipboardList size={18} />}
          </Tooltip>
          <Text strong>{column.title}</Text>
        </div>
        <Space size={4}>
          <Tag>{visibleTasks.length}</Tag>
          {canManage && !isDone && (
            <Tooltip title="Tạo công việc trong giai đoạn này">
              <Button type="text" size="small" icon={<Plus size={14} />} onClick={() => onCreateTask(column.id)} />
            </Tooltip>
          )}
        </Space>
      </header>
      <div className={styles.taskList}>
        {visibleTasks.map((task) => (
          <TaskCard
            key={`${task.kanbanTaskId}-${task.id}`}
            task={{ ...task, columnId: column.id }}
            users={users}
            evalOptions={evalOptions}
            currentUser={currentUser}
            canManage={canManage}
            findUser={findUser}
            onDragStart={onDragStart}
            onTakeTask={onTakeTask}
            onToggleComplete={onToggleComplete}
            onSetEvaluation={onSetEvaluation}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  );
}

function TaskCard({ task, users, evalOptions, currentUser, canManage, findUser, onDragStart, onTakeTask, onToggleComplete, onSetEvaluation, onOpenDetail }) {
  const assignee = findUser(task.assigneeId);
  const isAssignee = normalizeId(task.assigneeId) === normalizeId(currentUser?.id);
  const actionable = canManage || isAssignee;
  const completed = Number(task.is_completed) === 1;
  return (
    <article
      className={`${styles.taskCard} ${completed ? styles.completedTask : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', String(task.kanbanTaskId));
        onDragStart(task.kanbanTaskId, task.columnId);
      }}
      onDoubleClick={() => onOpenDetail(task)}
    >
      <div className={styles.taskTopline}>
        <Tag color="blue">{task.taskId}</Tag>
        <Tooltip title={completed ? 'Bỏ hoàn thành' : 'Hoàn thành'}>
          <Button type="text" size="small" icon={<CheckCircle2 size={18} />} disabled={!actionable} onClick={() => onToggleComplete(task)} />
        </Tooltip>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      {task.projectName && <Tag color="purple" className={styles.projectBadge}>{task.projectName}</Tag>}
      <div className={styles.evalRow}>
        {evalOptions.map((item) => (
          <Tooltip key={item.status} title={item.text || item.status}>
            <button
              type="button"
              className={`${styles.evalButton} ${normalizeId(task.evaluation_status) === normalizeId(item.status) ? styles.evalActive : ''}`}
              onClick={() => onSetEvaluation(task, item.status)}
            >
              {item.icon || item.text || item.status}
            </button>
          </Tooltip>
        ))}
      </div>
      <div className={styles.cardFooter}>
        <div className={styles.assignee}>
          <span className={`${styles.avatar} ${styles[assignee.color] || ''}`}>{assignee.initials || getInitials(assignee.name)}</span>
          <span>{assignee.name}</span>
        </div>
        <Space size={4}>
          {!task.assigneeId && !completed && (
            <Button size="small" type="primary" icon={<UserCheck size={14} />} onClick={() => onTakeTask(task)}>Nhận việc</Button>
          )}
          <Button size="small" icon={<MessageSquare size={14} />} onClick={() => onOpenDetail(task)} />
        </Space>
      </div>
    </article>
  );
}

export default KabanPhongBan;







