/**
 * StudyPlanner Integration Snippet
 * 
 * How to integrate DeleteConfirmationModal into your StudyPlanner component.
 * Copy this pattern as a reference for your actual implementation.
 */

import React, { useState } from 'react';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// Add this to your StudyPlanner component state:

export function StudyPlannerIntegration() {
  // ===== Delete Modal State =====
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    taskId: null as string | null,
    taskTitle: '',
    isDeleting: false,
  });

  // ===== Delete Handlers =====

  /**
   * Opens the delete confirmation modal for a specific task
   */
  const openDeleteModal = (taskId: string, taskTitle: string) => {
    setDeleteModalState({
      isOpen: true,
      taskId,
      taskTitle,
      isDeleting: false,
    });
  };

  /**
   * Closes the delete confirmation modal without deleting
   */
  const closeDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      taskId: null,
      taskTitle: '',
      isDeleting: false,
    });
  };

  /**
   * Confirms and performs the delete operation
   */
  const confirmDelete = async () => {
    const taskId = deleteModalState.taskId;
    if (!taskId) return;

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));

    try {
      // Replace with your actual delete API call
      // Example: await deleteTask(taskId);
      // await supabase.from('tasks').delete().eq('id', taskId);

      console.log(`Deleting task: ${taskId}`);
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update your tasks state here
      // Example: setTasks(prev => prev.filter(t => t.id !== taskId))

      // Success feedback
      console.log(`Task deleted successfully: ${deleteModalState.taskTitle}`);
      
      // Close modal
      closeDeleteModal();

      // Optional: Show success toast
      // toast.success(`"${deleteModalState.taskTitle}" has been deleted`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Optional: Show error toast
      // toast.error('Failed to delete task. Please try again.');
      setDeleteModalState((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // ===== In your JSX (example usage) =====
  return (
    <div>
      {/* Your existing StudyPlanner UI */}
      <div>
        {/* Example task list - replace with your actual tasks */}
        <div className="space-y-2">
          <button
            onClick={() => openDeleteModal('task-1', 'Complete Chapter 5')}
            className="w-full text-left p-3 bg-white rounded hover:bg-gray-50 border flex justify-between items-center"
          >
            <span>Complete Chapter 5</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal('task-1', 'Complete Chapter 5');
              }}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </button>

          <button
            onClick={() => openDeleteModal('task-2', 'Finish Economics Notes')}
            className="w-full text-left p-3 bg-white rounded hover:bg-gray-50 border flex justify-between items-center"
          >
            <span>Finish Economics Notes</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal('task-2', 'Finish Economics Notes');
              }}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </button>
        </div>
      </div>

      {/* ===== Delete Confirmation Modal ===== */}
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        title="Delete Task?"
        description="This will permanently remove this task and all associated checklists and attachments. This action cannot be undone."
        cancelText="Cancel"
        deleteText="Delete Task"
        isLoading={deleteModalState.isDeleting}
        onCancel={closeDeleteModal}
        onDelete={confirmDelete}
      />
    </div>
  );
}

// ===== INTEGRATION CHECKLIST =====
/*

1. Import the modal:
   ✅ import DeleteConfirmationModal from './DeleteConfirmationModal';

2. Add state for modal:
   ✅ useState for isOpen, taskId, isDeleting

3. Create handler functions:
   ✅ openDeleteModal(taskId, taskTitle)
   ✅ closeDeleteModal()
   ✅ confirmDelete()

4. Add delete button to each task:
   ✅ <button onClick={() => openDeleteModal(taskId, taskTitle)}>Delete</button>

5. Add modal to JSX:
   ✅ <DeleteConfirmationModal isOpen={...} ... />

6. Update your API calls:
   ✅ Replace the commented API calls with your actual Supabase/API calls

7. Test:
   ✅ Click delete button → Modal opens
   ✅ Click Cancel → Modal closes
   ✅ Press Escape → Modal closes
   ✅ Click Delete Task → Modal closes + task deleted
   ✅ Test on mobile

*/

export default StudyPlannerIntegration;
