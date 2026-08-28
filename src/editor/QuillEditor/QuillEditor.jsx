import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Loader2, Printer, Save, RotateCcw, RotateCw, Eraser,
    Bold, Italic, Underline, Strikethrough, Superscript, Subscript,
    Type, Paintbrush, List, ListOrdered, AlignLeft, AlignCenter,
    AlignRight, AlignJustify, Link, Image, Video, Table2,
    Plus, Minus, Trash2, Edit3, Monitor, Smartphone, Info
} from 'lucide-react';
import { Tooltip, Popover, InputNumber, Button, Space, Alert } from 'antd';
import './QuillEditor.css';

const IconBtn = ({ icon: Icon, ...props }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} strokeWidth={2} />
    </div>
);

const QuillEditor = ({ value, onChange, placeholder, draftId, minHeight }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'desktop' | 'mobile'
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    
    // Auto-save & Draft states
    const [lastSaved, setLastSaved] = useState(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [draftContent, setDraftContent] = useState('');
    
    // Table states
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [tablePopoverVisible, setTablePopoverVisible] = useState(false);
    const [isInTable, setIsInTable] = useState(false);

    const quillRef = useRef(null);
    const editorInstance = useRef(null);
    const savedRangeRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    const draftKey = `quill-draft-${draftId || (placeholder ? placeholder.replace(/[^a-zA-Z0-9]/g, '') : 'default')}`;

    // Ref for callbacks to avoid re-initializing editor when they change
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Save & Restore Selection for Popovers/Inputs
    const saveSelection = useCallback(() => {
        if (editorInstance.current) {
            const range = editorInstance.current.getSelection();
            if (range) {
                savedRangeRef.current = range;
            }
        }
    }, []);

    const restoreSelection = useCallback(() => {
        if (editorInstance.current && savedRangeRef.current) {
            editorInstance.current.setSelection(savedRangeRef.current);
        }
    }, []);

    // 1. Load Quill library from CDN
    useEffect(() => {
        const loadQuill = async () => {
            if (window.Quill) {
                setIsLoaded(true);
                return;
            }
            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css';
            document.head.appendChild(link);

            // Load JS
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js';
            script.async = true;
            script.onload = () => setIsLoaded(true);
            document.body.appendChild(script);
        };
        loadQuill();
    }, []);

    // 2. Check for drafts on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft && savedDraft !== value && savedDraft !== '<p><br></p>' && savedDraft !== '') {
            setHasDraft(true);
            setDraftContent(savedDraft);
        }
    }, [draftKey, value]);

    // 3. Initialize Quill Editor
    useEffect(() => {
        if (isLoaded && quillRef.current && !editorInstance.current) {
            try {
                // Register Font & Size formats
                const Font = window.Quill.import('formats/font');
                Font.whitelist = ['times-new-roman', 'arial', 'sans-serif', 'serif', 'monospace'];
                window.Quill.register(Font, true);

                const Size = window.Quill.import('formats/size');
                Size.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];
                window.Quill.register(Size, true);
            } catch (e) {
                console.warn("Quill formats registration warning:", e);
            }

            const quill = new window.Quill(quillRef.current, {
                theme: 'snow',
                placeholder: placeholder || 'Nhập nội dung văn bản...',
                modules: {
                    toolbar: { container: '#custom-toolbar' },
                    table: true,
                    clipboard: { matchVisual: false }
                }
            });

            // Sync HTML change, Stats, and Local Auto-save
            quill.on('text-change', () => {
                const html = quill.root.innerHTML;
                const normalizedHtml = html === '<p><br></p>' ? '' : html;
                
                // Trigger onChange callback
                if (onChangeRef.current) {
                    onChangeRef.current(normalizedHtml);
                }

                // Calculate statistics
                const rawText = quill.getText();
                const cleanText = rawText.endsWith('\n') ? rawText.slice(0, -1) : rawText;
                setCharCount(cleanText.length);
                setWordCount(cleanText.trim() === '' ? 0 : cleanText.trim().split(/\s+/).length);

                // Auto-save draft (debounced)
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                    if (normalizedHtml) {
                        localStorage.setItem(draftKey, normalizedHtml);
                        const now = new Date();
                        setLastSaved(now.toLocaleTimeString());
                    }
                }, 1500);

                // Check table status on text change
                const range = quill.getSelection();
                if (range) {
                    const [line] = quill.getLine(range.index);
                    setIsInTable(!!(line && line.domNode && line.domNode.closest('td, th, tr, table')));
                }
            });

            // Track selection to save range and detect table context
            quill.on('selection-change', (range) => {
                if (range) {
                    savedRangeRef.current = range;
                    const [line] = quill.getLine(range.index);
                    setIsInTable(!!(line && line.domNode && line.domNode.closest('td, th, tr, table')));
                }
            });

            editorInstance.current = quill;
        }
    }, [isLoaded, placeholder, draftKey]);

    // Update placeholder dynamically if it changes
    useEffect(() => {
        if (editorInstance.current && placeholder) {
            editorInstance.current.root.dataset.placeholder = placeholder;
        }
    }, [placeholder]);

    // Synchronize external value changes
    useEffect(() => {
        if (editorInstance.current && value !== undefined) {
            const currentContent = editorInstance.current.root.innerHTML;
            const normalizedValue = value === '' ? '<p><br></p>' : value;
            if (normalizedValue !== currentContent && !editorInstance.current.hasFocus()) {
                editorInstance.current.clipboard.dangerouslyPasteHTML(value || '');
            }
        }
    }, [value, isLoaded]);

    // Clean up auto-save timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    // Custom toolbar triggers
    const handleUndo = () => {
        if (editorInstance.current) {
            editorInstance.current.history.undo();
        }
    };

    const handleRedo = () => {
        if (editorInstance.current) {
            editorInstance.current.history.redo();
        }
    };

    const handleSave = () => {
        if (editorInstance.current) {
            const html = editorInstance.current.root.innerHTML;
            const normalizedHtml = html === '<p><br></p>' ? '' : html;
            
            // Call onSave callback if provided, else just trigger alert
            console.log("Đã lưu nội dung:", normalizedHtml);
            
            // Clear draft on successful manual save
            localStorage.removeItem(draftKey);
            setHasDraft(false);
            
            alert("Đã lưu nội dung thành công!");
        }
    };

    // Table modification operations
    const handleTableAction = (action) => {
        if (editorInstance.current) {
            restoreSelection();
            const tableModule = editorInstance.current.getModule('table');
            if (tableModule) {
                switch (action) {
                    case 'insertRowBelow':
                        tableModule.insertRowBelow();
                        break;
                    case 'insertRowAbove':
                        tableModule.insertRowAbove();
                        break;
                    case 'insertColumnRight':
                        tableModule.insertColumnRight();
                        break;
                    case 'insertColumnLeft':
                        tableModule.insertColumnLeft();
                        break;
                    case 'deleteRow':
                        tableModule.deleteRow();
                        break;
                    case 'deleteColumn':
                        tableModule.deleteColumn();
                        break;
                    case 'deleteTable':
                        tableModule.deleteTable();
                        setIsInTable(false);
                        break;
                    default:
                        break;
                }
            }
        }
    };

    const handleInsertTable = () => {
        if (editorInstance.current) {
            restoreSelection();
            const tableModule = editorInstance.current.getModule('table');
            if (tableModule) {
                tableModule.insertTable(tableRows, tableCols);
                setTablePopoverVisible(false);
            }
        }
    };

    const handlePopoverOpenChange = (visible) => {
        if (visible) {
            saveSelection();
        }
        setTablePopoverVisible(visible);
    };

    const restoreDraft = () => {
        if (editorInstance.current && draftContent) {
            editorInstance.current.clipboard.dangerouslyPasteHTML(draftContent);
            if (onChangeRef.current) onChangeRef.current(draftContent);
            setHasDraft(false);
        }
    };

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setHasDraft(false);
        setDraftContent('');
    };

    if (!isLoaded) {
        return (
            <div className="quill-loading-container">
                <Loader2 className="quill-spin-loader" /> 
                <span>Đang tải trình soạn thảo...</span>
            </div>
        );
    }

    return (
        <div className="quill-wrapper">
            {/* Draft restore alert banner */}
            {hasDraft && (
                <Alert
                    message={
                        <div className="draft-alert-content">
                            <span>Phát hiện bản nháp chưa lưu từ lần soạn thảo trước.</span>
                            <Space size={12} className="draft-alert-actions">
                                <Button type="primary" size="small" onClick={restoreDraft}>Khôi phục bản nháp</Button>
                                <Button size="small" danger onClick={clearDraft}>Xóa bản nháp</Button>
                            </Space>
                        </div>
                    }
                    type="info"
                    showIcon
                    closable
                    onClose={clearDraft}
                    className="quill-draft-alert"
                />
            )}

            {/* --- TOOLBAR TÙY CHỈNH --- */}
            <div className="quill-toolbar-container">
                <div id="custom-toolbar">

                    {/* Nhóm 1: Hệ thống (Lưu nội dung, In, Undo/Redo) */}
                    <span className="toolbar-group">
                        <Tooltip title="Lưu nội dung">
                            <button type="button" onClick={handleSave} className="custom-toolbar-btn save-btn">
                                <IconBtn icon={Save} />
                                <span className="save-btn-text">Lưu nội dung</span>
                            </button>
                        </Tooltip>
                        <Tooltip title="In ấn">
                            <button type="button" className="ql-print custom-toolbar-btn">
                                <IconBtn icon={Printer} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Hoàn tác (Ctrl+Z)">
                            <button type="button" onClick={handleUndo} className="custom-toolbar-btn">
                                <IconBtn icon={RotateCcw} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Làm lại (Ctrl+Y)">
                            <button type="button" onClick={handleRedo} className="custom-toolbar-btn">
                                <IconBtn icon={RotateCw} />
                            </button>
                        </Tooltip>
                    </span>

                    {/* Nhóm 2: Chế độ hiển thị & xem trước */}
                    <span className="toolbar-group">
                        <Tooltip title="Chế độ soạn thảo">
                            <button
                                type="button"
                                className={`custom-toolbar-btn ${viewMode === 'edit' ? 'active-mode' : ''}`}
                                onClick={() => setViewMode('edit')}
                            >
                                <IconBtn icon={Edit3} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Xem trước trên Máy tính (Desktop)">
                            <button
                                type="button"
                                className={`custom-toolbar-btn ${viewMode === 'desktop' ? 'active-mode' : ''}`}
                                onClick={() => setViewMode('desktop')}
                            >
                                <IconBtn icon={Monitor} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Xem trước trên Điện thoại (Mobile)">
                            <button
                                type="button"
                                className={`custom-toolbar-btn ${viewMode === 'mobile' ? 'active-mode' : ''}`}
                                onClick={() => setViewMode('mobile')}
                            >
                                <IconBtn icon={Smartphone} />
                            </button>
                        </Tooltip>
                    </span>

                    {/* Nhóm 3: Kiểu chữ, Kích thước, Tiêu đề */}
                    <span className="toolbar-group">
                        <Tooltip title="Phông chữ">
                            <select className="ql-font" defaultValue="times-new-roman">
                                <option value="times-new-roman">Times New Roman</option>
                                <option value="arial">Arial</option>
                                <option value="sans-serif">Sans Serif</option>
                                <option value="serif">Serif</option>
                                <option value="monospace">Monospace</option>
                            </select>
                        </Tooltip>
                        <Tooltip title="Kích thước chữ">
                            <select className="ql-size" defaultValue="14px">
                                <option value="8px">8px</option>
                                <option value="10px">10px</option>
                                <option value="12px">12px</option>
                                <option value="14px">14px</option>
                                <option value="16px">16px</option>
                                <option value="18px">18px</option>
                                <option value="20px">20px</option>
                                <option value="24px">24px</option>
                                <option value="28px">28px</option>
                                <option value="32px">32px</option>
                                <option value="36px">36px</option>
                            </select>
                        </Tooltip>
                        <Tooltip title="Định dạng tiêu đề">
                            <select className="ql-header" defaultValue="">
                                <option value="">Văn bản thường</option>
                                <option value="1">Tiêu đề H1</option>
                                <option value="2">Tiêu đề H2</option>
                                <option value="3">Tiêu đề H3</option>
                            </select>
                        </Tooltip>
                    </span>

                    {/* Nhóm 4: Định dạng chữ (Bold, Italic, v.v) & Chỉ số */}
                    <span className="toolbar-group">
                        <Tooltip title="In đậm (Ctrl+B)">
                            <button className="ql-bold custom-toolbar-btn">
                                <IconBtn icon={Bold} />
                            </button>
                        </Tooltip>
                        <Tooltip title="In nghiêng (Ctrl+I)">
                            <button className="ql-italic custom-toolbar-btn">
                                <IconBtn icon={Italic} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Gạch chân (Ctrl+U)">
                            <button className="ql-underline custom-toolbar-btn">
                                <IconBtn icon={Underline} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Gạch ngang">
                            <button className="ql-strike custom-toolbar-btn">
                                <IconBtn icon={Strikethrough} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Chỉ số dưới">
                            <button className="ql-script custom-toolbar-btn" value="sub">
                                <IconBtn icon={Subscript} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Chỉ số trên">
                            <button className="ql-script custom-toolbar-btn" value="super">
                                <IconBtn icon={Superscript} />
                            </button>
                        </Tooltip>
                    </span>

                    {/* Nhóm 5: Màu chữ & Màu nền (Phân biệt rõ ràng) */}
                    <span className="toolbar-group color-pickers-group">
                        <div className="color-picker-wrapper text-color">
                            <Tooltip title="Màu chữ">
                                <span className="color-label"><Type size={14} /></span>
                            </Tooltip>
                            <select className="ql-color"></select>
                        </div>
                        <div className="color-picker-wrapper bg-color">
                            <Tooltip title="Màu nền chữ">
                                <span className="color-label"><Paintbrush size={14} /></span>
                            </Tooltip>
                            <select className="ql-background"></select>
                        </div>
                    </span>

                    {/* Nhóm 6: Căn lề & Danh sách */}
                    <span className="toolbar-group">
                        <Tooltip title="Danh sách số">
                            <button className="ql-list custom-toolbar-btn" value="ordered">
                                <IconBtn icon={ListOrdered} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Danh sách chấm">
                            <button className="ql-list custom-toolbar-btn" value="bullet">
                                <IconBtn icon={List} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Giảm lề">
                            <button className="ql-indent custom-toolbar-btn" value="-1"></button>
                        </Tooltip>
                        <Tooltip title="Tăng lề">
                            <button className="ql-indent custom-toolbar-btn" value="+1"></button>
                        </Tooltip>

                        <Tooltip title="Căn trái">
                            <button className="ql-align custom-toolbar-btn" value=""></button>
                        </Tooltip>
                        <Tooltip title="Căn giữa">
                            <button className="ql-align custom-toolbar-btn" value="center"></button>
                        </Tooltip>
                        <Tooltip title="Căn phải">
                            <button className="ql-align custom-toolbar-btn" value="right"></button>
                        </Tooltip>
                        <Tooltip title="Căn đều">
                            <button className="ql-align custom-toolbar-btn" value="justify"></button>
                        </Tooltip>
                    </span>

                    {/* Nhóm 7: Chèn đa phương tiện (Link, Ảnh, Video) */}
                    <span className="toolbar-group">
                        <Tooltip title="Chèn liên kết">
                            <button className="ql-link custom-toolbar-btn">
                                <IconBtn icon={Link} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Chèn hình ảnh">
                            <button className="ql-image custom-toolbar-btn">
                                <IconBtn icon={Image} />
                            </button>
                        </Tooltip>
                        <Tooltip title="Chèn video">
                            <button className="ql-video custom-toolbar-btn">
                                <IconBtn icon={Video} />
                            </button>
                        </Tooltip>
                    </span>

                    {/* Nhóm 8: Công cụ tạo bảng (Rõ ràng trực quan) */}
                    <span className="toolbar-group table-creator-group">
                        <Popover
                            open={tablePopoverVisible}
                            onOpenChange={handlePopoverOpenChange}
                            title="Tạo bảng mới"
                            trigger="click"
                            content={
                                <div className="table-builder-popover">
                                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                        <div className="table-builder-input">
                                            <span>Số dòng:</span>
                                            <InputNumber min={1} max={15} value={tableRows} onChange={(val) => setTableRows(val || 1)} size="small" />
                                        </div>
                                        <div className="table-builder-input">
                                            <span>Số cột:</span>
                                            <InputNumber min={1} max={15} value={tableCols} onChange={(val) => setTableCols(val || 1)} size="small" />
                                        </div>
                                        <Button type="primary" size="small" onClick={handleInsertTable} block>Tạo bảng</Button>
                                    </Space>
                                </div>
                            }
                        >
                            <div>
                                <Tooltip title="Tạo bảng">
                                    <button type="button" className="custom-toolbar-btn table-main-btn">
                                        <IconBtn icon={Table2} />
                                    </button>
                                </Tooltip>
                            </div>
                        </Popover>
                    </span>

                    {/* Nhóm 9: Thao tác bảng (Chỉ hiển thị khi cursor trong bảng) */}
                    {isInTable && (
                        <span className="toolbar-group table-context-group">
                            <Tooltip title="Thêm dòng dưới">
                                <button type="button" onClick={() => handleTableAction('insertRowBelow')} className="custom-toolbar-btn table-action-btn">
                                    <Plus size={13} /><span className="table-btn-lbl">Dòng Dưới</span>
                                </button>
                            </Tooltip>
                            <Tooltip title="Thêm dòng trên">
                                <button type="button" onClick={() => handleTableAction('insertRowAbove')} className="custom-toolbar-btn table-action-btn">
                                    <Plus size={13} /><span className="table-btn-lbl">Dòng Trên</span>
                                </button>
                            </Tooltip>
                            <Tooltip title="Thêm cột bên phải">
                                <button type="button" onClick={() => handleTableAction('insertColumnRight')} className="custom-toolbar-btn table-action-btn">
                                    <Plus size={13} /><span className="table-btn-lbl">Cột Phải</span>
                                </button>
                            </Tooltip>
                            <Tooltip title="Thêm cột bên trái">
                                <button type="button" onClick={() => handleTableAction('insertColumnLeft')} className="custom-toolbar-btn table-action-btn">
                                    <Plus size={13} /><span className="table-btn-lbl">Cột Trái</span>
                                </button>
                            </Tooltip>
                            <Tooltip title="Xóa dòng hiện tại">
                                <button type="button" onClick={() => handleTableAction('deleteRow')} className="custom-toolbar-btn table-action-btn warning-action">
                                    <Minus size={13} /><span className="table-btn-lbl">Xóa Dòng</span>
                                </button>
                            </Tooltip>
                            <Tooltip title="Xóa cột hiện tại">
                                <button type="button" onClick={() => handleTableAction('deleteColumn')} className="custom-toolbar-btn table-action-btn warning-action">
                                    <Minus size={13} /><span className="table-btn-lbl">Xóa Cột</span>
                                </button>
                            </Tooltip>
                            <Tooltip title="Xóa bảng">
                                <button type="button" onClick={() => handleTableAction('deleteTable')} className="custom-toolbar-btn table-action-btn danger-action">
                                    <Trash2 size={13} /><span className="table-btn-lbl">Xóa Bảng</span>
                                </button>
                            </Tooltip>
                        </span>
                    )}

                    {/* Nhóm 10: Xóa định dạng */}
                    <span className="toolbar-group last-group">
                        <Tooltip title="Xóa định dạng">
                            <button className="ql-clean custom-toolbar-btn">
                                <IconBtn icon={Eraser} />
                            </button>
                        </Tooltip>
                    </span>
                </div>
            </div>

            {/* --- EDITOR & PREVIEW AREA --- */}
            {viewMode === 'edit' ? (
                <div className="quill-editor-container" style={minHeight ? { '--quill-min-height': minHeight } : null}>
                    <div ref={quillRef}></div>
                </div>
            ) : (
                <div className={`quill-preview-container ${viewMode}`}>
                    {viewMode === 'mobile' ? (
                        <div className="mobile-phone-frame">
                            <div className="mobile-phone-header">
                                <span className="phone-camera"></span>
                                <span className="phone-speaker"></span>
                            </div>
                            <div className="mobile-phone-screen ql-editor" dangerouslySetInnerHTML={{ __html: value || '' }} />
                            <div className="mobile-phone-footer">
                                <span className="phone-home-button"></span>
                            </div>
                        </div>
                    ) : (
                        <div className="desktop-preview-frame-wrapper">
                            <div className="desktop-preview-frame ql-editor" dangerouslySetInnerHTML={{ __html: value || '' }} />
                        </div>
                    )}
                </div>
            )}

            {/* --- FOOTER STATUS & STATISTICS --- */}
            <div className="quill-editor-footer">
                <div className="draft-status-indicator">
                    {lastSaved ? (
                        <span className="saved-success">
                            <Info size={13} style={{ marginRight: 4 }} />
                            Tự động lưu nháp: <strong style={{ color: '#2e7d32' }}>{lastSaved}</strong>
                        </span>
                    ) : (
                        <span className="not-saved-yet">Chưa lưu nháp</span>
                    )}
                </div>
                <div className="editor-stats">
                    <span>Ký tự: <strong>{charCount}</strong></span>
                    <span className="stats-divider">|</span>
                    <span>Từ: <strong>{wordCount}</strong></span>
                </div>
            </div>
        </div>
    );
};

export default QuillEditor;