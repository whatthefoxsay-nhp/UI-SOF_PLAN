import React, { useState, useEffect } from 'react';
import * as uuid from 'uuid';
import NhapPhieuChiNhanhContent from './NhapPhieuChiNhanhContent';
import NhapChiTietPhieuChi from './NhapChiTietPhieuChi';
import '../PhieuThu/NhapPhieuThuNhanh.css'; // Sử dụng CSS giống NhapPhieuThuNhanh
const uuidv4 = uuid.v4;

const STORAGE_KEY = 'phieuChi_temporaryId';

const NhapPhieuChiNhanh = ({ editingRecord, onSuccess, initialData }) => {
    const [temporaryId, setTemporaryId] = useState('');
    const [chiTietCount, setChiTietCount] = useState(0);

    useEffect(() => {
        if (!editingRecord) {
            // Lấy UUID từ localStorage hoặc tạo mới nếu chưa có
            const savedId = localStorage.getItem(STORAGE_KEY);
            if (savedId) {
                setTemporaryId(savedId);
            } else {
                const newId = uuidv4().replace(/-/g, ''); // Bỏ dấu gạch ngang: 36 ký tự -> 32 ký tự
                setTemporaryId(newId);
                localStorage.setItem(STORAGE_KEY, newId);
            }
        } else {
            setTemporaryId('');
            // Xóa UUID tạm khi đang edit
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [editingRecord]);

    return (
        <div className="nhap-phieu-thu-nhanh-container-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="section-phieu-chi">
                <NhapPhieuChiNhanhContent
                    editingRecord={editingRecord}
                    onSuccess={() => {
                        // Xóa UUID tạm sau khi lưu thành công
                        localStorage.removeItem(STORAGE_KEY);
                        if (onSuccess) onSuccess();
                    }}
                    temporaryId={temporaryId}
                    chiTietCount={chiTietCount}
                    initialData={initialData}
                />
            </div>

            {/* Chi tiết chi tiền - Hiển thị cả khi tạo mới và chỉnh sửa */}
            {(editingRecord || (temporaryId)) && (
                <div className="section-chi-tiet">
                    <NhapChiTietPhieuChi
                        temporaryId={editingRecord ? editingRecord.lv001 : temporaryId}
                        setChiTietCount={setChiTietCount}
                        isEditMode={!!editingRecord}
                        initialData={initialData}
                    />
                </div>
            )}
        </div>
    );
};

export default NhapPhieuChiNhanh;
