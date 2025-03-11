import { format } from 'date-fns';
const { debug } = require('./debug');
const { formatInTimeZone, getTimezoneOffset } = require('date-fns-tz');

/**
 * Formats a raw time string into a human-readable format
 * @param {string} rawTime - Raw time string (ISO or Unix timestamp)
 * @returns {string} Formatted time string
 */
function formatTime(rawTime) {
  if (!rawTime || rawTime === 'No time') {
    return 'No time available';
  }

  try {
    const [isoString, unixTimestamp] = rawTime.split(' ');
    let date;

    if (unixTimestamp) {
      date = fromUnixTime(parseInt(unixTimestamp, 10));
    } else {
      date = parseISO(isoString);
    }

    if (!isValid(date)) {
      throw new Error(`Invalid date format: ${rawTime}`);
    }

    return format(date, "h:mma 'on' MMMM d, yyyy");
  } catch (error) {
    debug(`Error formatting time: ${error.message}`);
    return 'Invalid date';
  }
}

/**
 * Trims article data to essential fields
 * @param {Object} article - Full article object
 * @returns {Object} Trimmed article object
 * @throws {Error} If article is invalid
 */
export function trimArticleData(article) {
  return {
    id: article.id,
    title: article.title,
    link: article.link,
    formattedTime: article.formattedTime,
  };
}

/**
 * Extracts image URL from article content
 * @param {string} content - Article content
 * @returns {string|null} Image URL or null if not found
 */
function extractImageFromContent(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  try {
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = content.match(imgRegex);
    return match ? match[1] : null;
  } catch (error) {
    debug(`Error extracting image: ${error.message}`);
    return null;
  }
}

function getTimeZone() {
  try {
    // Try to get user's timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone || 'America/New_York'; // Default to EST
  } catch (error) {
    return 'America/New_York'; // Default to EST
  }
}

export function validateAndFormatDate(date) {
  const validDate = new Date(date);
  if (isNaN(validDate.getTime())) {
    throw new Error('Invalid date');
  }

  return {
    timestamp: validDate.getTime(),
    formattedTime: format(validDate, 'MMM d, yyyy h:mm a'),
  };
}

module.exports = {
  formatTime,
  extractImageFromContent,
  getTimeZone,
};
