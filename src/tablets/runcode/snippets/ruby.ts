export const rubySnippet = {
  name: "Ruby",
  code: `class TodoList
    def initialize
        @tasks = []
    end
    
    def add_task(title, priority = :normal)
        @tasks << {
            title: title,
            priority: priority,
            completed: false,
            created_at: Time.now
        }
    end
    
    def complete_task(index)
        if task = @tasks[index]
            task[:completed] = true
        end
    end
    
    def display_tasks
        puts "\\nTodo List:"
        puts "-" * 40
        
        @tasks.each_with_index do |task, index|
            status = task[:completed] ? "✓" : " "
            priority = task[:priority].to_s.upcase
            puts "[#{status}] #{index + 1}. (#{priority}) #{task[:title]}"
        end
    end
end

# Test the TodoList
list = TodoList.new

# Add some tasks with different priorities
list.add_task("Learn Ruby", :high)
list.add_task("Write documentation", :normal)
list.add_task("Take a break", :low)

# Complete a task
list.complete_task(0)

# Display the list
list.display_tasks`,
};
