import { CronDialectInfo } from '../types';

/**
 * Get information about a specific cron dialect
 */
export function getDialectInfo(dialect: string): CronDialectInfo {
  switch (dialect) {
    case 'unix':
      return {
        id: 'unix',
        name: 'Unix Cron',
        description: 'The standard Unix cron format with 5 fields.',
        fields: [
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (0-6, 0=Sunday)', allowedValues: '0-6, *, /, -' },
        ],
        examples: [
          { expression: '0 0 * * *', description: 'Daily at midnight' },
          { expression: '*/15 * * * *', description: 'Every 15 minutes' },
          { expression: '0 9-17 * * 1-5', description: 'Every hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
      
    case 'quartz':
      return {
        id: 'quartz',
        name: 'Quartz Scheduler',
        description: 'Quartz Scheduler format with 6 or 7 fields, including seconds and optional year.',
        fields: [
          { name: 'second', required: true, description: 'Second (0-59)', allowedValues: '0-59, *, /, -, ?' },
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -, ?' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -, ?' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -, ?, L, W' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -, JAN-DEC' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (1-7, 1=Sunday)', allowedValues: '1-7, *, /, -, ?, L, #, SUN-SAT' },
          { name: 'year', required: false, description: 'Year (optional)', allowedValues: '*, /, -, 1970-2099' },
        ],
        examples: [
          { expression: '0 0 0 * * ?', description: 'Daily at midnight' },
          { expression: '0 */15 * * * ?', description: 'Every 15 minutes' },
          { expression: '0 0 9-17 ? * MON-FRI', description: 'Every hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
      
    case 'spring':
      return {
        id: 'spring',
        name: 'Spring Scheduler',
        description: 'Spring Scheduler format with 6 fields, including seconds.',
        fields: [
          { name: 'second', required: true, description: 'Second (0-59)', allowedValues: '0-59, *, /, -, ?' },
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -, ?' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -, ?' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -, ?, L, W' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -, JAN-DEC' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (1-7, 1=Sunday)', allowedValues: '1-7, *, /, -, ?, L, #, SUN-SAT' },
        ],
        examples: [
          { expression: '0 0 0 * * ?', description: 'Daily at midnight' },
          { expression: '0 */15 * * * ?', description: 'Every 15 minutes' },
          { expression: '0 0 9-17 ? * MON-FRI', description: 'Every hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
      
    case 'aws':
      return {
        id: 'aws',
        name: 'AWS EventBridge',
        description: 'AWS EventBridge format with 6 fields, including year.',
        fields: [
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -, JAN-DEC' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (1-7, 1=Sunday)', allowedValues: '1-7, *, /, -, SUN-SAT' },
          { name: 'year', required: true, description: 'Year', allowedValues: '*, /, -, 1970-2199' },
        ],
        examples: [
          { expression: '0 0 * * ? *', description: 'Daily at midnight' },
          { expression: '*/15 * * * ? *', description: 'Every 15 minutes' },
          { expression: '0 9-17 ? * MON-FRI *', description: 'Every hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
      
    case 'crontab':
      return {
        id: 'crontab',
        name: 'Linux Crontab',
        description: 'Linux crontab format with 5 fields.',
        fields: [
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -, JAN-DEC' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (0-6, 0=Sunday)', allowedValues: '0-6, *, /, -, SUN-SAT' },
        ],
        examples: [
          { expression: '0 0 * * *', description: 'Daily at midnight' },
          { expression: '*/15 * * * *', description: 'Every 15 minutes' },
          { expression: '0 9-17 * * 1-5', description: 'Every hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
      
    case 'jenkins':
      return {
        id: 'jenkins',
        name: 'Jenkins',
        description: 'Jenkins cron format with 5 fields.',
        fields: [
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -, JAN-DEC' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (0-7, 0,7=Sunday)', allowedValues: '0-7, *, /, -, SUN-SAT' },
        ],
        examples: [
          { expression: 'H H * * *', description: 'Once a day (with H for load balancing)' },
          { expression: 'H/15 * * * *', description: 'Every 15 minutes (with H for load balancing)' },
          { expression: 'H 9-17 * * 1-5', description: 'Once an hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
      
    default:
      return {
        id: 'unix',
        name: 'Unix Cron',
        description: 'The standard Unix cron format with 5 fields.',
        fields: [
          { name: 'minute', required: true, description: 'Minute (0-59)', allowedValues: '0-59, *, /, -' },
          { name: 'hour', required: true, description: 'Hour (0-23)', allowedValues: '0-23, *, /, -' },
          { name: 'dayOfMonth', required: true, description: 'Day of Month (1-31)', allowedValues: '1-31, *, /, -' },
          { name: 'month', required: true, description: 'Month (1-12)', allowedValues: '1-12, *, /, -' },
          { name: 'dayOfWeek', required: true, description: 'Day of Week (0-6, 0=Sunday)', allowedValues: '0-6, *, /, -' },
        ],
        examples: [
          { expression: '0 0 * * *', description: 'Daily at midnight' },
          { expression: '*/15 * * * *', description: 'Every 15 minutes' },
          { expression: '0 9-17 * * 1-5', description: 'Every hour from 9 AM to 5 PM, Monday through Friday' },
        ]
      };
  }
}