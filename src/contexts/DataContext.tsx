import { createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { useMinistries } from "@/hooks/useMinistries";
import type { Ministry, MinistryInput } from "@/hooks/useMinistries";
import { useUsers } from "@/hooks/useUsers";
import type { User, CreateUserInput, CreateUserResult } from "@/hooks/useUsers";
import { useEvents } from "@/hooks/useEvents";
import type { Event, EventInput, RecurrenceConfig, EventMember } from "@/hooks/useEvents";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import type { Announcement, AnnouncementInput } from "@/hooks/useAnnouncements";
import { useEventTasks } from "@/hooks/useEventTasks";
import type { EventTask, TaskInput, TaskStatus, TaskPriority, TaskChecklist, TaskChecklistItem } from "@/hooks/useEventTasks";

// Task labels - exported for components that need them
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export const defaultTaskLabels: TaskLabel[] = [
  { id: "label-1", name: "Urgente", color: "#B91C1C" },
  { id: "label-2", name: "Importante", color: "#92400E" },
  { id: "label-3", name: "Revisar", color: "#A16207" },
  { id: "label-4", name: "Em Espera", color: "#155E75" },
  { id: "label-5", name: "Aprovado", color: "#065F46" },
  { id: "label-6", name: "Bloqueado", color: "#5B21B6" },
];

// Re-export types for backward compatibility
export type { Ministry, User, Event, Announcement, EventTask, TaskStatus, TaskPriority, RecurrenceConfig, EventMember, TaskChecklist, TaskChecklistItem };

interface DataContextType {
  // Events
  events: Event[];
  addEvent: (event: EventInput) => Promise<unknown>;
  updateEvent: (id: string, event: Partial<EventInput>, regenerateSeries?: boolean) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  updateEventSeries: (parentId: string, event: Partial<EventInput>) => Promise<void>;
  deleteEventSeries: (parentId: string) => Promise<void>;
  
  // Users
  users: User[];
  addUser: (user: CreateUserInput) => Promise<CreateUserResult>;
  updateUser: (id: string, user: Partial<CreateUserInput>) => Promise<void>;
  deleteUser: (id: string) => void;
  
  // Ministries
  ministries: Ministry[];
  addMinistry: (ministry: MinistryInput) => Promise<unknown>;
  updateMinistry: (id: string, ministry: Partial<MinistryInput>) => Promise<void>;
  deleteMinistry: (id: string) => Promise<void>;

  // Announcements
  announcements: Announcement[];
  addAnnouncement: (announcement: AnnouncementInput) => Promise<unknown>;
  updateAnnouncement: (id: string, announcement: Partial<AnnouncementInput>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  getAnnouncementById: (id: string) => Announcement | undefined;
  getPublishedAnnouncements: () => Announcement[];

  // Event Tasks (Kanban)
  eventTasks: EventTask[];
  addTask: (task: TaskInput) => Promise<unknown>;
  updateTask: (id: string, task: Partial<TaskInput & { isArchived?: boolean }>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => Promise<void>;
  getTasksByEventId: (eventId: string) => EventTask[];
  getTaskById: (id: string) => EventTask | undefined;
  
  // Checklist functions
  addChecklist: (taskId: string, title?: string) => Promise<void>;
  updateChecklistTitle: (taskId: string, checklistId: string, title: string) => Promise<void>;
  deleteChecklist: (taskId: string, checklistId: string) => Promise<void>;
  addChecklistItem: (taskId: string, checklistId: string, title: string, assigneeId?: string, dueDate?: string) => Promise<void>;
  toggleChecklistItem: (taskId: string, checklistId: string, itemId: string) => Promise<void>;
  deleteChecklistItem: (taskId: string, checklistId: string, itemId: string) => Promise<void>;
  reorderChecklistItems: (taskId: string, checklistId: string, itemIds: string[]) => Promise<void>;
  
  // Helpers
  getMinistryById: (id: string) => Ministry | undefined;
  getUserById: (id: string) => User | undefined;
  resetData: () => void;

  // Loading states
  isLoading: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  // Use all the hooks
  const ministriesHook = useMinistries();
  const usersHook = useUsers();
  const eventsHook = useEvents();
  const announcementsHook = useAnnouncements();
  const tasksHook = useEventTasks();

  // Loading state
  const isLoading = ministriesHook.isLoading || usersHook.isLoading || eventsHook.isLoading || announcementsHook.isLoading || tasksHook.isLoading;

  // Ministries
  const addMinistry = useCallback(async (ministry: MinistryInput) => {
    return ministriesHook.addMinistry(ministry);
  }, [ministriesHook]);

  const updateMinistry = useCallback(async (id: string, ministry: Partial<MinistryInput>) => {
    return ministriesHook.updateMinistry({ id, data: ministry });
  }, [ministriesHook]);

  const deleteMinistry = useCallback(async (id: string) => {
    return ministriesHook.deleteMinistry(id);
  }, [ministriesHook]);

  const getMinistryById = useCallback((id: string) => {
    return ministriesHook.ministries.find(m => m.id === id);
  }, [ministriesHook.ministries]);

  // Users
  const addUser = useCallback(async (user: CreateUserInput) => {
    return usersHook.createUser(user);
  }, [usersHook]);

  const updateUser = useCallback(async (id: string, user: Partial<CreateUserInput>) => {
    return usersHook.updateUser({ id, data: user });
  }, [usersHook]);

  const deleteUser = useCallback(() => {
    // User deletion not implemented yet
    console.warn("User deletion not implemented");
  }, []);

  const getUserById = useCallback((id: string) => {
    return usersHook.users.find(u => u.id === id);
  }, [usersHook.users]);

  // Events
  const addEvent = useCallback(async (event: EventInput) => {
    return eventsHook.addEvent(event);
  }, [eventsHook]);

  const updateEvent = useCallback(async (id: string, event: Partial<EventInput>, regenerateSeries?: boolean) => {
    return eventsHook.updateEvent({ id, data: event, regenerateSeries });
  }, [eventsHook]);

  const deleteEvent = useCallback(async (id: string) => {
    return eventsHook.deleteEvent(id);
  }, [eventsHook]);

  const getEventById = useCallback((id: string) => {
    return eventsHook.getEventById(id);
  }, [eventsHook]);

  const updateEventSeries = useCallback(async (parentId: string, event: Partial<EventInput>) => {
    return eventsHook.updateEventSeries({ parentId, data: event });
  }, [eventsHook]);

  const deleteEventSeries = useCallback(async (parentId: string) => {
    return eventsHook.deleteEventSeries(parentId);
  }, [eventsHook]);

  // Announcements
  const addAnnouncement = useCallback(async (announcement: AnnouncementInput) => {
    return announcementsHook.addAnnouncement(announcement);
  }, [announcementsHook]);

  const updateAnnouncement = useCallback(async (id: string, announcement: Partial<AnnouncementInput>) => {
    return announcementsHook.updateAnnouncement({ id, data: announcement });
  }, [announcementsHook]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    return announcementsHook.deleteAnnouncement(id);
  }, [announcementsHook]);

  const getAnnouncementById = useCallback((id: string) => {
    return announcementsHook.getAnnouncementById(id);
  }, [announcementsHook]);

  const getPublishedAnnouncements = useCallback(() => {
    return announcementsHook.getPublishedAnnouncements();
  }, [announcementsHook]);

  // Tasks
  const addTask = useCallback(async (task: TaskInput) => {
    return tasksHook.addTask(task);
  }, [tasksHook]);

  const updateTask = useCallback(async (id: string, task: Partial<TaskInput & { isArchived?: boolean }>) => {
    return tasksHook.updateTask({ id, data: task });
  }, [tasksHook]);

  const deleteTask = useCallback(async (id: string) => {
    return tasksHook.deleteTask(id);
  }, [tasksHook]);

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus, newOrder: number) => {
    return tasksHook.moveTask(taskId, newStatus, newOrder);
  }, [tasksHook]);

  const getTasksByEventId = useCallback((eventId: string) => {
    return tasksHook.getTasksByEventId(eventId);
  }, [tasksHook]);

  const getTaskById = useCallback((id: string) => {
    return tasksHook.getTaskById(id);
  }, [tasksHook]);

  // Checklist operations
  const addChecklist = useCallback(async (taskId: string, title?: string) => {
    return tasksHook.addChecklist(taskId, title);
  }, [tasksHook]);

  const updateChecklistTitle = useCallback(async (taskId: string, checklistId: string, title: string) => {
    return tasksHook.updateChecklistTitle(taskId, checklistId, title);
  }, [tasksHook]);

  const deleteChecklist = useCallback(async (taskId: string, checklistId: string) => {
    return tasksHook.deleteChecklist(taskId, checklistId);
  }, [tasksHook]);

  const addChecklistItem = useCallback(async (taskId: string, checklistId: string, title: string, assigneeId?: string, dueDate?: string) => {
    return tasksHook.addChecklistItem(taskId, checklistId, title, assigneeId, dueDate);
  }, [tasksHook]);

  const toggleChecklistItem = useCallback(async (taskId: string, checklistId: string, itemId: string) => {
    return tasksHook.toggleChecklistItem(taskId, checklistId, itemId);
  }, [tasksHook]);

  const deleteChecklistItem = useCallback(async (taskId: string, checklistId: string, itemId: string) => {
    return tasksHook.deleteChecklistItem(taskId, checklistId, itemId);
  }, [tasksHook]);

  const reorderChecklistItems = useCallback(async (taskId: string, checklistId: string, itemIds: string[]) => {
    return tasksHook.reorderChecklistItems(taskId, checklistId, itemIds);
  }, [tasksHook]);

  const resetData = useCallback(() => {
    // Refetch all data
    ministriesHook.refetch();
    usersHook.refetch();
    eventsHook.refetch();
    announcementsHook.refetch();
    tasksHook.refetch();
  }, [ministriesHook, usersHook, eventsHook, announcementsHook, tasksHook]);

  const value = useMemo(() => ({
    // Events
    events: eventsHook.events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    updateEventSeries,
    deleteEventSeries,
    // Users
    users: usersHook.users,
    addUser,
    updateUser,
    deleteUser,
    // Ministries
    ministries: ministriesHook.ministries,
    addMinistry,
    updateMinistry,
    deleteMinistry,
    // Announcements
    announcements: announcementsHook.announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementById,
    getPublishedAnnouncements,
    // Tasks
    eventTasks: tasksHook.eventTasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByEventId,
    getTaskById,
    addChecklist,
    updateChecklistTitle,
    deleteChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    // Helpers
    getMinistryById,
    getUserById,
    resetData,
    isLoading,
  }), [
    eventsHook.events, addEvent, updateEvent, deleteEvent, getEventById, updateEventSeries, deleteEventSeries,
    usersHook.users, addUser, updateUser, deleteUser,
    ministriesHook.ministries, addMinistry, updateMinistry, deleteMinistry,
    announcementsHook.announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementById, getPublishedAnnouncements,
    tasksHook.eventTasks, addTask, updateTask, deleteTask, moveTask, getTasksByEventId, getTaskById,
    addChecklist, updateChecklistTitle, deleteChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, reorderChecklistItems,
    getMinistryById, getUserById, resetData, isLoading,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
 
