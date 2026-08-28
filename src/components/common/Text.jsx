import React from 'react';
import { useLanguageText } from '../../hooks/useLanguageText';

const Text = ({
  path,
  value,
  defaultText = '',
  fallback,
  module: _module,
  line: _line,
  as: Component = 'span',
  values = {},
  style,
  className,
  ...rest
}) => {
  const { translate } = useLanguageText();

  const key = path || value;
  const fallbackText = fallback ?? defaultText;

  const content = key
    ? translate(key, { values, defaultText: fallbackText || key })
    : fallbackText;

  return (
    <Component style={style} className={className} {...rest}>
      {content}
    </Component>
  );
};

export const useText = () => {
  const {
    getText,
    getTexts,
    hasText,
    currentLanguage,
    translate,
    translateByValue,
    getTextByValue
  } = useLanguageText();
  
  return {
    t: getText,
    getText,
    getTexts,
    hasText,
    currentLanguage,
    translate,
    tValue: translateByValue,
    translateByValue,
    getTextByValue
  };
};

export default Text;
