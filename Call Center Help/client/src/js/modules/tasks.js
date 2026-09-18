// Task Management Module
import { escapeHtml } from '../utils/helpers.js';
import { saveData, loadData, STORAGE_LIMITS } from './storage.js';

export function initializeTasks() {
  const addTaskBtn = document.getElementById('add-task');
  const taskTitleInput = document.getElementById('task-title');
  const taskDescriptionInput = document.getElementById('task-description');
  const taskPrioritySelect = document.getElementById('task-priority');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskAssigneeSelect = document.getElementById('task-assignee');
  const taskList = document.getElementById('task-list');
  const filters = document.querySelectorAll('.task-filter');
  const searchInput = document.getElementById('task-search');
  const sortSelect = document.getElementById('task-sort');
  const progressBar = document.getElementById('tasks-progress');
  const completedCount = document.getElementById('completed-count');
  const totalCount = document.getElementById('total-count');

  // Core controls required; optional fields (description, due date, etc.) are guarded
  if (!addTaskBtn || !taskTitleInput || !taskPrioritySelect || !taskList) {
    return;
  }

  let tasks = loadData('tasks', []);
  let currentFilter = 'all';
  let currentSort = 'created-desc';

  function persistTasks() {
    tasks = Array.isArray(tasks)
      ? tasks.slice(-STORAGE_LIMITS.tasks)
      : [];
    saveData('tasks', tasks);
  }

  // Initialize default assignees
  const defaultAssignees = [
    { id: 'me', name: 'Me', avatar: '👤' },
    { id: 'alice', name: 'Alice Johnson', avatar: '👩‍💼' },
    { id: 'bob', name: 'Bob Smith', avatar: '👨‍💻' },
    { id: 'carol', name: 'Carol Davis', avatar: '👩‍💻' },
  ];

  function initializeAssignees() {
    if (!taskAssigneeSelect) return;
    taskAssigneeSelect.innerHTML =
      '<option value="">Select assignee...</option>';
    defaultAssignees.forEach((assignee) => {
      const option = document.createElement('option');
      option.value = assignee.id;
      option.textContent = assignee.name;
      taskAssigneeSelect.appendChild(option);
    });
  }

  function addTask() {
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput
      ? taskDescriptionInput.value.trim()
      : '';
    const priority = taskPrioritySelect.value;
    const dueDate = taskDueDateInput ? taskDueDateInput.value : '';
    const assignee = taskAssigneeSelect ? taskAssigneeSelect.value : '';

    if (!title) {
      showToast('Please enter a task title', 'error');
      return;
    }

    const task = {
      id: Date.now(),
      title,
      description,
      priority,
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      assignee,
      createdAt: new Date(),
      updatedAt: new Date(),
      subtasks: [],
      tags: [],
    };

    tasks.push(task);
    persistTasks();
    updateTaskList();
    updateProgress();

    // Clear form
    taskTitleInput.value = '';
    if (taskDescriptionInput) taskDescriptionInput.value = '';
    taskPrioritySelect.value = 'medium';
    if (taskDueDateInput) taskDueDateInput.value = '';
    if (taskAssigneeSelect) taskAssigneeSelect.value = '';

    showToast('Task added successfully', 'success');

    // Check for due date notifications
    checkDueDateNotifications();
  }

  function updateTaskList() {
    taskList.innerHTML = '';

    let filteredTasks = tasks.filter((task) => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'overdue')
        return (
          task.dueDate &&
          new Date(task.dueDate) < new Date() &&
          task.status !== 'completed'
        );
      return task.status === currentFilter;
    });

    // Apply search filter
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm) ||
          (task.description &&
            task.description.toLowerCase().includes(searchTerm))
      );
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      switch (currentSort) {
        case 'due-asc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'due-desc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate) - new Date(a.dueDate);
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        case 'created-desc':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    filteredTasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.status} priority-${task.priority} ${isOverdue(task) ? 'overdue' : ''}`;

      const assignee = defaultAssignees.find((a) => a.id === task.assignee);
      const dueDateText = task.dueDate
        ? formatDueDate(task.dueDate)
        : 'No due date';

      li.innerHTML = `
        <div class="task-header">
          <div class="task-checkbox">
            <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} data-id="${task.id}">
          </div>
          <div class="task-main">
            <div class="task-title-section">
              <h4 class="task-title ${task.status === 'completed' ? 'completed' : ''}">${escapeHtml(task.title || '')}</h4>
              <div class="task-meta">
                <span class="task-priority priority-${escapeHtml(task.priority || '')}">${getPriorityIcon(task.priority)} ${escapeHtml(task.priority || '')}</span>
                <span class="task-due-date ${isOverdue(task) ? 'overdue' : ''}">${escapeHtml(dueDateText)}</span>
              </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            ${
              assignee
                ? `
              <div class="task-assignee">
                <span class="assignee-avatar">${escapeHtml(assignee.avatar)}</span>
                <span class="assignee-name">${escapeHtml(assignee.name)}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn btn-edit" data-id="${task.id}">
            <span class="btn-icon">✏️</span>
          </button>
          <button class="action-btn btn-delete" data-id="${task.id}">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      `;

      // Add event listeners
      li.querySelector('input[type="checkbox"]').addEventListener(
        'change',
        (e) => {
          toggleTask(parseInt(e.target.dataset.id));
        }
      );
      li.querySelector('.btn-edit').addEventListener('click', (e) => {
        editTask(parseInt(e.target.dataset.id));
      });
      li.querySelector('.btn-delete').addEventListener('click', (e) => {
        deleteTask(parseInt(e.target.dataset.id));
      });

      taskList.appendChild(li);
    });
  }

  function getPriorityIcon(priority) {
    const icons = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };
    return icons[priority] || '⚪';
  }

  function formatDueDate(dueDate) {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays < 7) {
      return `Due in ${diffDays} days`;
    } else {
      return `Due ${date.toLocaleDateString()}`;
    }
  }

  function isOverdue(task) {
    return (
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== 'completed'
    );
  }

  function toggleTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = task.status === 'completed' ? 'pending' : 'completed';
      task.updatedAt = new Date();
      persistTasks();
      updateTaskList();
      updateProgress();

      const statusText =
        task.status === 'completed' ? 'completed' : 'marked as pending';
      showToast(`Task "${task.title}" ${statusText}`, 'success');
    }
  }

  function editTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content task-edit-modal">
        <div class="modal-header">
          <h3>Edit Task</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form class="task-edit-form">
            <div class="form-group">
              <label for="edit-title">Title</label>
              <input type="text" id="edit-title" value="${escapeHtml(task.title || '')}" required>
            </div>
            <div class="form-group">
              <label for="edit-description">Description</label>
              <textarea id="edit-description" rows="3">${escapeHtml(task.description || '')}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-priority">Priority</label>
                <select id="edit-priority">
                  <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                  <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-due-date">Due Date</label>
                <input type="date" id="edit-due-date" value="${task.dueDate ? task.dueDate.split('T')[0] : ''}">
              </div>
            </div>
            <div class="form-group">
              <label for="edit-assignee">Assignee</label>
              <select id="edit-assignee">
                <option value="">Unassigned</option>
                ${defaultAssignees.map((a) => `<option value="${escapeHtml(String(a.id))}" ${task.assignee === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">Cancel</button>
          <button class="btn btn-primary modal-save">Save Changes</button>
        </div>
      </div>
    `;

    modal
      .querySelector('.modal-close')
      .addEventListener('click', () => modal.remove());
    modal
      .querySelector('.modal-cancel')
      .addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-save').addEventListener('click', () => {
      const newTitle = modal.querySelector('#edit-title').value.trim();
      const newDescription = modal
        .querySelector('#edit-description')
        .value.trim();
      const newPriority = modal.querySelector('#edit-priority').value;
      const newDueDate = modal.querySelector('#edit-due-date').value;
      const newAssignee = modal.querySelector('#edit-assignee').value;

      if (newTitle) {
        task.title = newTitle;
        task.description = newDescription;
        task.priority = newPriority;
        task.dueDate = newDueDate ? new Date(newDueDate) : null;
        task.assignee = newAssignee;
        task.updatedAt = new Date();

        persistTasks();
        updateTaskList();
        updateProgress();
        modal.remove();
        showToast('Task updated successfully', 'success');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      tasks = tasks.filter((t) => t.id !== taskId);
      persistTasks();
      updateTaskList();
      updateProgress();
      showToast('Task deleted successfully', 'success');
    }
  }

  function updateProgress() {
    const completed = tasks.filter(
      (task) => task.status === 'completed'
    ).length;
    const total = tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (completedCount) completedCount.textContent = completed;
    if (totalCount) totalCount.textContent = total;
  }

  function checkDueDateNotifications() {
    const overdueTasks = tasks.filter((task) => isOverdue(task));
    if (overdueTasks.length > 0) {
      showToast(
        `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''}`,
        'warning'
      );
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Event listeners
  addTaskBtn.addEventListener('click', addTask);

  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      filters.forEach((f) => f.classList.remove('active'));
      filter.classList.add('active');
      currentFilter = filter.dataset.filter;
      updateTaskList();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', updateTaskList);
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      updateTaskList();
    });
  }

  // Initialize
  initializeAssignees();
  updateTaskList();
  updateProgress();
  checkDueDateNotifications();

  // Check for due dates every minute
  setInterval(checkDueDateNotifications, 60000);
}
