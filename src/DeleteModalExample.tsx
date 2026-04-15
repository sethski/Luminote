import React, { useState } from 'react';
import DeleteConfirmationModal from './DeleteConfirmationModal';

/**
 * Example: How to use DeleteConfirmationModal in your components
 * 
 * This demonstrates:
 * - State management for modal visibility
 * - Handling delete operations
 * - Loading states
 * - Integration with task operations
 */

interface Task {
  id: string;
  title: string;
  description?: string;
}

export const DeleteModalExample: React.FC = () => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Example tasks
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Complete project proposal', description: 'Q1 deliverable' },
    { id: '2', title: 'Review PR comments', description: 'Code review feedback' },
    { id: '3', title: 'Update documentation', description: 'API docs' },
  ]);

  // Open delete modal for a specific task
  const handleDeleteClick = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteModalOpen(true);
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedTask(null);
  };

  // Perform delete operation
  const handleConfirmDelete = async () => {
    if (!selectedTask) return;

    setIsDeleting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Remove task from list
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));

      // Close modal
      setIsDeleteModalOpen(false);
      setSelectedTask(null);

      // Optional: Show success toast/notification
      console.log(`Task "${selectedTask.title}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Optional: Show error toast/notification
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tasks</h1>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No tasks. All clean! ✨</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-600">{task.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteClick(task)}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Task?"
        description="This will permanently remove this task and all associated checklists and attachments. This action cannot be undone."
        cancelText="Cancel"
        deleteText="Delete Task"
        isLoading={isDeleting}
        onCancel={handleCancelDelete}
        onDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default DeleteModalExample;
