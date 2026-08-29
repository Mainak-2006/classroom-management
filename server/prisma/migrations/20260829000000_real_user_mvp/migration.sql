CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedback" TEXT,
    "score" INTEGER,
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevokedAccessToken" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevokedAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");
CREATE UNIQUE INDEX "ExamSubmission_examId_studentId_key" ON "ExamSubmission"("examId", "studentId");
CREATE INDEX "AssignmentSubmission_studentId_submittedAt_idx" ON "AssignmentSubmission"("studentId", "submittedAt");
CREATE INDEX "AssignmentSubmission_assignmentId_submittedAt_idx" ON "AssignmentSubmission"("assignmentId", "submittedAt");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "RevokedAccessToken_expiresAt_idx" ON "RevokedAccessToken"("expiresAt");
CREATE INDEX "Course_teacherId_idx" ON "Course"("teacherId");
CREATE INDEX "Course_department_semester_idx" ON "Course"("department", "semester");
CREATE INDEX "Attendance_courseId_date_idx" ON "Attendance"("courseId", "date");
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");
CREATE INDEX "Assignment_courseId_status_dueDate_idx" ON "Assignment"("courseId", "status", "dueDate");

ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma has separate person tables. A database trigger makes email uniqueness
-- global as well as per-table, including for concurrent registrations.
CREATE OR REPLACE FUNCTION ensure_unique_account_email() RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(lower(NEW.email)));
  IF TG_TABLE_NAME = 'Student' AND (EXISTS (SELECT 1 FROM "Teacher" WHERE email = NEW.email) OR EXISTS (SELECT 1 FROM "Admin" WHERE email = NEW.email)) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  ELSIF TG_TABLE_NAME = 'Teacher' AND (EXISTS (SELECT 1 FROM "Student" WHERE email = NEW.email) OR EXISTS (SELECT 1 FROM "Admin" WHERE email = NEW.email)) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  ELSIF TG_TABLE_NAME = 'Admin' AND (EXISTS (SELECT 1 FROM "Student" WHERE email = NEW.email) OR EXISTS (SELECT 1 FROM "Teacher" WHERE email = NEW.email)) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_unique_account_email BEFORE INSERT OR UPDATE OF email ON "Student" FOR EACH ROW EXECUTE FUNCTION ensure_unique_account_email();
CREATE TRIGGER teacher_unique_account_email BEFORE INSERT OR UPDATE OF email ON "Teacher" FOR EACH ROW EXECUTE FUNCTION ensure_unique_account_email();
CREATE TRIGGER admin_unique_account_email BEFORE INSERT OR UPDATE OF email ON "Admin" FOR EACH ROW EXECUTE FUNCTION ensure_unique_account_email();
