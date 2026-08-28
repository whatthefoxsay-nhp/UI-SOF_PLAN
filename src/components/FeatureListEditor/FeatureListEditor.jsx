import { useCallback } from 'react';
import { Input, Typography } from 'antd';
import './FeatureListEditor.css';

const { Text } = Typography;

/**
 * parseTextFeatures — shared parsing helper
 * Input: "Title\nDesc\nTitle2\nDesc2" (multi-line plain text)
 * Output: [{title, desc}, ...]
 */
const parseTextFeatures = (text) => {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  for (let i = 0; i < lines.length; i += 2) {
    if (lines[i]) {
      items.push({ title: lines[i], desc: lines[i + 1] || '' });
    }
  }
  return items;
};

/**
 * FeatureListEditor — Split-view feature list editor
 *
 * Props:
 *   value       {string}   Plain text in "Title\nDesc\n..." format
 *   onChange    {Function} Called with new string value
 *   placeholder {string}   Textarea placeholder
 *   label       {string}   Preview section heading
 *   accentColor {string}   Accent color for preview icons (default: '#10b981')
 *   icon        {string}   Icon character for preview bullets (default: '✦')
 *   rows        {number}   Textarea rows (default: 8)
 */
const FeatureListEditor = ({
  value = '',
  onChange,
  placeholder = 'Mỗi tính năng 2 dòng:\nDòng lẻ: Tiêu đề\nDòng chẵn: Mô tả ngắn\n\nVí dụ:\nTùy biến linh hoạt\nCấu hình theo yêu cầu đặc thù của doanh nghiệp.',
  label = 'Xem trước',
  accentColor = '#10b981',
  icon = '✦',
  rows = 8,
}) => {
  const features = parseTextFeatures(value);

  const handleChange = useCallback(
    (e) => {
      if (onChange) onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="fle-wrapper">
      {/* Left: Textarea */}
      <div className="fle-input-panel">
        <div className="fle-panel-label">
          <span className="fle-panel-dot fle-dot-edit" />
          Soạn thảo
        </div>
        <Input.TextArea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          className="fle-textarea"
          style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: '1.6' }}
        />
        <div className="fle-hint">
          Dòng <b>lẻ</b>: Tiêu đề &nbsp;·&nbsp; Dòng <b>chẵn</b>: Mô tả &nbsp;·&nbsp;{' '}
          {features.length > 0 ? (
            <span style={{ color: accentColor }}>{features.length} mục</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>Chưa có nội dung</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="fle-divider">
        <div className="fle-divider-line" />
        <span className="fle-divider-icon">⇄</span>
        <div className="fle-divider-line" />
      </div>

      {/* Right: Preview */}
      <div className="fle-preview-panel">
        <div className="fle-panel-label">
          <span className="fle-panel-dot fle-dot-preview" />
          {label}
        </div>
        <div className="fle-preview-scroll">
          {features.length === 0 ? (
            <div className="fle-empty">
              <div className="fle-empty-icon">👀</div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Nhập nội dung bên trái để xem trước
              </Text>
            </div>
          ) : (
            features.map((f, i) => (
              <div key={i} className="fle-feature-item">
                <div className="fle-feature-title">
                  <span className="fle-feature-icon" style={{ color: accentColor }}>
                    {icon}
                  </span>
                  <span style={{ color: accentColor === '#10b981' ? '#065f46' : '#312e81' }}>
                    {f.title}
                  </span>
                </div>
                {f.desc && (
                  <div className="fle-feature-desc">{f.desc}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureListEditor;
