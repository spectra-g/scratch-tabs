export type CronDialect = 
  | 'unix' 
  | 'quartz' 
  | 'aws' 
  | 'spring' 
  | 'crontab' 
  | 'jenkins';

export interface CronExpression {
  raw: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  second?: string;
  year?: string;
}

export interface TimeZone {
  name: string;
  type: 'local' | 'utc' | 'custom';
}

export interface CronPattern {
  id: string;
  name: string;
  expression: string;
  dialect: CronDialect;
  description?: string;
}

export interface CronExecution {
  date: Date;
  formatted: string;
}

export interface CronValidationError {
  field: keyof CronExpression | 'global';
  message: string;
  type: 'error' | 'warning';
}

export interface CronDialectInfo {
  id: CronDialect;
  name: string;
  description: string;
  fields: Array<{
    name: keyof CronExpression;
    required: boolean;
    description: string;
    allowedValues: string;
    specialChars?: string;
  }>;
  examples: Array<{
    expression: string;
    description: string;
  }>;
}

export interface CronFieldInfo {
  name: string;
  min: number;
  max: number;
  allowedSpecialChars: string;
  description: string;
  examples: string[];
}

export interface CronCodeSnippet {
  language: string;
  framework: string;
  code: string;
  installCommand?: string;
  description?: string;
}