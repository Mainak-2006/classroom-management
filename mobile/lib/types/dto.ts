import {
  AdminRole,
  AttendanceStatus,
  AssignmentStatus,
  ExamStatus,
  Gender,
  UserRole,
} from "./enums";

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  role: Exclude<UserRole, UserRole.ADMIN>;
  student?: CreateStudentDto;
  teacher?: CreateTeacherDto;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
  accessToken?: string;
}

export interface CreateStudentDto {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  rollNumber: string;
  registrationNumber: string;
  department: string;
  semester: number;
  section?: string;
  address?: string;
  profileImage?: string;
  guardianName?: string;
  guardianPhone?: string;
  password: string;
  confirmPassword?: string;
}

export interface UpdateStudentDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  rollNumber?: string;
  registrationNumber?: string;
  department?: string;
  semester?: number;
  section?: string;
  address?: string;
  profileImage?: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface CreateTeacherDto {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  employeeId: string;
  department: string;
  designation: string;
  qualification: string;
  specialization?: string;
  officeRoom?: string;
  profileImage?: string;
  password: string;
  confirmPassword?: string;
}

export interface UpdateTeacherDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  employeeId?: string;
  department?: string;
  designation?: string;
  qualification?: string;
  specialization?: string;
  officeRoom?: string;
  profileImage?: string;
}

export interface CreateAdminDto {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  department: string;
  role: AdminRole;
  profileImage?: string;
  password: string;
  confirmPassword?: string;
}

export interface UpdateAdminDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  department?: string;
  role?: AdminRole;
  profileImage?: string;
}

export interface CreateCourseDto {
  name: string;
  code: string;
  description?: string;
  department: string;
  semester: number;
  credits: number;
  isActive: boolean;
  teacherId?: string;
}

export interface UpdateCourseDto {
  name?: string;
  code?: string;
  description?: string;
  department?: string;
  semester?: number;
  credits?: number;
  isActive?: boolean;
  teacherId?: string;
}

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  courseId: string;
  dueDate: string;
  totalMarks: number;
  instructions?: string;
  status?: AssignmentStatus;
  isActive?: boolean;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  courseId?: string;
  dueDate?: string;
  totalMarks?: number;
  instructions?: string;
  status?: AssignmentStatus;
  isActive?: boolean;
}

export interface CreateAttendanceDto {
  studentId: string;
  courseId: string;
  date: string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface UpdateAttendanceDto {
  status?: AttendanceStatus;
  notes?: string;
}

export interface CreateExamDto {
  title: string;
  description?: string;
  courseId: string;
  examDate: string;
  duration: number;
  totalMarks: number;
  instructions?: string;
  status?: ExamStatus;
  isActive?: boolean;
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  courseId?: string;
  examDate?: string;
  duration?: number;
  totalMarks?: number;
  instructions?: string;
  status?: ExamStatus;
  isActive?: boolean;
}

export interface CreateExamSubmissionDto {
  studentId: string;
  score: number;
  submittedAt?: string;
}

export interface UpdateExamSubmissionDto {
  score?: number;
  submittedAt?: string;
}
