import LegacyHtmlEditor from '../../LegacyHtmlEditor/LegacyHtmlEditor';

const PRESETS = {
  article: {
    minHeight: '320px',
    placeholder: 'Nhap noi dung HTML...',
  },
  template: {
    minHeight: '520px',
    placeholder: 'Soan thao noi dung bieu mau...',
  },
};

const HtmlRichEditor = ({
  preset = 'article',
  minHeight,
  placeholder,
  ...props
}) => {
  const config = PRESETS[preset] || PRESETS.article;

  return (
    <LegacyHtmlEditor
      minHeight={minHeight || config.minHeight}
      placeholder={placeholder || config.placeholder}
      {...props}
    />
  );
};

export default HtmlRichEditor;
