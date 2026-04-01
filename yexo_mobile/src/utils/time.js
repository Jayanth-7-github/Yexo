import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
} from "date-fns";

// Format message timestamp
export const formatMessageTime = (date) => {
  if (!date) return "";

  const messageDate = new Date(date);

  if (isToday(messageDate)) {
    return format(messageDate, "HH:mm");
  } else if (isYesterday(messageDate)) {
    return "Yesterday";
  } else if (isThisWeek(messageDate)) {
    return format(messageDate, "EEEE");
  } else {
    return format(messageDate, "dd/MM/yyyy");
  }
};

// Format chat list time
export const formatChatTime = (date) => {
  if (!date) return "";

  const messageDate = new Date(date);

  if (isToday(messageDate)) {
    return format(messageDate, "HH:mm");
  } else if (isYesterday(messageDate)) {
    return "Yesterday";
  } else {
    return format(messageDate, "dd/MM/yy");
  }
};

// Format relative time (e.g., "5 minutes ago")
export const formatRelativeTime = (date) => {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Format full date
export const formatFullDate = (date) => {
  if (!date) return "";
  return format(new Date(date), "PPpp");
};
