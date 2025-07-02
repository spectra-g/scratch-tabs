import { CronDialect, CronCodeSnippet } from '../types';

/**
 * Get code snippets for a cron expression in various languages and frameworks
 */
export function getCronCodeSnippets(expression: string, dialect: CronDialect): CronCodeSnippet[] {
  const snippets: CronCodeSnippet[] = [];
  
  // JavaScript snippets
  snippets.push({
    language: 'javascript',
    framework: 'node-cron',
    code: `const cron = require('node-cron');

// Schedule a task to run based on the cron expression
cron.schedule('${expression}', () => {
  console.log('Running a task based on the cron expression');
});`,
    installCommand: 'npm install node-cron',
    description: 'A simple cron-like task scheduler for Node.js'
  });
  
  snippets.push({
    language: 'javascript',
    framework: 'cron',
    code: `const CronJob = require('cron').CronJob;

// Create a new cron job
const job = new CronJob(
  '${expression}', // cron expression
  function() {
    console.log('Running a task based on the cron expression');
  },
  null, // onComplete
  true, // start
  '${dialect === 'quartz' ? 'America/Los_Angeles' : 'UTC'}' // timezone
);

// You can also manually start the job
// job.start();`,
    installCommand: 'npm install cron',
    description: 'Cron jobs for your Node.js application'
  });
  
  // Python snippets
  snippets.push({
    language: 'python',
    framework: 'schedule',
    code: `import schedule
import time

def job():
    print("Running a task based on the cron expression")

# Note: schedule doesn't directly support cron expressions,
# so we need to convert it to schedule's syntax
# This is a simplified example for common patterns

schedule.every().day.at("00:00").do(job)  # Example for daily at midnight

# Keep the program running
while True:
    schedule.run_pending()
    time.sleep(1)`,
    installCommand: 'pip install schedule',
    description: 'Python job scheduling for humans'
  });
  
  snippets.push({
    language: 'python',
    framework: 'apscheduler',
    code: `from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

def job():
    print("Running a task based on the cron expression")

scheduler = BlockingScheduler()
scheduler.add_job(
    job, 
    CronTrigger.from_crontab('${expression}')
)

try:
    scheduler.start()
except (KeyboardInterrupt, SystemExit):
    pass`,
    installCommand: 'pip install apscheduler',
    description: 'Advanced Python Scheduler with cron-style scheduling'
  });
  
  // Java snippets
  snippets.push({
    language: 'java',
    framework: 'spring',
    code: `import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduledTasks {

    @Scheduled(cron = "${expression}")
    public void scheduledTask() {
        System.out.println("Running a task based on the cron expression");
    }
}`,
    description: 'Spring Framework scheduled tasks using cron expressions'
  });
  
  snippets.push({
    language: 'java',
    framework: 'quartz',
    code: `import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;

public class CronExample {
    public static void main(String[] args) throws Exception {
        // Define the job and tie it to our job class
        JobDetail job = JobBuilder.newJob(MyJob.class)
            .withIdentity("myJob", "group1")
            .build();

        // Create a trigger with the cron expression
        Trigger trigger = TriggerBuilder.newTrigger()
            .withIdentity("myTrigger", "group1")
            .withSchedule(CronScheduleBuilder.cronSchedule("${expression}"))
            .build();

        // Schedule the job with the trigger
        Scheduler scheduler = new StdSchedulerFactory().getScheduler();
        scheduler.start();
        scheduler.scheduleJob(job, trigger);
    }
}

// Job class that will be executed
public class MyJob implements Job {
    public void execute(JobExecutionContext context) throws JobExecutionException {
        System.out.println("Running a task based on the cron expression");
    }
}`,
    description: 'Quartz Scheduler for Java applications'
  });
  
  // PHP snippets
  snippets.push({
    language: 'php',
    framework: 'laravel',
    code: `<?php

// In app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('app:your-command')
             ->cron('${expression}');
}`,
    description: 'Laravel Task Scheduling with cron expressions'
  });
  
  // Go snippets
  snippets.push({
    language: 'go',
    framework: 'cron',
    code: `package main

import (
	"fmt"
	"github.com/robfig/cron/v3"
	"time"
)

func main() {
	c := cron.New()
	
	// Add a job with the cron expression
	_, err := c.AddFunc("${expression}", func() {
		fmt.Println("Running a task based on the cron expression")
	})
	
	if err != nil {
		fmt.Println("Error scheduling job:", err)
		return
	}
	
	// Start the scheduler
	c.Start()
	
	// Keep the program running
	select {}
}`,
    installCommand: 'go get github.com/robfig/cron/v3',
    description: 'A cron library for Go'
  });
  
  // Ruby snippets
  snippets.push({
    language: 'ruby',
    framework: 'whenever',
    code: `# In config/schedule.rb
every '${expression}' do
  runner "MyModel.task_to_run"
end`,
    installCommand: 'gem install whenever',
    description: 'Whenever is a Ruby gem for writing and deploying cron jobs'
  });
  
  // C# snippets
  snippets.push({
    language: 'csharp',
    framework: 'quartz.net',
    code: `using Quartz;
using Quartz.Impl;

public class Program
{
    public static async Task Main(string[] args)
    {
        // Create a scheduler factory
        StdSchedulerFactory factory = new StdSchedulerFactory();
        
        // Get a scheduler
        IScheduler scheduler = await factory.GetScheduler();
        await scheduler.Start();
        
        // Define the job and tie it to our job class
        IJobDetail job = JobBuilder.Create<MyJob>()
            .WithIdentity("myJob", "group1")
            .Build();
        
        // Create a trigger with the cron expression
        ITrigger trigger = TriggerBuilder.Create()
            .WithIdentity("myTrigger", "group1")
            .WithCronSchedule("${expression}")
            .Build();
        
        // Schedule the job with the trigger
        await scheduler.ScheduleJob(job, trigger);
    }
}

public class MyJob : IJob
{
    public Task Execute(IJobExecutionContext context)
    {
        Console.WriteLine("Running a task based on the cron expression");
        return Task.CompletedTask;
    }
}`,
    installCommand: 'dotnet add package Quartz',
    description: 'Quartz.NET is a full-featured, open source job scheduling system for .NET'
  });
  
  // Shell snippets
  snippets.push({
    language: 'shell',
    framework: 'crontab',
    code: `# Add this line to your crontab file (crontab -e)
${expression} /path/to/your/script.sh

# Or with output redirection
${expression} /path/to/your/script.sh >> /path/to/logfile.log 2>&1`,
    description: 'Linux/Unix crontab entry'
  });
  
  return snippets;
}