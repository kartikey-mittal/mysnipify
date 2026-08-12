export const todayString = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

export const to12Hour = (time) => {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

export const formatDate = (date) => {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = parseInt(parts[2], 10);
  const month = months[parseInt(parts[1], 10) - 1];
  return `${day} ${month} ${parts[0]}`;
};

export const formatDateShort = (date) => {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]}`;
};

export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins < 1) return `${secs} sec`;
  return `${mins} min ${secs} sec`;
};
