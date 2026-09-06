import React, { useState } from 'react';
import { Tabs, Dropdown, Space, Button, Popover } from 'antd';
import { Clock, X, Layers, Minimize2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTabs } from '../../../contexts/TabContext';
import { IconRenderer, getTabMetadata } from '../../../utils/menuUtils';
import TabHistoryDrawer from './TabHistoryDrawer';
import './TabBar.css';

const TabPreviewCard = ({ tab, displayLabel }) => {
  return (
    <div className="tab-preview-card">
      <div className="tab-preview-header">
        <IconRenderer name={tab.iconName} size={14} className="tab-preview-icon" />
        <span className="tab-preview-title">{displayLabel}</span>
      </div>
      <div className="tab-preview-route">
        <span className="tab-preview-url">{tab.path}</span>
      </div>
    </div>
  );
};

const TabBar = () => {
  const { tabs, activeTabKey, closeTab, closeAll, closeOthers, selectTab } = useTabs();
  const { t } = useTranslation();
  const [historyVisible, setHistoryVisible] = useState(false);

  const handleEdit = (targetKey, action) => {
    if (action === 'remove') {
      closeTab(targetKey);
    }
  };

  const getContextMenuItems = (tab) => {
    const items = [];
    
    if (tab.isClosable) {
      items.push({
        key: 'close',
        label: t('common.closeThisTab', 'Đóng tab này'),
        icon: <X size={14} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
        onClick: () => closeTab(tab.key)
      });
    }

    if (tabs.length > 1) {
      items.push({
        key: 'close-others',
        label: t('common.closeOtherTabs', 'Đóng các tab khác'),
        icon: <Minimize2 size={14} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
        onClick: () => closeOthers(tab.key)
      });
      items.push({
        key: 'close-all',
        label: t('common.closeAllTabs', 'Đóng tất cả tab'),
        icon: <Trash2 size={14} style={{ display: 'inline-block', verticalAlign: 'middle' }} />,
        onClick: () => closeAll()
      });
    }

    return items;
  };

  const tabItems = tabs.map(tab => {
    const meta = getTabMetadata(tab.path, t);
    const displayLabel = meta?.label || tab.label;

    return {
      key: tab.key,
      label: (
        <Popover
          content={<TabPreviewCard tab={tab} displayLabel={displayLabel} />}
          placement="bottomLeft"
          mouseEnterDelay={0.6}
          overlayClassName="tab-preview-popover"
          arrow={false}
        >
          <Dropdown 
            menu={{ items: getContextMenuItems(tab) }} 
            trigger={['contextMenu']}
          >
            <span className="tab-item-title">
              <IconRenderer name={tab.iconName} size={14} className="tab-icon" />
              <span className="tab-label-text">{displayLabel}</span>
            </span>
          </Dropdown>
        </Popover>
      ),
      closable: tab.isClosable
    };
  });

  return (
    <div className="erp-tab-bar-container">
      <Tabs
        type="editable-card"
        activeKey={activeTabKey}
        onChange={selectTab}
        onEdit={handleEdit}
        hideAdd
        items={tabItems}
        className="erp-tabs"
        tabBarExtraContent={{
          right: (
            <Space size={4} className="tab-bar-actions">
              <Button
                type="text"
                className="tab-action-btn"
                icon={<Clock size={16} />}
                onClick={() => setHistoryVisible(true)}
                title={t('common.history', 'Lịch sử mở trang')}
              />
              {tabs.length > 1 && (
                <Button
                  type="text"
                  className="tab-action-btn"
                  icon={<Layers size={16} />}
                  onClick={closeAll}
                  title={t('common.closeAllTabs', 'Đóng tất cả các tab')}
                />
              )}
            </Space>
          )
        }}
      />

      <TabHistoryDrawer 
        visible={historyVisible} 
        onClose={() => setHistoryVisible(false)} 
      />
    </div>
  );
};

export default TabBar;
