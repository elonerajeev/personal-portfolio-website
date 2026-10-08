export const site = {
  name: 'Rajeev Kumar',
  shortName: 'rajeev.k',
  role: 'Cloud & DevOps Engineer',
  title: 'Rajeev Kumar | Cloud & DevOps Engineer',
  description:
    'Cloud & DevOps Engineer building reliable AWS and Azure platforms, CI/CD pipelines, Kubernetes workloads and Terraform-managed infrastructure.',
  location: 'Jaipur, India',
  email: 'elonerajeev@gmail.com',
  resume: '/documents/rajeev-kumar-resume.pdf',
  availability: {
    open: true,
    message: 'Open to Cloud & DevOps roles',
  },
  keywords: ['DevOps', 'Cloud Engineer', 'AWS', 'Azure', 'Kubernetes', 'Terraform', 'CI/CD'],
} as const;

export const socials = [
  {
    label: 'GitHub',
    handle: '@elonerajeev',
    href: 'https://github.com/elonerajeev',
    icon: 'simple-icons:github',
  },
  {
    label: 'LinkedIn',
    handle: 'in/heyrajeev1',
    href: 'https://www.linkedin.com/in/heyrajeev1/',
    icon: 'simple-icons:linkedin',
  },
  {
    label: 'X',
    handle: '@rajeev02030066',
    href: 'https://x.com/rajeev02030066',
    icon: 'simple-icons:x',
  },
] as const;

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Credentials', href: '#credentials' },
  { label: 'Contact', href: '#contact' },
] as const;

export const stats = [
  { value: '1+', label: 'year in Cloud DevOps' },
  { value: '4', label: 'cloud & DevOps projects shipped' },
  { value: '80%', label: 'less manual provisioning' },
  { value: '40%', label: 'smaller container images' },
] as const;

export const strengths = [
  {
    icon: 'lucide:cloud-cog',
    title: 'AWS cloud architecture',
    text: 'Secure, scalable AWS designs with serverless patterns, networking, IAM and production-grade rollout strategies.',
  },
  {
    icon: 'lucide:workflow',
    title: 'CI/CD pipeline engineering',
    text: 'Automated build, test and deploy workflows with quality gates and rollback-safe releases.',
  },
  {
    icon: 'lucide:boxes',
    title: 'Kubernetes & containers',
    text: 'Containerised services on Docker and Kubernetes for consistent, scalable orchestration.',
  },
  {
    icon: 'lucide:activity',
    title: 'Observability & reliability',
    text: 'Monitoring, logging and alerting that raise uptime and speed up incident response.',
  },
] as const;
