import express from 'express';
import { asyncHandler } from '../utils/helpers.js';
import { ApiResponse } from '../utils/response.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const siteConfig = {
  siteName: 'FolioStack - 设计师作品集平台',
  siteUrl: process.env.SITE_URL || 'https://foliostack.com',
  defaultDescription: '专业的在线设计师作品集展示平台，支持作品展示、项目管理、团队协作等功能',
  defaultImage: '/images/og-default.jpg',
  locale: 'zh-CN',
  twitterHandle: '@foliostack'
};

router.get('/meta/:page', asyncHandler(async (req, res) => {
  const { page } = req.params;
  
  const metaConfigs = {
    home: {
      title: `${siteConfig.siteName} - 展示你的设计作品`,
      description: siteConfig.defaultDescription,
      keywords: ['作品集', '设计', '设计师', 'portfolio', 'design'],
      ogType: 'website',
      canonical: '/'
    },
    works: {
      title: `作品集 - ${siteConfig.siteName}`,
      description: '浏览优秀的设计作品，获取灵感与创意',
      keywords: ['作品集', '设计作品', '灵感', 'gallery'],
      ogType: 'website',
      canonical: '/works'
    },
    about: {
      title: `关于我们 - ${siteConfig.siteName}`,
      description: '了解FolioStack平台的使命与愿景',
      keywords: ['关于', '团队', 'mission'],
      ogType: 'website',
      canonical: '/about'
    },
    dashboard: {
      title: `控制台 - ${siteConfig.siteName}`,
      description: '管理你的作品集和账户设置',
      keywords: ['控制台', 'dashboard', '管理'],
      ogType: 'website',
      canonical: '/dashboard',
      noIndex: true
    }
  };
  
  const meta = metaConfigs[page] || metaConfigs.home;
  
  return ApiResponse.success(res, {
    ...meta,
    siteUrl: siteConfig.siteUrl,
    ogImage: `${siteConfig.siteUrl}${meta.ogImage || siteConfig.defaultImage}`,
    siteName: siteConfig.siteName,
    twitterCard: 'summary_large_image',
    twitterCreator: siteConfig.twitterHandle
  });
}));

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const baseUrl = siteConfig.siteUrl;
  
  const [works, users] = await Promise.all([
    prisma.work.findMany({
      where: { isPublic: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, updatedAt: true }
    })
  ]);
  
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/works', changefreq: 'daily', priority: 0.9 },
    { url: '/about', changefreq: 'monthly', priority: 0.5 },
    { url: '/login', changefreq: 'never', priority: 0.3 },
    { url: '/register', changefreq: 'never', priority: 0.3 }
  ];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  
  for (const page of staticPages) {
    sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
  }
  
  for (const work of works) {
    sitemap += `  <url>
    <loc>${baseUrl}/works/${work.slug || work.id}</loc>
    <lastmod>${work.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  }
  
  for (const user of users) {
    sitemap += `  <url>
    <loc>${baseUrl}/u/${user.username}</loc>
    <lastmod>${user.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
  }
  
  sitemap += '</urlset>';
  
  res.set('Content-Type', 'application/xml');
  return res.send(sitemap);
}));

router.get('/robots.txt', (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /*?*

Sitemap: ${siteConfig.siteUrl}/api/seo/sitemap.xml

# Crawl-delay for bots
User-agent: bingbot
Crawl-delay: 1

User-agent: Googlebot
Crawl-delay: 1
`;
  
  res.set('Content-Type', 'text/plain');
  return res.send(robotsTxt);
}));

router.get('/structured-data/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  
  switch (type) {
    case 'organization': {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.siteName,
        url: siteConfig.siteUrl,
        logo: `${siteConfig.siteUrl}/images/logo.png`,
        description: siteConfig.defaultDescription,
        sameAs: [
          'https://twitter.com/foliostack',
          'https://github.com/foliostack'
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@foliostack.com',
          contactType: 'customer service'
        }
      };
      return ApiResponse.success(res, data);
    }
    
    case 'website': {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.siteName,
        url: siteConfig.siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteConfig.siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      };
      return ApiResponse.success(res, data);
    }
    
    case 'breadcrumb': {
      const { path } = req.query;
      const breadcrumbs = (path || '/').split('/').filter(Boolean);
      
      const itemList = breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.charAt(0).toUpperCase() + crumb.slice(1),
        item: `${siteConfig.siteUrl}/${breadcrumbs.slice(0, index + 1).join('/')}`
      }));
      
      const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: itemList
      };
      
      return ApiResponse.success(res, data);
    }
    
    default:
      return ApiResponse.error(res, '不支持的结构化数据类型', 400);
  }
}));

router.post('/work/:id/meta', authenticateToken, requirePermission('work', 'update'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, keywords, ogImage, customMeta } = req.body;
  
  const work = await prisma.work.findUnique({ where: { id } });
  if (!work) {
    return ApiResponse.notFound(res, '作品不存在');
  }
  
  await prisma.work.update({
    where: { id },
    data: {
      seoTitle: title,
      seoDescription: description,
      seoKeywords: keywords?.join(','),
      seoOgImage: ogImage,
      seoCustomMeta: customMeta ? JSON.stringify(customMeta) : null
    }
  });
  
  return ApiResponse.success(res, null, 'SEO元数据更新成功');
}));

export default router;