import {
  AdminRole,
  AttendanceStatus,
  AssignmentStatus,
  ExamStatus,
  Gender,
} from "./enums";

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

interface BasePerson extends Timestamps {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  department: string;
  profileImage?: string | null;
  isActive: boolean;
}

export interface Admin extends BasePerson {
  role: AdminRole;
}

export interface Teacher extends BasePerson {
  employeeId: string;
  designation: string;
  qualification: string;
  specialization?: string | null;
  officeRoom?: string | null;
}

export interface Student extends BasePerson {
  rollNumber: string;
  registrationNumber: string;
  semester: number;
  section?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

export interface Course extends Timestamps {
  dueDate: string | number | Date;
  title: string;
  status: AssignmentStatus;
  id: string;
  name: string;
  code: string;
  description?: string | null;
  department: string;
  semester: number;
  credits: number;
  isActive: boolean;
  teacherId?: string | null;
  teacher?: Teacher | null;
  students?: Student[];
}

export interface Attendance extends Timestamps {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface Assignment extends Timestamps {
  id: string;
  title: string;
  description?: string | null;
  courseId: string;
  dueDate: string;
  totalMarks: number;
  instructions?: string | null;
  status: AssignmentStatus;
  isActive: boolean;
}

export interface AssignmentSubmission extends Timestamps {
  id: string;
  assignmentId: string;
  studentId: string;
  response: string;
  submittedAt: string;
  feedback?: string | null;
  score?: number | null;
  gradedAt?: string | null;
  student?: Pick<Student, "id" | "firstName" | "lastName" | "rollNumber">;
}

export interface Exam extends Timestamps {
  id: string;
  title: string;
  description?: string | null;
  courseId: string;
  examDate: string;
  duration: number;
  totalMarks: number;
  instructions?: string | null;
  status: ExamStatus;
  isActive: boolean;
}

export interface ExamSubmission extends Timestamps {
  exam: any;
  id: string;
  examId: string;
  studentId: string;
  score: number;
  submittedAt: string;
}
