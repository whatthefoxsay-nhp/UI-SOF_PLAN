// Bộ lý do hủy hóa đơn chuẩn hóa, phục vụ cho cả UI bán hàng và trang log hủy đơn
export const CANCEL_REASON_GROUPS = [
	{
		id: 'GROUP_A',
		title: 'Nhóm A - Lỗi thao tác',
		description: 'Thường không ảnh hưởng kho',
		color: 'blue',
		reasons: [
			{
				code: 'A_WRONG_ITEM',
				label: 'Nhập sai món / Sai số lượng',
				description: 'Nhân viên order nhầm món hoặc số lượng.'
			},
			{
				code: 'A_WRONG_TABLE',
				label: 'Nhập sai bàn / Sai khu vực',
				description: 'Order nhầm bàn, khu vực so với thực tế.'
			},
			{
				code: 'A_DUPLICATE_ORDER',
				label: 'Trùng lặp đơn hàng',
				description: 'Vô tình tạo trùng bill, thao tác nhầm.'
			},
			{
				code: 'A_TRAINING',
				label: 'Order thử / Training',
				description: 'Dùng để đào tạo nhân viên mới hoặc test hệ thống.'
			}
		]
	},
	{
		id: 'GROUP_B',
		title: 'Nhóm B - Từ phía khách hàng',
		description: 'Có thể ảnh hưởng kho',
		color: 'orange',
		reasons: [
			{
				code: 'B_CHANGE_ORDER',
				label: 'Khách đổi món',
				description: 'Khách đổi ý chọn món khác sau khi đã in bill.'
			},
			{
				code: 'B_CANCELLED',
				label: 'Khách hủy món / Bỏ về',
				description: 'Khách chờ lâu hoặc có việc đột xuất nên hủy.'
			},
			{
				code: 'B_PAYMENT_FAILED',
				label: 'Thanh toán thất bại',
				description: 'Thẻ lỗi, khách không mang tiền hoặc ví điện tử gặp sự cố.'
			}
		]
	},
	{
		id: 'GROUP_C',
		title: 'Nhóm C - Vận hành & Chất lượng',
		description: 'Ảnh hưởng kho = Hủy hàng',
		color: 'red',
		reasons: [
			{
				code: 'C_OUT_OF_STOCK',
				label: 'Hết nguyên liệu',
				description: 'Đã order nhưng bếp/bar báo hết hàng.'
			},
			{
				code: 'C_QUALITY_ISSUE',
				label: 'Món hỏng / Làm sai công thức',
				description: 'Barista làm sai, làm đổ hoặc chất lượng không đạt yêu cầu.'
			}
		]
	},
	{
		id: 'GROUP_OTHER',
		title: 'Khác',
		description: 'Mô tả chi tiết lý do khác',
		color: 'purple',
		reasons: [
			{
				code: 'OTHER',
				label: 'Lý do khác',
				description: 'Nhập mô tả cụ thể trong ghi chú.'
			}
		]
	}
];

export const ALL_CANCEL_REASONS = CANCEL_REASON_GROUPS.flatMap((group) =>
	group.reasons.map((reason) => ({
		...reason,
		groupId: group.id,
		groupTitle: group.title,
		groupDescription: group.description,
		groupColor: group.color
	}))
);

export const CANCEL_REASON_MAP = ALL_CANCEL_REASONS.reduce((acc, reason) => {
	acc[reason.code] = reason;
	return acc;
}, {});

export const SYSTEM_AUTO_CANCEL_REASON = Object.freeze({
	cancelReasonCode: 'SYSTEM_AUTO',
	cancelReasonLabel: 'Hệ thống tự động',
	cancelReasonNote: 'Thao tác hệ thống (ví dụ: gộp bàn)'
});

export const getCancelReasonMeta = (code) => {
	if (!code) {
		return null;
	}
	return CANCEL_REASON_MAP[code] || null;
};
