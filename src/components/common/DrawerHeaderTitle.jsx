import { Button } from 'antd';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

const DrawerHeaderTitle = ({
  title,
  onBack,
  isExpanded = false,
  onToggleExpand,
  styles,
}) => {
  return (
    <div className={styles.drawerHeaderTitle}>
      <div className={styles.drawerHeaderLeft}>
        {onBack ? (
          <button
            type="button"
            className={styles.drawerHeaderBackButton}
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ArrowLeft size={22} />
          </button>
        ) : null}
        <span className={styles.drawerHeaderLabel}>{title}</span>
      </div>
      {onToggleExpand ? (
        <Button
          type="text"
          className={styles.drawerHeaderActionButton}
          icon={isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          onClick={onToggleExpand}
        >
          {isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
        </Button>
      ) : null}
    </div>
  );
};

export default DrawerHeaderTitle;
