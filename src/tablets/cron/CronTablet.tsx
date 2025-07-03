import React from 'react';
import { Tablet, TabletState } from '../types';
import { CronUI } from './CronUI';
import { CronExpression, CronDialect, CronPattern, TimeZone } from './types';

interface CronTabletState extends TabletState {
  type: 'cron';
  data: {
    expression: CronExpression;
    dialect: CronDialect;
    timezone: TimeZone;
    savedPatterns: CronPattern[];
    history: CronExpression[];
    activeTab: 'natural' | 'segmented' | 'raw';
  };
}

export const CronTablet: Tablet = {
  id: 'cron',
  label: 'Cron Expression Builder',
  keywords: ['cron', 'schedule', 'job', 'task', 'expression', 'time', 'scheduler', 'automation'],

  createInitialState(): CronTabletState {
    return {
      type: 'cron',
      data: {
        expression: {
          raw: '0 0 * * *',
          minute: '0',
          hour: '0',
          dayOfMonth: '*',
          month: '*',
          dayOfWeek: '*',
          second: '0',
          year: '*',
        },
        dialect: 'unix',
        timezone: {
          name: Intl.DateTimeFormat().resolvedOptions().timeZone,
          type: 'local'
        },
        savedPatterns: [
          { id: '1', name: 'Every minute', expression: '* * * * *', dialect: 'unix', description: 'Runs every minute of every hour, every day' },
          { id: '2', name: 'Hourly', expression: '0 * * * *', dialect: 'unix', description: 'Runs at the start of every hour, every day' },
          { id: '3', name: 'Daily at midnight', expression: '0 0 * * *', dialect: 'unix', description: 'Runs at midnight (00:00) every day' },
          { id: '4', name: 'Weekly on Sunday', expression: '0 0 * * 0', dialect: 'unix', description: 'Runs at midnight every Sunday' },
          { id: '5', name: 'Monthly (1st day)', expression: '0 0 1 * *', dialect: 'unix', description: 'Runs at midnight on the first day of every month' },
          { id: '6', name: 'Yearly (Jan 1st)', expression: '0 0 1 1 *', dialect: 'unix', description: 'Runs at midnight on January 1st' },
          { id: '7', name: 'Weekdays at 9am', expression: '0 9 * * 1-5', dialect: 'unix', description: 'Runs at 9:00 AM, Monday through Friday' },
          { id: '8', name: 'Business hours', expression: '0 9-17 * * 1-5', dialect: 'unix', description: 'Runs every hour from 9 AM to 5 PM, Monday through Friday' },
        ],
        history: [],
        activeTab: 'natural'
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'cron' && parsed.data) {
        return parsed as CronTabletState;
      }
    } catch (e) {
      console.error('Failed to parse Cron tablet state:', e);
    }
    return this.createInitialState();
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const typedState = state as CronTabletState;
    return (
      <CronUI 
        state={typedState.data} 
        onChange={(newData) => {
          onChange({
            ...typedState,
            data: newData
          });
        }}
      />
    );
  }
};