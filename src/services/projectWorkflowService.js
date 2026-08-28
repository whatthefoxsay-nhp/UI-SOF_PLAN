// src/services/projectWorkflowService.js

const STORAGE_KEYS = {
  WORKFLOWS: 'sof_plan_workflows',
  PROJECTS: 'sof_plan_projects',
  UNLOCK_REQUESTS: 'sof_plan_unlock_requests',
  ACTIVITY_LOGS: 'sof_plan_activity_logs',
};

// Initial default Workflow Template according to docx requirements
const DEFAULT_WORKFLOWS = [
  {
    id: 'WF-SW-001',
    code: 'WF-SW-001',
    name: 'Xây dựng phần mềm theo yêu cầu',
    description: 'Quy trình chuẩn cho dự án phát triển phần mềm theo yêu cầu khách hàng.',
    isActive: true,
    createdAt: '2026-01-10 08:00',
    updatedAt: '2026-08-01 10:30',
    stages: [
      {
        id: 'GD01',
        code: 'GD01',
        name: 'Khách hàng tiềm năng',
        order: 1,
        departments: ['Marketing', 'Kinh doanh'],
        isMandatory: true,
        isLockable: false,
        tasks: [
          {
            code: 'KD001',
            name: 'Tìm kiếm & tiếp nhận khách hàng tiềm năng',
            department: 'Marketing',
            confirmDepartments: ['Marketing', 'Kinh doanh'],
            estimatedDays: 3,
            description: 'Thu thập thông tin sơ bộ về nhu cầu phần mềm của khách hàng',
          },
        ],
      },
      {
        id: 'GD02',
        code: 'GD02',
        name: 'Tư vấn & báo giá',
        order: 2,
        departments: ['Kinh doanh', 'Kỹ thuật'],
        isMandatory: true,
        isLockable: false,
        tasks: [
          {
            code: 'KD002',
            name: 'Tiếp nhận chi tiết yêu cầu',
            department: 'Kinh doanh',
            confirmDepartments: ['Kinh doanh'],
            estimatedDays: 2,
            description: 'Họp với khách hàng ghi nhận yêu cầu tính năng',
          },
          {
            code: 'KT001',
            name: 'Ước tính phạm vi & số ngày công',
            department: 'Kỹ thuật',
            confirmDepartments: ['Kỹ thuật'],
            estimatedDays: 4,
            description: 'Kiểm tra phạm vi kỹ thuật, ước tính số ngày lập trình',
          },
          {
            code: 'KD003',
            name: 'Hoàn thiện báo giá & gửi khách hàng',
            department: 'Kinh doanh',
            confirmDepartments: ['Kinh doanh', 'Kỹ thuật'],
            estimatedDays: 2,
            description: 'Tổng hợp báo giá gửi khách duyệt',
          },
        ],
      },
      {
        id: 'GD03',
        code: 'GD03',
        name: 'Hợp đồng & lợi nhuận',
        order: 3,
        departments: ['Kinh doanh', 'Kỹ thuật'],
        isMandatory: true,
        isLockable: true, // Stage to LOCK data
        tasks: [
          {
            code: 'KD004',
            name: 'Thỏa thuận điều khoản hợp đồng',
            department: 'Kinh doanh',
            confirmDepartments: ['Kinh doanh'],
            estimatedDays: 3,
            description: 'Soạn thảo và chốt hợp đồng thương mại',
          },
          {
            code: 'XN001',
            name: 'Xác nhận phạm vi & chốt tài chính',
            department: 'Kinh doanh',
            confirmDepartments: ['Kinh doanh', 'Kỹ thuật'],
            estimatedDays: 1,
            description: 'Kỹ thuật & Kinh doanh cùng xác nhận chốt hợp đồng và LOCK dữ liệu',
          },
        ],
      },
      {
        id: 'GD04',
        code: 'GD04',
        name: 'Thực thi lập trình',
        order: 4,
        departments: ['Kỹ thuật'],
        isMandatory: true,
        isLockable: false,
        tasks: [
          {
            code: 'KT002',
            name: 'Phân rã dự án & phân công lập trình viên',
            department: 'Kỹ thuật',
            confirmDepartments: ['Kỹ thuật'],
            estimatedDays: 5,
            description: 'Chia nhỏ module, gán ngày công cho từng Dev',
          },
          {
            code: 'KT003',
            name: 'Thực thi code các module chính',
            department: 'Kỹ thuật',
            confirmDepartments: ['Kỹ thuật'],
            estimatedDays: 80,
            description: 'Lập trình hoàn thiện tính năng theo spec',
          },
        ],
      },
      {
        id: 'GD05',
        code: 'GD05',
        name: 'Tester & Kiểm thử',
        order: 5,
        departments: ['Tester', 'Kỹ thuật'],
        isMandatory: true,
        isLockable: false,
        tasks: [
          {
            code: 'TS001',
            name: 'Lập Test Case & Kiểm thử chức năng',
            department: 'Tester',
            confirmDepartments: ['Tester'],
            estimatedDays: 10,
            description: 'Tạo test cases, log bug và kiểm thử lại',
          },
        ],
      },
      {
        id: 'GD06',
        code: 'GD06',
        name: 'Bàn giao dự án',
        order: 6,
        departments: ['Kỹ thuật', 'Kinh doanh'],
        isMandatory: true,
        isLockable: false,
        tasks: [
          {
            code: 'BG001',
            name: 'Chuẩn bị tài liệu, source code & bàn giao',
            department: 'Kỹ thuật',
            confirmDepartments: ['Kỹ thuật', 'Kinh doanh'],
            estimatedDays: 5,
            description: 'Nghiệm thu bàn giao cho khách hàng',
          },
        ],
      },
      {
        id: 'GD07',
        code: 'GD07',
        name: 'Kế toán thu tiền',
        order: 7,
        departments: ['Kế toán', 'Kinh doanh'],
        isMandatory: true,
        isLockable: false,
        tasks: [
          {
            code: 'KT004',
            name: 'Theo dõi & thu hồi công nợ theo đợt',
            department: 'Kế toán',
            confirmDepartments: ['Kế toán'],
            estimatedDays: 30,
            description: 'Thu tiền theo hợp đồng',
          },
        ],
      },
      {
        id: 'GD08',
        code: 'GD08',
        name: 'Bảo trì',
        order: 8,
        departments: ['Kỹ thuật'],
        isMandatory: false,
        isLockable: false,
        tasks: [
          {
            code: 'BT001',
            name: 'Tiếp nhận & xử lý yêu cầu bảo trì',
            department: 'Kỹ thuật',
            confirmDepartments: ['Kỹ thuật'],
            estimatedDays: 365,
            description: 'Hỗ trợ kỹ thuật sau nghiệm thu',
          },
        ],
      },
    ],
  },
];

// Initial default Project according to docx example
const DEFAULT_PROJECTS = [
  {
    id: 'PRJ-2026-001',
    code: 'PRJ-ABC-001',
    name: 'ABC – Xây dựng phần mềm quản lý kho',
    customerName: 'Công ty Cổ phần Thương mại ABC',
    projectType: 'Xây dựng phần mềm theo yêu cầu',
    workflowId: 'WF-SW-001',
    workflowCode: 'WF-SW-001',
    workflowName: 'Xây dựng phần mềm theo yêu cầu',
    status: 'IN_PROGRESS', // NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD
    currentStageId: 'GD04',
    createdAt: '2026-02-01 09:00',
    managerName: 'Nguyễn Văn Quyền (PM)',
    // Financial data for Stage 3 (Contract & Profit)
    contractData: {
      sellingPrice: 500000000, // 500,000,000 VND
      estimatedCost: 280000000, // 280,000,000 VND
      laborCost: 200000000,
      totalManDays: 100, // 100 man-days
      otherCost: 80000000,
      profit: 220000000, // 220,000,000 VND
      profitMargin: 44.0, // 44%
      isLocked: true, // Data locked after confirmations
      lockedAt: '2026-02-15 14:30',
      lockedBy: 'Trần Kinh Doanh & Nguyễn Kỹ Thuật',
      confirmations: {
        kinhDoanh: { confirmed: true, confirmedBy: 'Trần Văn KD', confirmedAt: '2026-02-15 10:00' },
        kyThuat: { confirmed: true, confirmedBy: 'Nguyễn Kỹ Thuật', confirmedAt: '2026-02-15 14:30' },
      },
      contractNumber: 'HD-2026/ABC-SOF',
      contractDate: '2026-02-15',
    },
    // Programming execution data for Stage 4
    programmingData: {
      totalPlannedDays: 100,
      usedDays: 60,
      remainingDays: 40,
      devAllocations: [
        { id: 'DEV-A', name: 'Dev A (Frontend)', allocatedDays: 30, usedDays: 20, status: 'IN_PROGRESS' },
        { id: 'DEV-B', name: 'Dev B (Backend)', allocatedDays: 40, usedDays: 25, status: 'IN_PROGRESS' },
        { id: 'DEV-C', name: 'Dev C (Mobile/Fullstack)', allocatedDays: 30, usedDays: 15, status: 'IN_PROGRESS' },
      ],
      extraTasks: [
        { id: 'EX-01', name: 'Tích hợp quét mã QR kho mới', manDays: 5, requestedBy: 'Khách hàng ABC', status: 'APPROVED' },
      ],
    },
    // Tester data for Stage 5
    testerData: {
      testCasesCount: 45,
      passedCases: 38,
      failedCases: 4,
      bugs: [
        {
          id: 'BUG-101',
          code: 'BUG-101',
          title: 'Lỗi không lưu được phiếu nhập kho khi số lượng > 10,000',
          severity: 'HIGH', // LOW, MEDIUM, HIGH, CRITICAL
          priority: 'HIGH',
          status: 'IN_FIX', // OPEN, IN_FIX, RETEST, PASSED
          assignedTo: 'Dev B (Backend)',
          createdDate: '2026-08-10',
          feature: 'Quản lý Nhập Kho',
        },
        {
          id: 'BUG-102',
          code: 'BUG-102',
          title: 'Sai lệch định dạng ngày tháng hiển thị trên báo cáo tồn kho PDF',
          severity: 'MEDIUM',
          priority: 'MEDIUM',
          status: 'RETEST',
          assignedTo: 'Dev A (Frontend)',
          createdDate: '2026-08-12',
          feature: 'Báo cáo Tồn kho',
        },
        {
          id: 'BUG-103',
          code: 'BUG-103',
          title: 'Không hiển thị thông báo lỗi khi trùng mã vạch sản phẩm',
          severity: 'LOW',
          priority: 'LOW',
          status: 'PASSED',
          assignedTo: 'Dev A (Frontend)',
          createdDate: '2026-08-05',
          feature: 'Danh mục Vật tư',
        },
      ],
    },
    // Handover data for Stage 6
    handoverData: {
      isCompleted: false,
      checklist: [
        { id: 'HK-1', title: 'Tài liệu Mô tả Thiết kế Hệ thống & API', isDone: true },
        { id: 'HK-2', title: 'Source Code hoàn chỉnh trên Git repository', isDone: true },
        { id: 'HK-3', title: 'Tài liệu Hướng dẫn Sử dụng cho Admin & User', isDone: true },
        { id: 'HK-4', title: 'Biên bản Nghiệm thu & Bàn giao phần mềm', isDone: false },
        { id: 'HK-5', title: 'Xác nhận đồng ý nghiệm thu từ đại diện Khách hàng ABC', isDone: false },
      ],
    },
    // Accounting Invoicing data for Stage 7
    accountingData: {
      contractAmount: 500000000,
      totalCollected: 300000000,
      remainingAmount: 200000000,
      assignedAccountant: 'Lê Kế Toán (Kế toán trưởng)',
      installments: [
        {
          id: 'INS-1',
          name: 'Đợt 1: Tạm ứng sau khi ký hợp đồng (30%)',
          amount: 150000000,
          dueDate: '2026-02-20',
          status: 'PAID',
          paidDate: '2026-02-18',
          receiptNo: 'PT-2026-0042',
        },
        {
          id: 'INS-2',
          name: 'Đợt 2: Nghiệm thu giai đoạn 1 Lập trình (30%)',
          amount: 150000000,
          dueDate: '2026-06-30',
          status: 'PAID',
          paidDate: '2026-07-02',
          receiptNo: 'PT-2026-0189',
        },
        {
          id: 'INS-3',
          name: 'Đợt 3: Thanh toán khi nghiệm thu bàn giao (40%)',
          amount: 200000000,
          dueDate: '2026-09-30',
          status: 'PENDING',
          paidDate: null,
          receiptNo: '',
        },
      ],
    },
    // Maintenance data for Stage 8
    maintenanceData: {
      tickets: [
        {
          id: 'MNT-01',
          title: 'Hỗ trợ kết nối máy in tem mã vạch Zebra',
          requestedBy: 'Bộ phận Kho ABC',
          assignedDev: 'Dev C',
          priority: 'MEDIUM',
          status: 'RESOLVED',
          createdAt: '2026-08-01',
          resolvedAt: '2026-08-02',
        },
      ],
    },
    // Stages instantiated for this project
    stages: [
      {
        id: 'PRJ_GD01',
        stageCode: 'GD01',
        name: 'GD01 – Khách hàng tiềm năng',
        departments: ['Marketing', 'Kinh doanh'],
        order: 1,
        status: 'DONE',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1001',
            code: 'KD001',
            name: 'Tìm kiếm & tiếp nhận khách hàng tiềm năng',
            department: 'Marketing',
            assignee: 'Nguyễn Marketing',
            status: 'DONE',
            confirmations: [{ department: 'Kinh doanh', isConfirmed: true }],
          },
        ],
      },
      {
        id: 'PRJ_GD02',
        stageCode: 'GD02',
        name: 'GD02 – Tư vấn & báo giá',
        departments: ['Kinh doanh', 'Kỹ thuật'],
        order: 2,
        status: 'DONE',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1002',
            code: 'KD002',
            name: 'Tiếp nhận yêu cầu',
            department: 'Kinh doanh',
            assignee: 'Trần Văn KD',
            status: 'DONE',
            confirmations: [{ department: 'Kinh doanh', isConfirmed: true }],
          },
          {
            id: 'TASK-1003',
            code: 'KT001',
            name: 'Ước tính ngày công',
            department: 'Kỹ thuật',
            assignee: 'Nguyễn Kỹ Thuật',
            status: 'DONE',
            confirmations: [{ department: 'Kỹ thuật', isConfirmed: true }],
          },
          {
            id: 'TASK-1004',
            code: 'KD003',
            name: 'Hoàn thiện báo giá',
            department: 'Kinh doanh',
            assignee: 'Trần Văn KD',
            status: 'DONE',
            confirmations: [{ department: 'Kinh doanh', isConfirmed: true }],
          },
        ],
      },
      {
        id: 'PRJ_GD03',
        stageCode: 'GD03',
        name: 'GD03 – Hợp đồng & lợi nhuận',
        departments: ['Kinh doanh', 'Kỹ thuật'],
        order: 3,
        status: 'DONE',
        isLockable: true,
        tasks: [
          {
            id: 'TASK-1005',
            code: 'KD004',
            name: 'Chốt hợp đồng & giá bán',
            department: 'Kinh doanh',
            assignee: 'Trần Văn KD',
            status: 'DONE',
            confirmations: [
              { department: 'Kinh doanh', isConfirmed: true },
              { department: 'Kỹ thuật', isConfirmed: true },
            ],
          },
        ],
      },
      {
        id: 'PRJ_GD04',
        stageCode: 'GD04',
        name: 'GD04 – Thực thi lập trình',
        departments: ['Kỹ thuật'],
        order: 4,
        status: 'IN_PROGRESS',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1006',
            code: 'KT002',
            name: 'Phân bổ Lập trình viên & ngày công',
            department: 'Kỹ thuật',
            assignee: 'Nguyễn Kỹ Thuật (Tech Lead)',
            status: 'DONE',
            confirmations: [{ department: 'Kỹ thuật', isConfirmed: true }],
          },
          {
            id: 'TASK-1007',
            code: 'KT003',
            name: 'Lập trình hoàn thiện các Module kho',
            department: 'Kỹ thuật',
            assignee: 'Dev A, Dev B, Dev C',
            status: 'IN_PROGRESS',
            confirmations: [{ department: 'Kỹ thuật', isConfirmed: false }],
          },
        ],
      },
      {
        id: 'PRJ_GD05',
        stageCode: 'GD05',
        name: 'GD05 – Tester',
        departments: ['Tester', 'Kỹ thuật'],
        order: 5,
        status: 'TODO',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1008',
            code: 'TS001',
            name: 'Kiểm thử toàn bộ hệ thống & log bug',
            department: 'Tester',
            assignee: 'Phạm Tester',
            status: 'TODO',
            confirmations: [{ department: 'Tester', isConfirmed: false }],
          },
        ],
      },
      {
        id: 'PRJ_GD06',
        stageCode: 'GD06',
        name: 'GD06 – Bàn giao',
        departments: ['Kỹ thuật', 'Kinh doanh'],
        order: 6,
        status: 'TODO',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1009',
            code: 'BG001',
            name: 'Checklist bàn giao & ký nghiệm thu',
            department: 'Kỹ thuật',
            assignee: 'Nguyễn Kỹ Thuật',
            status: 'TODO',
            confirmations: [{ department: 'Kinh doanh', isConfirmed: false }],
          },
        ],
      },
      {
        id: 'PRJ_GD07',
        stageCode: 'GD07',
        name: 'GD07 – Thu tiền',
        departments: ['Kế toán', 'Kinh doanh'],
        order: 7,
        status: 'IN_PROGRESS',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1010',
            code: 'KT004',
            name: 'Thu hồi công nợ các đợt',
            department: 'Kế toán',
            assignee: 'Lê Kế Toán',
            status: 'IN_PROGRESS',
            confirmations: [{ department: 'Kế toán', isConfirmed: false }],
          },
        ],
      },
      {
        id: 'PRJ_GD08',
        stageCode: 'GD08',
        name: 'GD08 – Bảo trì',
        departments: ['Kỹ thuật'],
        order: 8,
        status: 'TODO',
        isLockable: false,
        tasks: [
          {
            id: 'TASK-1011',
            code: 'BT001',
            name: 'Bảo trì & tiếp nhận yêu cầu nâng cấp',
            department: 'Kỹ thuật',
            assignee: 'Đội Bảo trì Kỹ thuật',
            status: 'TODO',
            confirmations: [{ department: 'Kỹ thuật', isConfirmed: false }],
          },
        ],
      },
    ],
  },
];

// Initial Unlock Requests
const DEFAULT_UNLOCK_REQUESTS = [
  {
    id: 'ULK-001',
    projectId: 'PRJ-2026-001',
    projectName: 'ABC – Xây dựng phần mềm quản lý kho',
    stageName: 'GD03 – Hợp đồng & lợi nhuận',
    requestedBy: 'Trần Văn KD (Phòng Kinh doanh)',
    requestedAt: '2026-08-01 11:20',
    reason: 'Cập nhật thêm chi phí máy chủ Cloud theo phụ lục hợp đồng bổ sung 01',
    status: 'APPROVED', // PENDING, APPROVED, REJECTED
    approvedBy: 'Giám đốc Ban Dự án',
    approvedAt: '2026-08-01 14:00',
    note: 'Đã duyệt cho phép cập nhật phụ lục chi phí cloud',
  },
];

// Activity Logs
const DEFAULT_ACTIVITY_LOGS = [
  {
    id: 'LOG-001',
    projectId: 'PRJ-2026-001',
    timestamp: '2026-02-15 14:30',
    user: 'Kinh doanh & Kỹ thuật',
    action: 'LOCK_DATA',
    detail: 'Chốt hợp đồng & LOCK dữ liệu tài chính dự án ABC',
  },
  {
    id: 'LOG-002',
    projectId: 'PRJ-2026-001',
    timestamp: '2026-08-01 14:00',
    user: 'Giám đốc',
    action: 'APPROVE_UNLOCK',
    detail: 'Duyệt yêu cầu mở khóa sửa thông tin hợp đồng',
  },
  {
    id: 'LOG-003',
    projectId: 'PRJ-2026-001',
    timestamp: '2026-08-01 15:10',
    user: 'Trần Văn KD',
    action: 'RELOCK_DATA',
    detail: 'Cập nhật chi phí mới và LOCK lại dữ liệu hợp đồng',
  },
];

// Helper functions for LocalStorage persistence
function getItem(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to localStorage:`, e);
  }
}

// Service API Object
export const projectWorkflowService = {
  // WORKFLOW TEMPLATES
  getWorkflows: () => {
    let list = getItem(STORAGE_KEYS.WORKFLOWS, null);
    if (!list || list.length === 0) {
      list = DEFAULT_WORKFLOWS;
      setItem(STORAGE_KEYS.WORKFLOWS, list);
    }
    return list;
  },

  getWorkflowById: (id) => {
    const list = projectWorkflowService.getWorkflows();
    return list.find((w) => w.id === id || w.code === id) || null;
  },

  saveWorkflow: (workflow) => {
    const list = projectWorkflowService.getWorkflows();
    const index = list.findIndex((w) => w.id === workflow.id);
    if (index >= 0) {
      list[index] = { ...workflow, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    } else {
      list.push({
        ...workflow,
        id: workflow.id || `WF-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      });
    }
    setItem(STORAGE_KEYS.WORKFLOWS, list);
    return list;
  },

  cloneWorkflow: (id) => {
    const target = projectWorkflowService.getWorkflowById(id);
    if (!target) return null;

    const clonedCode = `${target.code}-COPY-${Math.floor(Math.random() * 1000)}`;
    const cloned = {
      ...target,
      id: `WF-${Date.now().toString(36).toUpperCase()}`,
      code: clonedCode,
      name: `${target.name} (Bản sao)`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    projectWorkflowService.saveWorkflow(cloned);
    return cloned;
  },

  toggleWorkflowStatus: (id) => {
    const list = projectWorkflowService.getWorkflows();
    const target = list.find((w) => w.id === id);
    if (target) {
      target.isActive = !target.isActive;
      setItem(STORAGE_KEYS.WORKFLOWS, list);
    }
    return list;
  },

  deleteWorkflow: (id) => {
    let list = projectWorkflowService.getWorkflows();
    list = list.filter((w) => w.id !== id);
    setItem(STORAGE_KEYS.WORKFLOWS, list);
    return list;
  },

  // PROJECTS INSTANCES
  getProjects: () => {
    let list = getItem(STORAGE_KEYS.PROJECTS, null);
    if (!list || list.length === 0) {
      list = DEFAULT_PROJECTS;
      setItem(STORAGE_KEYS.PROJECTS, list);
    }
    return list;
  },

  getProjectById: (id) => {
    const list = projectWorkflowService.getProjects();
    return list.find((p) => p.id === id || p.code === id) || null;
  },

  createProjectFromWorkflow: ({ name, customerName, projectType, workflowId, managerName }) => {
    const workflow = projectWorkflowService.getWorkflowById(workflowId);
    if (!workflow) throw new Error('Workflow mẫu không tồn tại');

    const prjId = `PRJ-${Date.now()}`;
    const prjCode = `PRJ-${name.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    // Auto-generate project stages and tasks based on workflow template
    const instantiatedStages = (workflow.stages || []).map((stg) => ({
      id: `PRJ_${stg.code}_${Date.now()}`,
      stageCode: stg.code,
      name: `${stg.code} – ${stg.name}`,
      departments: [...stg.departments],
      order: stg.order,
      status: stg.order === 1 ? 'IN_PROGRESS' : 'TODO',
      isLockable: stg.isLockable || false,
      tasks: (stg.tasks || []).map((tsk, idx) => ({
        id: `TASK-${Date.now()}-${idx}`,
        code: tsk.code,
        name: tsk.name,
        department: tsk.department,
        assignee: 'Chưa phân công',
        status: 'TODO',
        confirmations: (tsk.confirmDepartments || []).map((dept) => ({
          department: dept,
          isConfirmed: false,
        })),
      })),
    }));

    const newProject = {
      id: prjId,
      code: prjCode,
      name,
      customerName,
      projectType,
      workflowId: workflow.id,
      workflowCode: workflow.code,
      workflowName: workflow.name,
      status: 'IN_PROGRESS',
      currentStageId: instantiatedStages[0]?.stageCode || 'GD01',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      managerName: managerName || 'Chưa phân công',

      // Initialize financials for Contract stage
      contractData: {
        sellingPrice: 0,
        estimatedCost: 0,
        laborCost: 0,
        totalManDays: 0,
        otherCost: 0,
        profit: 0,
        profitMargin: 0,
        isLocked: false,
        confirmations: {
          kinhDoanh: { confirmed: false, confirmedBy: '', confirmedAt: '' },
          kyThuat: { confirmed: false, confirmedBy: '', confirmedAt: '' },
        },
        contractNumber: '',
        contractDate: '',
      },

      // Initialize programming execution data
      programmingData: {
        totalPlannedDays: 0,
        usedDays: 0,
        remainingDays: 0,
        devAllocations: [],
        extraTasks: [],
      },

      // Initialize tester data
      testerData: {
        testCasesCount: 0,
        passedCases: 0,
        failedCases: 0,
        bugs: [],
      },

      // Initialize handover checklist
      handoverData: {
        isCompleted: false,
        checklist: [
          { id: 'HK-1', title: 'Tài liệu Mô tả Thiết kế Hệ thống & API', isDone: false },
          { id: 'HK-2', title: 'Source Code hoàn chỉnh trên Git repository', isDone: false },
          { id: 'HK-3', title: 'Tài liệu Hướng dẫn Sử dụng cho Admin & User', isDone: false },
          { id: 'HK-4', title: 'Biên bản Nghiệm thu & Bàn giao phần mềm', isDone: false },
          { id: 'HK-5', title: 'Xác nhận nghiệm thu từ phía Khách hàng', isDone: false },
        ],
      },

      // Initialize accounting invoicing
      accountingData: {
        contractAmount: 0,
        totalCollected: 0,
        remainingAmount: 0,
        assignedAccountant: '',
        installments: [],
      },

      // Initialize maintenance tickets
      maintenanceData: {
        tickets: [],
      },

      stages: instantiatedStages,
    };

    const projects = projectWorkflowService.getProjects();
    projects.unshift(newProject);
    setItem(STORAGE_KEYS.PROJECTS, projects);

    // Log action
    projectWorkflowService.addActivityLog(prjId, 'Tự động khởi tạo Dự án & Quy trình từ Workflow ' + workflow.code);

    return newProject;
  },

  updateProject: (project) => {
    const list = projectWorkflowService.getProjects();
    const index = list.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      list[index] = project;
      setItem(STORAGE_KEYS.PROJECTS, list);
    }
    return project;
  },

  // CONTRACT LOCK & UNLOCK WORKFLOW
  confirmContractStage: (projectId, department, user) => {
    const project = projectWorkflowService.getProjectById(projectId);
    if (!project) return null;

    if (!project.contractData) {
      project.contractData = { confirmations: {} };
    }

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (department === 'Kinh doanh') {
      project.contractData.confirmations.kinhDoanh = {
        confirmed: true,
        confirmedBy: user || 'Kinh doanh',
        confirmedAt: nowStr,
      };
    } else if (department === 'Kỹ thuật') {
      project.contractData.confirmations.kyThuat = {
        confirmed: true,
        confirmedBy: user || 'Kỹ thuật',
        confirmedAt: nowStr,
      };
    }

    // Check if both Kinh doanh and Ky thuat have confirmed -> LOCK DATA!
    const kdConfirmed = project.contractData.confirmations.kinhDoanh?.confirmed;
    const ktConfirmed = project.contractData.confirmations.kyThuat?.confirmed;

    if (kdConfirmed && ktConfirmed) {
      project.contractData.isLocked = true;
      project.contractData.lockedAt = nowStr;
      project.contractData.lockedBy = `${project.contractData.confirmations.kinhDoanh.confirmedBy} & ${project.contractData.confirmations.kyThuat.confirmedBy}`;

      projectWorkflowService.addActivityLog(
        projectId,
        `Kinh doanh và Kỹ thuật đã xác nhận. Dữ liệu Hợp đồng & Lợi nhuận chính thức bị LOCK!`
      );
    }

    projectWorkflowService.updateProject(project);
    return project;
  },

  requestUnlockContract: (projectId, user, reason) => {
    const reqs = getItem(STORAGE_KEYS.UNLOCK_REQUESTS, DEFAULT_UNLOCK_REQUESTS);
    const newReq = {
      id: `ULK-${Date.now().toString(36).toUpperCase()}`,
      projectId,
      projectName: projectWorkflowService.getProjectById(projectId)?.name || projectId,
      stageName: 'GD03 – Hợp đồng & lợi nhuận',
      requestedBy: user,
      requestedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      reason,
      status: 'PENDING',
      approvedBy: null,
      approvedAt: null,
      note: '',
    };
    reqs.unshift(newReq);
    setItem(STORAGE_KEYS.UNLOCK_REQUESTS, reqs);

    projectWorkflowService.addActivityLog(projectId, `Gửi yêu cầu mở khóa hợp đồng. Lý do: ${reason}`);

    return newReq;
  },

  approveUnlockRequest: (requestId, isApproved, managerUser, note = '') => {
    const reqs = getItem(STORAGE_KEYS.UNLOCK_REQUESTS, DEFAULT_UNLOCK_REQUESTS);
    const req = reqs.find((r) => r.id === requestId);
    if (!req) return null;

    req.status = isApproved ? 'APPROVED' : 'REJECTED';
    req.approvedBy = managerUser;
    req.approvedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    req.note = note;

    setItem(STORAGE_KEYS.UNLOCK_REQUESTS, reqs);

    if (isApproved) {
      const project = projectWorkflowService.getProjectById(req.projectId);
      if (project && project.contractData) {
        project.contractData.isLocked = false; // Unlock for editing
        projectWorkflowService.updateProject(project);

        projectWorkflowService.addActivityLog(
          req.projectId,
          `Quản lý (${managerUser}) đã DUYỆT mở khóa dữ liệu hợp đồng. Lý do xin mở khóa: ${req.reason}`
        );
      }
    } else {
      projectWorkflowService.addActivityLog(
        req.projectId,
        `Quản lý (${managerUser}) đã TỪ CHỐI mở khóa dữ liệu hợp đồng.`
      );
    }

    return req;
  },

  getUnlockRequests: (projectId = null) => {
    const reqs = getItem(STORAGE_KEYS.UNLOCK_REQUESTS, DEFAULT_UNLOCK_REQUESTS);
    if (projectId) {
      return reqs.filter((r) => r.projectId === projectId);
    }
    return reqs;
  },

  // ACTIVITY LOGS
  getActivityLogs: (projectId = null) => {
    const logs = getItem(STORAGE_KEYS.ACTIVITY_LOGS, DEFAULT_ACTIVITY_LOGS);
    if (projectId) {
      return logs.filter((l) => l.projectId === projectId);
    }
    return logs;
  },

  addActivityLog: (projectId, detail, user = 'Hệ thống') => {
    const logs = getItem(STORAGE_KEYS.ACTIVITY_LOGS, DEFAULT_ACTIVITY_LOGS);
    const newLog = {
      id: `LOG-${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      user,
      action: 'WORKFLOW_EVENT',
      detail,
    };
    logs.unshift(newLog);
    setItem(STORAGE_KEYS.ACTIVITY_LOGS, logs);
    return newLog;
  },
};

export default projectWorkflowService;
