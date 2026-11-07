/**
 * SEO & Custom Domain Constants for ZAIN.NET
 */
export const CUSTOM_DOMAIN = 'https://www.karyazainnet.net';
export const getBaseUrl = () => CUSTOM_DOMAIN;

export interface SeoConfig {
  title?: string;
  description?: string;
  url?: string;
  type?: string;
  author?: string;
  image?: string;
  keywords?: string[];
  canonical?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

export const updatePageSeo = (config: SeoConfig) => {
  if (typeof document === 'undefined') return;
  if (config.title) {
    document.title = config.title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', config.title);
  }
  if (config.description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', config.description);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', config.description);
  }
  if (config.url) {
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', config.url);
  }
};

export const resetDefaultSeo = () => {
  if (typeof document === 'undefined') return;
  document.title = 'ZAIN.NET - Percetakan & Repositori Karya Ilmiah UIN Madura';
};
