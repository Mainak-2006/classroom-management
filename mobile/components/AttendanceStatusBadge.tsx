import { Text, View } from "react-native";

import { AttendanceStatus } from "../lib/types";

const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; label: string }> = {
  [AttendanceStatus.PRESENT]: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Present" },
  [AttendanceStatus.ABSENT]: { bg: "bg-red-100", text: "text-red-700", label: "Absent" },
  [AttendanceStatus.LATE]: { bg: "bg-amber-100", text: "text-amber-700", label: "Late" },
  [AttendanceStatus.EXCUSED]: { bg: "bg-sky-100", text: "text-sky-700", label: "Excused" },
};

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

export default function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${style.bg}`}>
      <Text className={`text-xs font-medium ${style.text}`}>{style.label}</Text>
    </View>
  );
}