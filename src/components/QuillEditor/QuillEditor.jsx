import { useEffect, useRef, useState } from 'react';
import {
    Loader2, Printer, Save, RotateCcw, RotateCw, Eraser
} from 'lucide-react';
import './QuillEditor.css'; // Đảm bảo đã import file CSS mới

// Custom Icons Component để code gọn hơn
const IconBtn = ({ icon: Icon, ...props }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} strokeWidth={2} />
    </div>
);

const QuillEditor = ({ value, onChange, placeholder }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const quillRef = useRef(null);
    const editorInstance = useRef(null);

    // Use refs for callbacks to avoid re-initializing editor when they change
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // 1. Load thư viện Quill
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

    // 2. Khởi tạo Editor
    useEffect(() => {
        if (isLoaded && quillRef.current && !editorInstance.current) {
            // Đăng ký Font & Size
            const Font = window.Quill.import('formats/font');
            Font.whitelist = ['times-new-roman', 'arial', 'sans-serif', 'serif', 'monospace'];
            window.Quill.register(Font, true);

            const Size = window.Quill.import('formats/size');
            Size.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];
            window.Quill.register(Size, true);

            const quill = new window.Quill(quillRef.current, {
                theme: 'snow',
                placeholder: placeholder || 'Nhập nội dung văn bản...',
                modules: {
                    toolbar: { container: '#custom-toolbar' },
                    table: true,
                    clipboard: { matchVisual: false }
                }
            });

            // Handlers tuỳ chỉnh
            const toolbar = quill.getModule('toolbar');

            // Undo / Redo
            toolbar.addHandler('undo', () => quill.history.undo());
            toolbar.addHandler('redo', () => quill.history.redo());

            // Print Handler
            toolbar.addHandler('print', () => {
                const content = quill.root.innerHTML;
                const printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<html><head><title>In biểu mẫu</title>');
                printWindow.document.write('</head><body >');
                printWindow.document.write(content);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            });

            // Sự kiện thay đổi nội dung
            quill.on('text-change', () => {
                const html = quill.root.innerHTML;
                if (onChangeRef.current) {
                    onChangeRef.current(html === '<p><br></p>' ? '' : html);
                }
            });

            editorInstance.current = quill;
        }
    }, [isLoaded, placeholder]); // Re-run if placeholder changes? Ideally not re-init.
    // Actually re-init is bad. We should split placeholder update. 
    // But since placeholder usually doesn't change, we can leave it or disable lint.
    // Let's rely on standard practice: eslint-disable for init effect.

    // Update placeholder dynamically if it changes
    useEffect(() => {
        if (editorInstance.current && placeholder) {
            editorInstance.current.root.dataset.placeholder = placeholder;
        }
    }, [placeholder]);

    // 3. Đồng bộ dữ liệu
    useEffect(() => {
        if (editorInstance.current && value) {
            const currentContent = editorInstance.current.root.innerHTML;
            if (value !== currentContent && !editorInstance.current.hasFocus()) {
                editorInstance.current.clipboard.dangerouslyPasteHTML(value);
            }
        }
    }, [value, isLoaded]);

    const handleSave = () => {
        // Logic save có thể gọi prop onSave nếu cần, hiện tại chỉ log
        console.log("Đã lưu nội dung:", editorInstance.current?.root.innerHTML);
        alert("Đã kích hoạt sự kiện Lưu!");
    };

    if (!isLoaded) return <div className="p-4 flex items-center gap-2"><Loader2 className="animate-spin" /> Đang tải trình soạn thảo...</div>;

    return (
        <div className="quill-wrapper">
            {/* --- TOOLBAR TÙY CHỈNH --- */}
            <div className="quill-toolbar-container">
                <div id="custom-toolbar">

                    {/* Nhóm 1: Hệ thống (Lưu, In, Undo/Redo) */}
                    <span className="toolbar-group">
                        <button type="button" onClick={handleSave} title="Lưu lại">
                            <IconBtn icon={Save} />
                        </button>
                        <button type="button" className="ql-print" title="In ấn">
                            <IconBtn icon={Printer} />
                        </button>
                        <button type="button" className="ql-undo" title="Hoàn tác">
                            <IconBtn icon={RotateCcw} />
                        </button>
                        <button type="button" className="ql-redo" title="Làm lại">
                            <IconBtn icon={RotateCw} />
                        </button>
                    </span>

                    {/* Nhóm 2: Font chữ & Size */}
                    <span className="toolbar-group">
                        <select className="ql-font" defaultValue="times-new-roman" title="Phông chữ">
                            <option value="times-new-roman">Times New Roman</option>
                            <option value="arial">Arial</option>
                            <option value="sans-serif">Sans Serif</option>
                        </select>
                        <select className="ql-size" defaultValue="14px" title="Kích thước">
                            <option value="12px">12px</option>
                            <option value="14px">14px</option>
                            <option value="16px">16px</option>
                            <option value="18px">18px</option>
                            <option value="24px">24px</option>
                            <option value="28px">28px</option>
                        </select>
                    </span>

                    {/* Nhóm 3: Định dạng văn bản (Bold, Italic, v.v) */}
                    <span className="toolbar-group">
                        <button className="ql-bold" title="In đậm"></button>
                        <button className="ql-italic" title="In nghiêng"></button>
                        <button className="ql-underline" title="Gạch chân"></button>
                        <button className="ql-strike" title="Gạch ngang"></button>
                    </span>

                    {/* Nhóm 4: Màu sắc */}
                    <span className="toolbar-group">
                        <select className="ql-color" title="Màu chữ"></select>
                        <select className="ql-background" title="Màu nền"></select>
                    </span>

                    {/* Nhóm 5: Căn lề & Danh sách */}
                    <span className="toolbar-group">
                        <button className="ql-list" value="ordered" title="Danh sách số"></button>
                        <button className="ql-list" value="bullet" title="Danh sách chấm"></button>
                        <button className="ql-indent" value="-1" title="Giảm lề"></button>
                        <button className="ql-indent" value="+1" title="Tăng lề"></button>

                        <button className="ql-align" value="" title="Căn trái"></button>
                        <button className="ql-align" value="center" title="Căn giữa"></button>
                        <button className="ql-align" value="right" title="Căn phải"></button>
                        <button className="ql-align" value="justify" title="Căn đều"></button>
                    </span>

                    {/* Nhóm 6: Chèn (Link, Ảnh, Bảng) */}
                    <span className="toolbar-group">
                        <button className="ql-link" title="Chèn liên kết"></button>
                        <button className="ql-image" title="Chèn hình ảnh"></button>
                        <button className="ql-video" title="Chèn video"></button>
                        <button className="ql-table" title="Chèn bảng"></button>
                        <button className="ql-formula" title="Công thức toán"></button>
                    </span>

                    {/* Nhóm 7: Tiện ích khác */}
                    <span className="toolbar-group">
                        <button className="ql-clean" title="Xóa định dạng">
                            <IconBtn icon={Eraser} />
                        </button>
                    </span>
                </div>
            </div>

            {/* --- EDITOR AREA --- */}
            <div className="quill-editor-container">
                <div ref={quillRef}></div>
            </div>
        </div>
    );
};

export default QuillEditor;