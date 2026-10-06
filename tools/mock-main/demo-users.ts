export const demoUsers = [
  {
    id: '000000000000000000000001',
    name: 'Demo Owner',
    email: 'owner@example.test',
    role: 'user' as const,
    status: 'active' as const,
    plan: 'free' as const,
  },
  {
    id: '000000000000000000000002',
    name: 'Second Owner',
    email: 'second@example.test',
    role: 'user' as const,
    status: 'active' as const,
    plan: 'pro' as const,
  },
] as const;

export type DemoUser = (typeof demoUsers)[number];
export const mockCookieName = 'vetify_planner_demo_refresh';
export const demoOrigins = ['http://127.0.0.1:5174', 'http://localhost:5174'];
