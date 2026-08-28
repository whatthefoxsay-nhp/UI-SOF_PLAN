import React from 'react';
import { Spin } from 'antd';
import './Loading.css';

const Loading = ({ size = 'default', tip = 'Đang tải...', spinning = true, children }) => {
  if (children) {
    return (
      <Spin spinning={spinning} tip={tip} size={size}>
        {children}
      </Spin>
    );
  }

  return (
    <div className="loading-container">
      <Spin size={size} tip={tip} />
    </div>
  );
};

export default Loading;
