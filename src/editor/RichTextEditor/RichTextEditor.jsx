import { useCallback, useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';

// Full-featured toolbar configuration for the editor
const TOOLBAR_CONFIG = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  [{ color: [] }, { background: [] }],
  ['link', 'image', 'video'],
  ['clean'],
];

const quillModules = {
  toolbar: TOOLBAR_CONFIG,
  history: {
    delay: 1000,
    maxStack: 100,
    userOnly: true,
  },
  clipboard: {
    matchVisual: false,
  },
};

const quillFormats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'blockquote', 'code-block',
  'script',
  'list', 'bullet', 'check', 'indent',
  'align',
  'color', 'background',
  'link', 'image', 'video',
];

/**
 * RichTextEditor — Enhanced ReactQuill wrapper
 *
 * Props:
 *   value        {string}   HTML string
 *   onChange     {Function} Called with new HTML string on every change
 *   placeholder  {string}   Editor placeholder text
 *   minHeight    {string}   Min height of editable area (default: '200px')
 *   readOnly     {boolean}  Render as read-only view
 */
const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '200px',
  readOnly = false,
  defaultMode = 'visual',
}) => {
  const quillRef = useRef(null);
  const [editMode, setEditMode] = useState(defaultMode);

  useEffect(() => {
    setEditMode(defaultMode);
  }, [defaultMode]);

  // Sync external value changes (e.g., form reset / drawer reopen)
  // ReactQuill handles this via its `value` prop — but we need to avoid
  // cursor-jumping on each keystroke. ReactQuill is controlled so value
  // updates should only come when the source differs from internal.
  const handleChange = useCallback(
    (htmlContent) => {
      if (onChange) {
        // Quill emits '<p><br></p>' for empty — normalize to ''
        onChange(htmlContent === '<p><br></p>' ? '' : htmlContent);
      }
    },
    [onChange],
  );

  return (
    <div className={`rte-wrapper${readOnly ? ' rte-readonly' : ''}`}>
      {!readOnly && (
        <div className="rte-header-bar" style={{ padding: '6px 12px', display: 'flex', justifyContent: 'flex-end', background: '#f6f9ff', borderBottom: '1px solid #cbd5e1', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Chế độ:</span>
          <div className="rte-mode-tabs">
            <button
              type="button"
              className={`rte-mode-tab ${editMode === 'visual' ? 'active' : ''}`}
              onClick={() => setEditMode('visual')}
            >
              Soạn thảo trực quan
            </button>
            <button
              type="button"
              className={`rte-mode-tab ${editMode === 'html' ? 'active' : ''}`}
              onClick={() => setEditMode('html')}
            >
              Mã HTML & Xem trước
            </button>
          </div>
        </div>
      )}

      {editMode === 'visual' ? (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={handleChange}
          modules={quillModules}
          formats={quillFormats}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{ '--rte-min-height': minHeight }}
        />
      ) : (
        <div className="rte-html-container" style={{ '--rte-min-height': minHeight }}>
          <div className="rte-html-textarea-wrapper">
            <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Mã nguồn HTML</div>
            <textarea
              className="rte-html-textarea"
              value={value || ''}
              onChange={(e) => onChange && onChange(e.target.value)}
              placeholder={placeholder}
              style={{ minHeight: `calc(${minHeight} - 40px)` }}
            />
          </div>
          <div className="rte-html-preview-wrapper" style={{ borderLeft: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Xem trước trực quan</div>
            <div
              className="html-preview-container"
              dangerouslySetInnerHTML={{
                __html: value || '<p style="color: #94a3b8; font-style: italic;">Chưa có nội dung xem trước...</p>',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};


export default RichTextEditor;
