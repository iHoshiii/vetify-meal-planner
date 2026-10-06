import { useEffect } from 'react';

const SITE_NAME = 'Vetify';

export function useDocumentTitle(title?: string, description?: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    const meta = description
      ? document.querySelector<HTMLMetaElement>('meta[name="description"]')
      : null;
    const previousDescription = meta?.content;
    if (meta && description) meta.content = description;

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
    };
  }, [title, description]);
}

export default useDocumentTitle;
