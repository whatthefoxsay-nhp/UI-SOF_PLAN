import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Popover, Select, Space, Tabs, Tooltip, message } from 'antd';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns3,
  Crop,
  Eraser,
  Eye,
  Film,
  Heading,
  Image as ImageIcon,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
  Rows3,
  Scissors,
  Smile,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Type,
  Underline,
  Undo2,
} from 'lucide-react';
import './LegacyHtmlEditor.css';

const EMPTY_HTML = '<p><br></p>';

const FONT_OPTIONS = [
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
];

const SIZE_OPTIONS = [
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
];

const HEADING_OPTIONS = [
  { value: 'p', label: 'Văn bản thường' },
  { value: 'h1', label: 'Tiêu đề H1' },
  { value: 'h2', label: 'Tiêu đề H2' },
  { value: 'h3', label: 'Tiêu đề H3' },
  { value: 'h4', label: 'Tiêu đề H4' },
  { value: 'blockquote', label: 'Trích dẫn' },
];

const SYMBOL_GROUPS = [
  {
    category: 'Pháp lý & Chung',
    symbols: ['©', '®', '™', '§', '¶', '•', '★', '✓', '✕', '♠', '♣', '♥', '♦', '▪', '▫', '▲', '▼'],
  },
  {
    category: 'Toán học & Khoa học',
    symbols: ['±', '≠', '≤', '≥', '∞', 'π', 'α', 'β', 'Ω', '∑', '∆', '√', '÷', '×', '‰', '°', 'μ', 'λ'],
  },
  {
    category: 'Tiền tệ',
    symbols: ['$', '€', '£', '¥', '₫', '₩', '₿', '¢', '₱'],
  },
  {
    category: 'Mũi tên & Hướng',
    symbols: ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '▲', '▼', '►', '◄', '➔'],
  },
];

const normalizeEmpty = (html) => (html === EMPTY_HTML ? '' : html || '');

const closestCell = (node) => {
  if (!node) return null;
  const element = node.nodeType === 1 ? node : node.parentElement;
  return element?.closest?.('td,th') || null;
};

const getSelectedCell = (doc) => {
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return closestCell(selection.anchorNode);
};

const getCurrentBlock = (doc) => {
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const node = selection.anchorNode;
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  return element?.closest?.('p,div,li,td,th,h1,h2,h3,h4,h5,h6') || element;
};

const LegacyHtmlEditor = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung HTML...',
  minHeight = '260px',
  draftId = 'default',
}) => {
  const rootRef = useRef(null);
  const iframeRef = useRef(null);
  const latestValueRef = useRef(null);
  const savedRangeRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const [mode, setMode] = useState('visual');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [isExpanded, setIsExpanded] = useState(false);

  // Height Resizer State
  const initialHeightNum = parseInt(minHeight, 10) || 360;
  const [editorHeight, setEditorHeight] = useState(initialHeightNum);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(initialHeightNum);

  // Auto-save & Draft states
  const [lastSaved, setLastSaved] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const draftKey = `bieumau-draft-${draftId || 'default'}`;

  // Statistics states
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  // Modal / Popover states
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageWidth, setImageWidth] = useState('100%');
  const [imageHeight, setImageHeight] = useState('auto');
  const [imageAlign, setImageAlign] = useState('center');
  const [imageBorder, setImageBorder] = useState(false);

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  // Image Crop states
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [cropX, setCropX] = useState(10);
  const [cropY, setCropY] = useState(10);
  const [cropW, setCropW] = useState(80);
  const [cropH, setCropH] = useState(80);
  const canvasRef = useRef(null);

  // Sync Change Callback & Stats
  const emitChange = useCallback((html) => {
    const normalized = normalizeEmpty(html);
    latestValueRef.current = normalized;
    onChange?.(normalized);

    // Calculate stats
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = normalized;
    const text = tempDiv.innerText || tempDiv.textContent || '';
    const cleanText = text.trim();
    setCharCount(cleanText.length);
    setWordCount(cleanText === '' ? 0 : cleanText.split(/\s+/).length);

    // Auto-save draft
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (normalized) {
        localStorage.setItem(draftKey, normalized);
        const now = new Date();
        setLastSaved(now.toLocaleTimeString());
      }
    }, 1000);
  }, [onChange, draftKey]);

  // Draft check on mount / draftKey change
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && savedDraft !== value && savedDraft !== EMPTY_HTML && savedDraft !== '') {
      setHasDraft(true);
      setDraftContent(savedDraft);
    }
  }, [draftKey, value]);

  const restoreDraft = () => {
    if (draftContent) {
      const doc = getDoc();
      if (doc && doc.body) {
        doc.body.innerHTML = draftContent;
      }
      emitChange(draftContent);
      setHasDraft(false);
      message.success('Đã khôi phục bản nháp!');
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setDraftContent('');
  };

  const getDoc = useCallback(() => iframeRef.current?.contentDocument || null, []);

  const saveSelection = useCallback(() => {
    const doc = getDoc();
    const selection = doc?.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, [getDoc]);

  const restoreSelection = useCallback(() => {
    const doc = getDoc();
    const selection = doc?.getSelection?.();
    if (!doc || !selection || !savedRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }, [getDoc]);

  // Resizer Event Handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = editorHeight;

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e) => {
    if (!isResizingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    const newHeight = Math.max(200, Math.min(1200, startHeightRef.current + deltaY));
    setEditorHeight(newHeight);
  };

  const handleResizeEnd = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const writeEditorDocument = useCallback((html) => {
    const doc = getDoc();
    if (!doc) return;

    doc.open();
    doc.write(`<!doctype html>
<html>
<head>
  <style>
    html, body {
      min-height: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: "Times New Roman", Times, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }
    body {
      box-sizing: border-box;
      min-height: ${editorHeight}px;
      padding: 16px 20px;
      outline: none;
    }
    body:empty::before {
      content: attr(data-placeholder);
      color: #94a3b8;
      font-style: italic;
    }
    table {
      border-collapse: collapse;
    }
    td, th {
      min-width: 24px;
      min-height: 18px;
    }
    table[data-editor-table="1"] td,
    table[data-editor-table="1"] th {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
    }
    img {
      max-width: 100%;
      height: auto;
      cursor: pointer;
    }
    img:hover {
      outline: 2px dashed #197dd3;
    }
    blockquote {
      border-left: 4px solid #cbd5e1;
      margin: 8px 0;
      padding-left: 12px;
      color: #475569;
      font-style: italic;
    }
  </style>
</head>
<body contenteditable="true" data-placeholder="${placeholder.replace(/"/g, '&quot;')}">${html || ''}</body>
</html>`);
    doc.close();
    doc.designMode = 'on';

    const sync = () => emitChange(doc.body.innerHTML);
    const syncSelection = () => saveSelection();
    const handleKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        exec('bold');
      } else if (key === 'i') {
        event.preventDefault();
        exec('italic');
      } else if (key === 'u') {
        event.preventDefault();
        exec('underline');
      } else if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) exec('redo');
        else exec('undo');
      } else if (key === 'y') {
        event.preventDefault();
        exec('redo');
      } else if (key === 'a') {
        event.preventDefault();
        const selection = doc.getSelection();
        if (selection) {
          selection.selectAllChildren(doc.body);
        }
      }
    };

    doc.body.addEventListener('input', sync);
    doc.body.addEventListener('blur', sync);
    doc.body.addEventListener('mouseup', syncSelection);
    doc.body.addEventListener('keyup', syncSelection);
    doc.addEventListener('selectionchange', syncSelection);
    doc.body.addEventListener('keydown', handleKeyDown);
    doc.body.addEventListener('paste', () => setTimeout(sync, 0));
  }, [emitChange, getDoc, editorHeight, placeholder]);

  useEffect(() => {
    if (mode !== 'visual') {
      latestValueRef.current = value || '';
      return;
    }
    if ((value || '') === latestValueRef.current) return;
    writeEditorDocument(value || '');
    latestValueRef.current = value || '';
  }, [mode, value, writeEditorDocument]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const host = root.closest('.ant-drawer-body, .ant-modal-body, .ant-card-body, .ant-form-item-control-input-content');
    if (!host) return undefined;

    if (isExpanded) {
      host.classList.add('legacy-html-host-expanded');
    } else {
      host.classList.remove('legacy-html-host-expanded');
    }

    return () => {
      host.classList.remove('legacy-html-host-expanded');
    };
  }, [isExpanded]);

  const exec = (command, commandValue = null) => {
    const doc = getDoc();
    if (!doc) return;
    iframeRef.current?.contentWindow?.focus();
    restoreSelection();
    doc.execCommand(command, false, commandValue);
    saveSelection();
    emitChange(doc.body.innerHTML);
  };

  const applyInlineStyle = (styleName, styleValue) => {
    const doc = getDoc();
    if (!doc) return;
    iframeRef.current?.contentWindow?.focus();
    restoreSelection();
    const selection = doc.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      const block = getCurrentBlock(doc);
      if (block) block.style[styleName] = styleValue;
      saveSelection();
      emitChange(doc.body.innerHTML);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = doc.createElement('span');
    span.style[styleName] = styleValue;
    try {
      range.surroundContents(span);
    } catch (_error) {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    selection.removeAllRanges();
    const nextRange = doc.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    saveSelection();
    emitChange(doc.body.innerHTML);
  };

  // Table operations
  const insertTable = () => {
    const rows = Math.max(1, Number(tableRows) || 1);
    const cols = Math.max(1, Number(tableCols) || 1);
    const cells = Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('');
    const body = Array.from({ length: rows }, () => `<tr>${cells}</tr>`).join('');
    exec('insertHTML', `<table data-editor-table="1" style="width:100%;" border="1" cellspacing="0" cellpadding="4"><tbody>${body}</tbody></table><p><br></p>`);
  };

  const addRow = () => {
    const doc = getDoc();
    const cell = doc && getSelectedCell(doc);
    const row = cell?.parentElement;
    if (!row) return;
    const clone = row.cloneNode(true);
    clone.querySelectorAll('td,th').forEach((item) => {
      item.innerHTML = '&nbsp;';
    });
    row.after(clone);
    emitChange(doc.body.innerHTML);
  };

  const addColumn = () => {
    const doc = getDoc();
    const cell = doc && getSelectedCell(doc);
    const row = cell?.parentElement;
    const table = row?.closest('table');
    if (!table || !row) return;
    const index = Array.from(row.children).indexOf(cell);
    table.querySelectorAll('tr').forEach((item) => {
      const reference = item.children[index];
      const newCell = doc.createElement(reference?.tagName?.toLowerCase() === 'th' ? 'th' : 'td');
      newCell.innerHTML = '&nbsp;';
      reference?.after(newCell);
    });
    emitChange(doc.body.innerHTML);
  };

  const removeRow = () => {
    const doc = getDoc();
    const cell = doc && getSelectedCell(doc);
    const row = cell?.parentElement;
    if (!row) return;
    row.remove();
    emitChange(doc.body.innerHTML);
  };

  const removeColumn = () => {
    const doc = getDoc();
    const cell = doc && getSelectedCell(doc);
    const row = cell?.parentElement;
    const table = row?.closest('table');
    if (!table || !row) return;
    const index = Array.from(row.children).indexOf(cell);
    table.querySelectorAll('tr').forEach((item) => item.children[index]?.remove());
    emitChange(doc.body.innerHTML);
  };

  // MS Word Extra Operations
  const handleInsertLink = () => {
    if (!linkUrl) {
      message.warning('Vui lòng nhập đường dẫn!');
      return;
    }
    const html = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText || linkUrl}</a>`;
    exec('insertHTML', html);
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result;
      if (base64) {
        setImageUrl(base64);
        setCropSrc(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInsertImage = () => {
    if (!imageUrl) {
      message.warning('Vui lòng nhập URL hoặc chọn tệp hình ảnh!');
      return;
    }
    let marginStyle = '0 auto';
    if (imageAlign === 'left') marginStyle = '0 auto 0 0';
    if (imageAlign === 'right') marginStyle = '0 0 0 auto';

    const borderStyle = imageBorder ? 'border: 1px solid #cbd5e1; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);' : '';
    const imgHtml = `<img src="${imageUrl}" style="width:${imageWidth || '100%'}; height:${imageHeight || 'auto'}; display:block; margin:${marginStyle}; ${borderStyle}" alt="Hình ảnh" />`;
    exec('insertHTML', imgHtml);
    setImageModalVisible(false);
    setImageUrl('');
  };

  const handleInsertVideo = () => {
    if (!videoUrl) {
      message.warning('Vui lòng nhập liên kết Video!');
      return;
    }
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch?v=')) {
      embedUrl = videoUrl.replace('watch?v=', 'embed/');
    } else if (videoUrl.includes('youtu.be/')) {
      embedUrl = videoUrl.replace('youtu.be/', 'youtube.com/embed/');
    }
    const videoHtml = `<div style="text-align:center; margin:12px 0;"><iframe src="${embedUrl}" width="560" height="315" frameborder="0" allowfullscreen style="max-width:100%;"></iframe></div>`;
    exec('insertHTML', videoHtml);
    setVideoModalVisible(false);
    setVideoUrl('');
  };

  const handleInsertSymbol = (sym) => {
    exec('insertHTML', sym);
  };

  // Image Crop execution
  const applyCrop = () => {
    if (!cropSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = cropSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleX = img.naturalWidth / 100;
      const scaleY = img.naturalHeight / 100;

      const realX = cropX * scaleX;
      const realY = cropY * scaleY;
      const realW = cropW * scaleX;
      const realH = cropH * scaleY;

      canvas.width = realW;
      canvas.height = realH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);

      const croppedBase64 = canvas.toDataURL('image/png');
      setImageUrl(croppedBase64);
      setCropModalVisible(false);
      message.success('Đã cắt hình ảnh thành công!');
    };
  };

  const preventToolbarBlur = (event) => {
    event.preventDefault();
    iframeRef.current?.contentWindow?.focus();
    restoreSelection();
  };

  return (
    <div
      ref={rootRef}
      className={`legacy-html-editor ${isExpanded ? 'expanded' : ''}`}
      style={{ '--legacy-html-height': `${editorHeight}px` }}
    >
      {/* Draft restore alert banner */}
      {hasDraft && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span>Phát hiện bản nháp chưa lưu từ lần soạn thảo trước.</span>
              <Space size={8}>
                <Button type="primary" size="small" onClick={restoreDraft}>Khôi phục bản nháp</Button>
                <Button size="small" danger onClick={clearDraft}>Xóa bản nháp</Button>
              </Space>
            </div>
          }
          type="info"
          showIcon
          closable
          onClose={clearDraft}
          style={{ marginBottom: 8, borderRadius: 6 }}
        />
      )}

      {/* --- TOOLBAR --- */}
      <div className="legacy-html-toolbar">
        <Space size={4} wrap>
          {/* Visual / Source mode */}
          <Tooltip title="Soạn thảo trực quan">
            <Button type={mode === 'visual' ? 'primary' : 'default'} icon={<Eye size={15} />} onMouseDown={preventToolbarBlur} onClick={() => setMode('visual')} />
          </Tooltip>
          <Tooltip title="Mã HTML">
            <Button type={mode === 'source' ? 'primary' : 'default'} icon={<Code2 size={15} />} onMouseDown={preventToolbarBlur} onClick={() => setMode('source')} />
          </Tooltip>

          <span className="legacy-html-separator" />

          {/* Undo / Redo */}
          <Tooltip title="Hoàn tác (Ctrl+Z)">
            <Button icon={<Undo2 size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('undo')} />
          </Tooltip>
          <Tooltip title="Làm lại (Ctrl+Y)">
            <Button icon={<Redo2 size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('redo')} />
          </Tooltip>

          <span className="legacy-html-separator" />

          {/* Headings */}
          <Select
            style={{ width: 140 }}
            options={HEADING_OPTIONS}
            defaultValue="p"
            onChange={(val) => exec('formatBlock', `<${val}>`)}
          />

          {/* Fonts & Sizes */}
          <Select dropdownMatchSelectWidth={false} className="legacy-html-font" options={FONT_OPTIONS} defaultValue="Times New Roman" onChange={(font) => exec('fontName', font)} />
          <Select dropdownMatchSelectWidth={false} className="legacy-html-size" options={SIZE_OPTIONS} defaultValue="14px" onChange={(size) => applyInlineStyle('fontSize', size)} />

          <span className="legacy-html-separator" />

          {/* Formatting */}
          <Tooltip title="In đậm (Ctrl+B)"><Button icon={<Bold size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('bold')} /></Tooltip>
          <Tooltip title="In nghiêng (Ctrl+I)"><Button icon={<Italic size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('italic')} /></Tooltip>
          <Tooltip title="Gạch chân (Ctrl+U)"><Button icon={<Underline size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('underline')} /></Tooltip>
          <Tooltip title="Gạch ngang"><Button icon={<Strikethrough size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('strikethrough')} /></Tooltip>
          <Tooltip title="Chỉ số dưới (Subscript)"><Button icon={<Subscript size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('subscript')} /></Tooltip>
          <Tooltip title="Chỉ số trên (Superscript)"><Button icon={<Superscript size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('superscript')} /></Tooltip>
          <Tooltip title="Xóa định dạng"><Button icon={<Eraser size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('removeFormat')} /></Tooltip>

          <span className="legacy-html-separator" />

          {/* Text & Background Colors */}
          <input className="legacy-html-color" type="color" title="Màu chữ" aria-label="Màu chữ" onMouseDown={preventToolbarBlur} onChange={(event) => exec('foreColor', event.target.value)} />
          <input className="legacy-html-color" type="color" title="Màu nền" aria-label="Màu nền" onMouseDown={preventToolbarBlur} onChange={(event) => exec('backColor', event.target.value)} />

          <span className="legacy-html-separator" />

          {/* Alignment */}
          <Tooltip title="Căn trái"><Button icon={<AlignLeft size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('justifyLeft')} /></Tooltip>
          <Tooltip title="Căn giữa"><Button icon={<AlignCenter size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('justifyCenter')} /></Tooltip>
          <Tooltip title="Căn phải"><Button icon={<AlignRight size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('justifyRight')} /></Tooltip>
          <Tooltip title="Căn đều"><Button icon={<AlignJustify size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('justifyFull')} /></Tooltip>
          <Tooltip title="Danh sách chấm"><Button icon={<List size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('insertUnorderedList')} /></Tooltip>
          <Tooltip title="Danh sách số"><Button icon={<ListOrdered size={15} />} onMouseDown={preventToolbarBlur} onClick={() => exec('insertOrderedList')} /></Tooltip>

          <span className="legacy-html-separator" />

          {/* Media & Links */}
          <Tooltip title="Chèn liên kết (Link)">
            <Button icon={<LinkIcon size={15} />} onMouseDown={preventToolbarBlur} onClick={() => { saveSelection(); setLinkModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="Chèn & Căn chỉnh Hình ảnh">
            <Button icon={<ImageIcon size={15} />} onMouseDown={preventToolbarBlur} onClick={() => { saveSelection(); setImageModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="Chèn Video">
            <Button icon={<Film size={15} />} onMouseDown={preventToolbarBlur} onClick={() => { saveSelection(); setVideoModalVisible(true); }} />
          </Tooltip>

          {/* Symbol Picker */}
          <Popover
            title="Chèn ký tự đặc biệt (Symbol)"
            trigger="click"
            content={
              <div style={{ width: 280, maxHeight: 260, overflowY: 'auto' }}>
                {SYMBOL_GROUPS.map((group) => (
                  <div key={group.category} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{group.category}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                      {group.symbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => handleInsertSymbol(sym)}
                          style={{
                            padding: '4px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            background: '#fff',
                            textAlign: 'center',
                          }}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <div>
              <Tooltip title="Ký tự đặc biệt (Symbol)">
                <Button icon={<Smile size={15} />} onMouseDown={preventToolbarBlur} />
              </Tooltip>
            </div>
          </Popover>

          <span className="legacy-html-separator" />

          {/* Tables */}
          <InputNumber min={1} max={20} size="small" value={tableRows} onChange={(next) => setTableRows(next || 1)} addonBefore={<Rows3 size={13} />} />
          <InputNumber min={1} max={20} size="small" value={tableCols} onChange={(next) => setTableCols(next || 1)} addonBefore={<Columns3 size={13} />} />
          <Tooltip title="Chèn bảng"><Button icon={<Table2 size={15} />} onMouseDown={preventToolbarBlur} onClick={insertTable} /></Tooltip>
          <Tooltip title="Thêm dòng"><Button icon={<Plus size={15} />} onMouseDown={preventToolbarBlur} onClick={addRow} /></Tooltip>
          <Tooltip title="Thêm cột"><Button icon={<Columns3 size={15} />} onMouseDown={preventToolbarBlur} onClick={addColumn} /></Tooltip>
          <Tooltip title="Xóa dòng"><Button icon={<Minus size={15} />} onMouseDown={preventToolbarBlur} onClick={removeRow} /></Tooltip>
          <Tooltip title="Xóa cột"><Button icon={<Rows3 size={15} />} onMouseDown={preventToolbarBlur} onClick={removeColumn} /></Tooltip>

          <span className="legacy-html-separator" />

          {/* Expand Screen */}
          <Tooltip title={isExpanded ? 'Thu nhỏ khung soạn thảo' : 'Mở rộng khung soạn thảo'}>
            <Button
              icon={isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              onMouseDown={preventToolbarBlur}
              onClick={() => setIsExpanded((prev) => !prev)}
            />
          </Tooltip>
        </Space>
      </div>

      {/* --- EDITOR & SOURCE VIEW AREA --- */}
      {mode === 'source' ? (
        <div className="legacy-html-source-layout" style={{ height: `${editorHeight}px` }}>
          <textarea
            className="legacy-html-source"
            value={value || ''}
            onChange={(event) => emitChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                event.target.select();
              }
            }}
            placeholder={placeholder}
            spellCheck={false}
          />
          <div className="legacy-html-preview html-preview-container" dangerouslySetInnerHTML={{ __html: value || '' }} />
        </div>
      ) : (
        <iframe ref={iframeRef} className="legacy-html-frame" style={{ height: `${editorHeight}px` }} title={placeholder} />
      )}

      {/* --- RESIZE HANDLE --- */}
      <div
        className="legacy-html-resize-handle"
        onMouseDown={handleResizeStart}
        title="Kéo để tăng/giảm chiều cao trình soạn thảo"
      >
        <div className="resize-handle-bar" />
      </div>

      {/* --- FOOTER STATUS & STATS --- */}
      <div className="legacy-html-footer">
        <div className="draft-status">
          {lastSaved ? (
            <span style={{ color: '#2e7d32', fontSize: '12px' }}>
              <Info size={12} style={{ marginRight: 4 }} />
              Tự động lưu nháp: <strong>{lastSaved}</strong>
            </span>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa lưu nháp</span>
          )}
        </div>
        <div className="editor-stats" style={{ fontSize: '12px', color: '#64748b' }}>
          <span>Ký tự: <strong>{charCount}</strong></span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>Từ: <strong>{wordCount}</strong></span>
        </div>
      </div>

      {/* --- MODALS --- */}
      {/* 1. Link Modal */}
      <Modal
        title="Chèn liên kết (Hyperlink)"
        open={linkModalVisible}
        onOk={handleInsertLink}
        onCancel={() => setLinkModalVisible(false)}
        okText="Chèn Link"
        cancelText="Hủy"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Hiển thị văn bản (Text):</label>
            <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Nhập văn bản hiển thị..." />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Địa chỉ URL:</label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
          </div>
        </Space>
      </Modal>

      {/* 2. Image Modal (Insert & Format & Crop trigger) */}
      <Modal
        title="Chèn & Định dạng Hình ảnh (Word Style)"
        open={imageModalVisible}
        onOk={handleInsertImage}
        onCancel={() => setImageModalVisible(false)}
        width={600}
        okText="Chèn hình ảnh"
        cancelText="Hủy"
      >
        <Tabs
          defaultActiveKey="url"
          items={[
            {
              key: 'url',
              label: 'Nhập đường dẫn URL',
              children: (
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://domain.com/image.jpg" />
              ),
            },
            {
              key: 'file',
              label: 'Tải từ máy tính',
              children: (
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ padding: '8px 0' }} />
              ),
            },
          ]}
        />
        {imageUrl && (
          <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Xem trước & Định dạng hình ảnh:</span>
              <Button icon={<Crop size={14} />} onClick={() => setCropModalVisible(true)} size="small">
                Cắt ảnh (Crop)
              </Button>
            </div>
            <div style={{ textAlign: 'center', background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
            </div>
            <Space wrap size={16}>
              <div>
                <label style={{ fontSize: 12, display: 'block' }}>Rộng (Width):</label>
                <Input size="small" style={{ width: 100 }} value={imageWidth} onChange={(e) => setImageWidth(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block' }}>Cao (Height):</label>
                <Input size="small" style={{ width: 100 }} value={imageHeight} onChange={(e) => setImageHeight(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block' }}>Căn lề:</label>
                <Select
                  size="small"
                  style={{ width: 120 }}
                  value={imageAlign}
                  onChange={setImageAlign}
                  options={[
                    { value: 'center', label: 'Căn giữa' },
                    { value: 'left', label: 'Căn trái' },
                    { value: 'right', label: 'Căn phải' },
                  ]}
                />
              </div>
            </Space>
          </div>
        )}
      </Modal>

      {/* 3. Crop Modal */}
      <Modal
        title="Cắt ảnh (Crop Image)"
        open={cropModalVisible}
        onOk={applyCrop}
        onCancel={() => setCropModalVisible(false)}
        width={640}
        okText="Áp dụng Cắt"
        cancelText="Hủy"
      >
        <div style={{ textAlign: 'center', background: '#0f172a', padding: 16, borderRadius: 8 }}>
          {cropSrc && (
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
              <img src={cropSrc} alt="To Crop" style={{ maxWidth: '100%', maxHeight: 300 }} />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropY}%`,
                  left: `${cropX}%`,
                  width: `${cropW}%`,
                  height: `${cropH}%`,
                  border: '2px dashed #38bdf8',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  cursor: 'move',
                }}
              />
            </div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Tùy chỉnh vùng cắt (%):</span>
          <Space wrap size={16} style={{ marginTop: 8 }}>
            <div>
              <span style={{ fontSize: 11 }}>Vị trí X:</span>
              <InputNumber min={0} max={90} size="small" value={cropX} onChange={(v) => setCropX(v || 0)} />
            </div>
            <div>
              <span style={{ fontSize: 11 }}>Vị trí Y:</span>
              <InputNumber min={0} max={90} size="small" value={cropY} onChange={(v) => setCropY(v || 0)} />
            </div>
            <div>
              <span style={{ fontSize: 11 }}>Rộng W:</span>
              <InputNumber min={10} max={100 - cropX} size="small" value={cropW} onChange={(v) => setCropW(v || 10)} />
            </div>
            <div>
              <span style={{ fontSize: 11 }}>Cao H:</span>
              <InputNumber min={10} max={100 - cropY} size="small" value={cropH} onChange={(v) => setCropH(v || 10)} />
            </div>
          </Space>
        </div>
      </Modal>

      {/* 4. Video Modal */}
      <Modal
        title="Chèn Video (YouTube / Link)"
        open={videoModalVisible}
        onOk={handleInsertVideo}
        onCancel={() => setVideoModalVisible(false)}
        okText="Chèn Video"
        cancelText="Hủy"
      >
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Đường dẫn Video (YouTube / MP4):</label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
      </Modal>
    </div>
  );
};

export default LegacyHtmlEditor;
