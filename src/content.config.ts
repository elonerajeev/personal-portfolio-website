import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

/** Year-month string such as "2025-10". */
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    type: z.enum(['Full-time', 'Internship', 'Trainee', 'Contract', 'Freelance']),
    location: z.string(),
    mode: z.enum(['On-site', 'Remote', 'Hybrid']),
    start: yearMonth,
    end: yearMonth.optional(),
    summary: z.string(),
    highlights: z.array(z.string()).default([]),
    stack: z.array(z.string()),
  }),
});

const projects = defineCollection({
  loader: file('src/content/projects.yaml'),
  schema: z.object({
    title: z.string(),
    category: z.enum(['Cloud', 'DevOps', 'SaaS']),
    date: yearMonth,
    featured: z.boolean().default(false),
    summary: z.string(),
    impact: z.array(z.string()).default([]),
    stack: z.array(z.string()),
    repo: z.url(),
    demo: z.url().optional(),
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({
    degree: z.string(),
    school: z.string(),
    location: z.string(),
    start: z.number().int(),
    end: z.number().int(),
    grade: z.string(),
    focus: z.array(z.string()).default([]),
  }),
});

const credentials = defineCollection({
  loader: file('src/content/credentials.yaml'),
  schema: z.object({
    kind: z.enum(['certification', 'achievement']),
    title: z.string(),
    issuer: z.string(),
    year: z.number().int(),
    description: z.string(),
    /** Path under /public, e.g. /documents/certificates/foo.pdf */
    credential: z.string().startsWith('/').optional(),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z.object({
    group: z.string(),
    icon: z.string(),
    items: z.array(z.object({ name: z.string(), icon: z.string().optional() })),
  }),
});

export const collections = { experience, projects, education, credentials, skills };
