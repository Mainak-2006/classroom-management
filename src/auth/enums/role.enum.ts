export const Role = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export type UserRole = (typeof Role)[keyof typeof Role];
