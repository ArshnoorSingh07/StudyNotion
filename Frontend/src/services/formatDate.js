export const formatDate = (dateString) => {
  const date = new Date(dateString);

  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hour = date.getHours();
  const minutes = date.getMinutes();

  const formattedHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  const formattedTime = `${formattedHour}:${minutes
    .toString()
    .padStart(2, "0")} ${period}`;

  return `${formattedDate} | ${formattedTime}`;
};