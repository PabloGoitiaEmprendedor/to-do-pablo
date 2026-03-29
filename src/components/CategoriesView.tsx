import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Folder } from 'lucide-react';
import { useCategories, useAllTasks, DbCategory } from '@/hooks/useSupabaseTasks';
import { CategoryEditor } from './CategoryEditor';
import { TaskDetailModal } from './TaskDetailModal';
import { useDbTasks } from '@/hooks/useSupabaseTasks';
import { DbTask } from '@/hooks/useSupabaseTasks';

export function CategoriesView() {
  const { categories, loading, deleteCategory } = useCategories();
  const { tasks, updateTask, completeTask, failTask, deleteTask } = useDbTasks();
  const [selectedCategory, setSelectedCategory] = useState<DbCategory | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);

  const tasksByCategory = useMemo(() => {
    const map = new Map<string, DbTask[]>();
    map.set('uncategorized', []);
    
    for (const cat of categories) {
      map.set(cat.id, []);
    }
    
    for (const task of tasks) {
      if (task.parent_task_id) continue;
      if (task.category_id && map.has(task.category_id)) {
        map.get(task.category_id)!.push(task);
      } else {
        map.get('uncategorized')!.push(task);
      }
    }
    
    return map;
  }, [tasks, categories]);

  const handleEditCategory = (category: DbCategory) => {
    setEditingCategory(category);
    setShowEditor(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('¿Eliminar esta categoría? Las tareas mantendrán su prioridad pero perderán la categoría.')) {
      const catTasks = tasks.filter(t => t.category_id === id);
      for (const task of catTasks) {
        await updateTask(task.id, { category_id: null });
      }
      await deleteCategory(id);
    }
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingCategory(null);
  };

  const priorityColors: Record<string, string> = {
    '20': 'bg-red-500',
    '70': 'bg-yellow-500',
    '10': 'bg-blue-500',
    'optional': 'bg-gray-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Categorías</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organiza tus tareas por categorías
          </p>
        </div>
        <button
          onClick={handleNewCategory}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const catTasks = tasksByCategory.get(category.id) || [];
            const pendingTasks = catTasks.filter(t => t.status === 'pending');
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div 
                  className="flex items-center justify-between p-4 border-b border-border cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory?.id === category.id ? null : category)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {pendingTasks.length} tareas pendientes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }}
                      className="p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                {selectedCategory?.id === category.id && catTasks.length > 0 && (
                  <div className="p-3 space-y-2">
                    {catTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left ${
                          task.status === 'completed' || task.status === 'failed' ? 'opacity-50' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                        <span className={`flex-1 text-sm truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {task.duration_minutes}m
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {categories.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin categorías</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea categorías para organizar tus tareas
              </p>
              <button
                onClick={handleNewCategory}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Crear categoría
              </button>
            </div>
          )}

          {(tasksByCategory.get('uncategorized')?.length || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-gray-400 opacity-50 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Sin categoría</h3>
                    <p className="text-xs text-muted-foreground">
                      {tasksByCategory.get('uncategorized')?.filter(t => t.status === 'pending').length || 0} tareas pendientes
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {tasksByCategory.get('uncategorized')?.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left ${
                      task.status === 'completed' || task.status === 'failed' ? 'opacity-50' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                    <span className={`flex-1 text-sm truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {task.duration_minutes}m
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {showEditor && (
        <CategoryEditor
          category={editingCategory}
          onClose={handleCloseEditor}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={updateTask}
        onComplete={completeTask}
        onFail={failTask}
        onDelete={deleteTask}
        onTaskSelect={setSelectedTask}
        allTasks={tasks}
      />
    </div>
  );
}
