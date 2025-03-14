import { format, formatDistance } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { debug } from './debug.js';

export const timeFormatters = {
  formatTime(timestamp) {
    return format(new Date(timestamp), 'HH:mm');
  },

  getTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  validateAndFormatDate(date) {
    const validDate = new Date(date);
    if (isNaN(validDate.getTime())) {
      throw new Error('Invalid date');
    }
    return {
      timestamp: validDate.getTime(),
      formattedTime: format(validDate, 'MMM d, yyyy h:mm a'),
    };
  },
};

export const articleFormatters = {
  trimArticleData(article) {
    return {
      id: article.id,
      title: article.title,
      link: article.link,
      domain: article.domain,
      timestamp: article.timestamp,
      preview: article.preview,
    };
  },
};

// Export individual functions for backward compatibility
export const { formatTime, getTimeZone, validateAndFormatDate } =
  timeFormatters;
export const { trimArticleData } = articleFormatters;

// Default export combining all formatters
export default {
  ...timeFormatters,
  ...articleFormatters,
};
