import { languages, social, theme } from '@/data/icons';

const Icon = ({ name, category = 'languages', className = '', ...props }) => {
  let iconHtml = null;

  // Handle direct mapping if name matches a key in any category
  if (category === 'languages' && languages[name]) iconHtml = languages[name];
  else if (category === 'social' && social[name]) iconHtml = social[name];
  else if (category === 'theme' && theme[name]) iconHtml = theme[name];

  // Fallback check across all categories if specific one failed
  if (!iconHtml) {
    if (languages[name]) iconHtml = languages[name];
    else if (social[name]) iconHtml = social[name];
    else if (theme[name]) iconHtml = theme[name];
  }

  if (!iconHtml) return null;

  return (
    <span
      className={`icon-wrapper ${className}`}
      dangerouslySetInnerHTML={{ __html: iconHtml }}
      {...props}
    />
  );
};

export default Icon;
