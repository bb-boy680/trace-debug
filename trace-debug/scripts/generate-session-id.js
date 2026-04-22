/**
 * Generate a unique debug session ID
 * Format: YYYYMMDD-HHmmss-xxxx (e.g., 20260421-143022-a3f7)
 */

const now = new Date();
const pad = (n, len = 2) => String(n).padStart(len, "0");
const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const randomPart = Math.random().toString(16).slice(2, 6);

console.log(`${datePart}-${timePart}-${randomPart}`);
