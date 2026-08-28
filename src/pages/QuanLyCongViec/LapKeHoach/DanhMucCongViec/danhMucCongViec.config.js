const commonFields = [
  { name: 'lv001', label: 'Mã', required: true, maxLength: 32 },
  { name: 'lv002', label: 'Tên', required: true, maxLength: 255 },
  { name: 'lv003', label: 'Hoạt động', type: 'active' },
  { name: 'lv004', label: 'Ghi chú', type: 'textarea', maxLength: 255 },
];

export const danhMucCongViecConfigs = {
  loaiDoiTuong: {
    table: 'ac_lv0030',
    title: 'Loại đối tượng',
    fields: [
      { name: 'lv001', label: 'Mã loại đối tượng', required: true, maxLength: 10 },
      { name: 'lv002', label: 'Tên loại đối tượng', required: true, maxLength: 255 },
    ],
  },
  loaiCongViec: { table: 'cr_lv0002', title: 'Loại công việc', fields: commonFields },
  mucCongViec: {
    table: 'cr_lv0003',
    title: 'Mục công việc phải làm',
    fields: [
      { name: 'lv001', label: 'Mã công việc', required: true, maxLength: 32 },
      { name: 'lv002', label: 'Tên công việc', required: true, maxLength: 255 },
      { name: 'lv049', label: 'Loại công việc', maxLength: 255 },
      { name: 'lv003', label: 'Hoạt động', type: 'active' },
      { name: 'lv004', label: 'Ghi chú', type: 'textarea', maxLength: 255 },
      { name: 'lv007', label: 'Mã KPI', maxLength: 255 },
      { name: 'lv008', label: 'Thông tin bổ sung 1', maxLength: 255 },
      { name: 'lv009', label: 'Thông tin bổ sung 2', maxLength: 255 },
      { name: 'lv099', label: 'Loại kế hoạch', maxLength: 255 },
    ],
  },
  diemKpi: { table: 'cr_lv0031', title: 'Điểm ± KPI', fields: commonFields },
  tienDoDuAn: { table: 'cr_lv0083', title: 'Tiến độ dự án', fields: commonFields },
  trangThaiDuAn: { table: 'cr_lv0093', title: 'Trạng thái dự án', fields: commonFields },
  thuongHieu: {
    table: 'cr_lv0157',
    title: 'Thương hiệu',
    fields: [
      { name: 'lv001', label: 'Mã thương hiệu', required: true, maxLength: 32 },
      { name: 'lv002', label: 'Tên thương hiệu', required: true, maxLength: 255 },
      { name: 'lv003', label: 'Hoạt động', type: 'active' },
      { name: 'lv004', label: 'Ghi chú', type: 'textarea', maxLength: 255 },
    ],
  },
};
