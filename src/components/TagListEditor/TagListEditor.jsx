import { useCallback, useRef, useState } from 'react';
import { Input, Typography } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import './TagListEditor.css';

const { Text } = Typography;

// Cycling color palette for tags (matches table display)
const TAG_COLORS = [
  '#197dd3',
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#4f46e5',
];

const getTagColor = (index) => TAG_COLORS[index % TAG_COLORS.length];

/**
 * TagListEditor — Tag/chip input for feature lists
 *
 * Input behavior:
 *   - Press Enter or comma (,) to add a tag
 *   - Click × on a chip to remove it
 *
 * Storage format: tags joined by newline "\n" (one tag per line)
 * This matches the existing lv100 plain-text storage format.
 *
 * Props:
 *   value       {string}   Newline-separated plain text
 *   onChange    {Function} Called with new newline-separated string
 *   placeholder {string}   Input placeholder
 *   maxTags     {number}   Max number of tags (default: 50)
 */
const TagListEditor = ({
  value = '',
  onChange,
  placeholder = 'Gõ tính năng rồi nhấn Enter hoặc dấu phẩy để thêm...',
  maxTags = 50,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Parse stored newline-separated text → array of non-empty strings
  const tags = (value || '')
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  const emitChange = useCallback(
    (newTags) => {
      if (onChange) onChange(newTags.join('\n'));
    },
    [onChange],
  );

  const addTag = useCallback(
    (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (tags.includes(trimmed)) {
        setInputValue('');
        return;
      }
      if (tags.length >= maxTags) return;
      emitChange([...tags, trimmed]);
      setInputValue('');
    },
    [tags, maxTags, emitChange],
  );

  const removeTag = useCallback(
    (index) => {
      emitChange(tags.filter((_, i) => i !== index));
    },
    [tags, emitChange],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        // Remove last tag when backspace on empty input
        removeTag(tags.length - 1);
      }
    },
    [inputValue, addTag, removeTag, tags.length],
  );

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    // If user types a comma, treat as submit
    if (val.endsWith(',')) {
      addTag(val.slice(0, -1));
    } else {
      setInputValue(val);
    }
  }, [addTag]);

  const handleWrapperClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="tle-wrapper" onClick={handleWrapperClick}>
      {/* Tag chips */}
      <div className="tle-chips-area">
        {tags.map((tag, i) => {
          const color = getTagColor(i);
          return (
            <span
              key={i}
              className="tle-chip"
              style={{
                background: `${color}15`,
                color,
                border: `1px solid ${color}45`,
              }}
            >
              <span className="tle-chip-text" title={tag}>{tag}</span>
              <button
                type="button"
                className="tle-chip-remove"
                style={{ color }}
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                aria-label={`Xóa "${tag}"`}
              >
                <CloseOutlined style={{ fontSize: 9 }} />
              </button>
            </span>
          );
        })}

        {/* Inline input */}
        {tags.length < maxTags && (
          <span className="tle-input-wrapper">
            <Input
              ref={inputRef}
              size="small"
              variant="borderless"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? placeholder : 'Thêm tính năng...'}
              className="tle-input"
            />
          </span>
        )}
      </div>

      {/* Footer hint */}
      <div className="tle-footer">
        {tags.length > 0 ? (
          <>
            <span style={{ color: '#197dd3', fontWeight: 600 }}>{tags.length}</span> tính năng
            &nbsp;·&nbsp;
            <Text type="secondary" style={{ fontSize: 11 }}>
              Nhấn <kbd className="tle-kbd">Enter</kbd> hoặc <kbd className="tle-kbd">,</kbd> để thêm
              &nbsp;·&nbsp; <kbd className="tle-kbd">⌫</kbd> để xóa cuối
            </Text>
          </>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>
            Nhấn <kbd className="tle-kbd">Enter</kbd> hoặc <kbd className="tle-kbd">,</kbd> sau mỗi tính năng
          </Text>
        )}
      </div>

      {/* Preview badge row (matches table display) */}
      {tags.length > 0 && (
        <div className="tle-preview">
          <div className="tle-preview-label">
            <PlusOutlined style={{ fontSize: 10 }} /> Xem trước trong bảng
          </div>
          <div className="tle-preview-chips">
            {tags.slice(0, 6).map((tag, i) => {
              const color = getTagColor(i);
              return (
                <span
                  key={i}
                  className="tle-preview-chip"
                  style={{
                    background: `${color}18`,
                    color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {tag}
                </span>
              );
            })}
            {tags.length > 6 && (
              <span className="tle-preview-more">+{tags.length - 6} tính năng...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagListEditor;
