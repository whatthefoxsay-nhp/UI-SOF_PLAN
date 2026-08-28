import React from 'react';
import { Button, Modal, message } from 'antd';
import { LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const { confirm } = Modal;

const DangXuat = () => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    confirm({
      title: 'Xác nhận đăng xuất',
  icon: <AlertCircle size={18} style={{ color: '#faad14' }} />,
      content: `Bạn có chắc chắn muốn đăng xuất khỏi tài khoản "${user?.username}"?`,
      okText: 'Đăng xuất',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          await logout({ skipConfirm: true });
          message.success('Đăng xuất thành công!');
        } catch (error) {
          message.error('Có lỗi xảy ra khi đăng xuất!');
        }
      },
    });
  };

  return (
    <Button
      type="text"
  icon={<LogOut size={16} />}
      onClick={handleLogout}
      className="dang-xuat-button"
    >
      Đăng xuất
    </Button>
  );
};

export default DangXuat;
