import { Button, Empty, Input, Space, Typography } from 'antd';
import { Code2, FileText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './HtmlTemplateFillEditor.css';

const { Text } = Typography;

const TOKEN_PATTERN = /@[#A-Za-z0-9_./-]+/g;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const decodeHtml = (value) => {
  if (typeof document === 'undefined') return value || '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value || '';
  return textarea.value;
};

const getEditableHtml = (html) => {
  if (typeof document === 'undefined' || !html) return html || '';

  const template = document.createElement('template');
  template.innerHTML = html;

  const wrapTokenTextNodes = (root) => {
    const textNodeFilter = window.NodeFilter?.SHOW_TEXT || 4;
    const walker = document.createTreeWalker(root, textNodeFilter);
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const text = node.nodeValue || '';
      if (!TOKEN_PATTERN.test(text)) {
        TOKEN_PATTERN.lastIndex = 0;
        return;
      }

      TOKEN_PATTERN.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(TOKEN_PATTERN, (token, index) => {
        if (index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
        }

        const span = document.createElement('span');
        span.className = 'html-template-token';
        span.contentEditable = 'true';
        span.dataset.templateToken = token;
        span.dataset.placeholder = token;
        span.textContent = token;
        fragment.appendChild(span);
        lastIndex = index + token.length;
        return token;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode?.replaceChild(fragment, node);
    });
  };

  wrapTokenTextNodes(template.content);
  return template.innerHTML;
};

const collectFilledHtml = (root) => {
  const clone = root.cloneNode(true);
  clone.querySelectorAll('[data-template-token]').forEach((node) => {
    const value = node.textContent?.trim() || node.dataset.templateToken || '';
    node.replaceWith(document.createTextNode(value));
  });
  return clone.innerHTML;
};

const HtmlTemplateFillEditor = ({
  value,
  onChange,
  placeholder = 'Nhập HTML template...',
  minHeight = '260px',
}) => {
  const previewRef = useRef(null);
  const [mode, setMode] = useState('fill');

  const editableHtml = useMemo(() => getEditableHtml(value), [value]);
  const tokenCount = useMemo(() => {
    if (!value) return 0;
    return new Set(value.match(TOKEN_PATTERN) || []).size;
  }, [value]);

  useEffect(() => {
    if (tokenCount > 0) setMode('fill');
  }, [tokenCount, value]);

  const updateFilledHtml = () => {
    if (!previewRef.current || !onChange) return;
    onChange(collectFilledHtml(previewRef.current));
  };

  const handlePastePlainText = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  };

  const handleTokenFocus = (event) => {
    const target = event.target;
    if (!target?.dataset?.templateToken) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  return (
    <div className="html-template-editor">
      <div className="html-template-toolbar">
        <Space size={8} wrap>
          <Button
            type={mode === 'fill' ? 'primary' : 'default'}
            icon={<FileText size={15} />}
            onClick={() => setMode('fill')}
          >
            Điền nội dung
          </Button>
          <Button
            type={mode === 'template' ? 'primary' : 'default'}
            icon={<Code2 size={15} />}
            onClick={() => setMode('template')}
          >
            Sửa template HTML
          </Button>
        </Space>
        <Text type="secondary">{tokenCount ? `${tokenCount} vị trí cần nhập` : 'Không có token @...'}</Text>
      </div>

      {mode === 'template' ? (
        <div className="html-template-split" style={{ '--html-template-min-height': minHeight }}>
          <div className="html-template-source">
            <Input.TextArea
              value={value || ''}
              onChange={(event) => onChange?.(event.target.value)}
              placeholder={placeholder}
              spellCheck={false}
            />
          </div>
          <div className="html-template-preview html-preview-container">
            {value ? (
              <div dangerouslySetInnerHTML={{ __html: value }} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có nội dung" />
            )}
          </div>
        </div>
      ) : (
        <div
          ref={previewRef}
          className="html-template-fill html-preview-container"
          style={{ minHeight }}
          onBlur={updateFilledHtml}
          onFocus={handleTokenFocus}
          onPaste={handlePastePlainText}
          dangerouslySetInnerHTML={{
            __html: editableHtml || `<p class="html-template-empty">${escapeHtml(decodeHtml(placeholder))}</p>`,
          }}
        />
      )}
    </div>
  );
};

export default HtmlTemplateFillEditor;
